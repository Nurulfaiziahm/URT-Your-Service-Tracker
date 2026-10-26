import crypto from 'crypto';
import { Request } from 'express';
import { mongo } from 'mongoose';
import { User, IUser } from '../../models/User.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../utils/logger.js';
import { authSessionStore, accountSecurityStore, otpStore } from '../../lib/redis/index.js';
import { deviceService } from '../../lib/device/index.js';
import { mailService } from '../../lib/mail/index.js';
import {
  AuthResponse,
  DeviceSession,
  GoogleAuthResponse,
  TokenRefreshResult,
} from './auth.types.js';
import { AuthSessionRecord } from '../../lib/redis/auth-session.store.js';
import { DeviceInfo } from '../../lib/device/device.service.js';
import { TokenService } from './token.service.js';
import { formatUserResponse } from '../../types/common.js';
import { verifyGoogleIdToken } from './google.service.js';

/**
 * Authentication Service
 * Handles all authentication-related business logic with device tracking
 */
export class AuthService {
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  private static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private static async sendRegistrationEmails(user: IUser, otp?: string): Promise<void> {
    const name = `${user.firstName} ${user.lastName}`.trim();
    const emails = [
      mailService.sendTemplate({
        to: user.email,
        subject: 'Welcome to Our Store!',
        template: 'welcome',
        data: { title: 'Welcome!', preheader: `Welcome to our store, ${user.firstName}!`, name },
      }),
    ];
    if (otp) {
      emails.push(
        mailService.sendTemplate({
          to: user.email,
          subject: 'Verify Your Email Address',
          template: 'verify-email',
          data: {
            title: 'Verify Your Email',
            preheader: 'Please verify your email address',
            name,
            otp,
            expiresIn: '5 minutes',
          },
        }),
      );
    }
    await Promise.all(emails);
  }

  private static async startSession(user: IUser, device: DeviceInfo): Promise<AuthResponse> {
    const now = Math.floor(Date.now() / 1000);
    const { deviceId, ...metadata } = device;
    const session: AuthSessionRecord = {
      deviceId,
      sid: crypto.randomUUID(),
      authVersion: user.authVersion ?? 0,
      currentRefresh: TokenService.createGeneration('refresh', now + config.auth.sessionTTL),
      createdAt: now,
      lastRefreshAt: now,
      expiresAt: 0,
      absoluteExpiresAt: now + config.auth.sessionTTL,
      device: metadata,
    };
    TokenService.issueRefresh(user.id, session);
    await authSessionStore.write(user.id, session);
    const currentUser = await this.checkSessionUser(user.id, session);
    const latest = await authSessionStore.get(user.id, deviceId);
    if (!latest || latest.sid !== session.sid) {
      throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
    }
    return { user: formatUserResponse(currentUser, true), ...this.sessionTokens(user.id, session) };
  }

  private static sessionTokens(userId: string, session: AuthSessionRecord): TokenRefreshResult {
    return {
      accessToken: TokenService.access(userId, session),
      refreshToken: TokenService.refresh(userId, session),
      deviceId: session.deviceId,
      expiresAt: session.expiresAt,
    };
  }

  private static async checkSessionUser(
    userId: string,
    session: AuthSessionRecord,
  ): Promise<IUser> {
    const user = await User.findById(userId).select('+password');
    if (!user || (user.authVersion ?? 0) !== session.authVersion || user.status !== 'active') {
      await authSessionStore.remove(userId, session);
      if (user && user.status !== 'active') {
        this.checkAccountStatus(user);
      }
      throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
    }
    return user;
  }

  static async verifyAccessToken(token: string) {
    const claims = TokenService.verify(token, 'access');
    const session = await authSessionStore.get(claims.sub, claims.deviceId);
    if (!session || session.sid !== claims.sid) {
      throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
    }
    const user = await this.checkSessionUser(claims.sub, session);
    return {
      id: user.id as string,
      email: user.email,
      role: user.role,
      deviceId: claims.deviceId,
      sid: claims.sid,
      jti: claims.jti,
    };
  }

  /**
   * Register a new user
   */
  static async register(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      address?: string;
    },
    req: Request,
  ): Promise<AuthResponse> {
    const deviceInfo = deviceService.extractDeviceInfo(req);
    const { firstName, lastName, email, password, phone } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      ...(phone && { phone }),
    });

    // Generate and store OTP (5 minutes expiry)
    const otp = this.generateOtp();
    await otpStore.setEmailOtp(user.email, otp);

    const result = await this.startSession(user, deviceInfo);

    // Send welcome and verification emails asynchronously
    // Send emails without blocking the response
    void this.sendRegistrationEmails(user, otp).catch((error) => {
      logger.error('Failed to send registration emails:', error);
      // Don't throw error - user registration should still succeed
    });

    logger.info(`New user registered: ${user.email} from device ${deviceInfo.deviceId}`);

    return result;
  }

  static async googleLogin(idToken: string, req: Request): Promise<GoogleAuthResponse> {
    if (!config.google.clientId) {
      throw new AppError('Google authentication is disabled', 503, 'GOOGLE_AUTH_DISABLED');
    }
    const deviceInfo = deviceService.extractDeviceInfo(req);
    const profile = await verifyGoogleIdToken(idToken);
    const linkRequired = () =>
      new AppError(
        'An account with this email already exists. Please use your existing sign-in method.',
        409,
        'ACCOUNT_LINK_REQUIRED',
      );
    let user = await User.findOne({ googleId: profile.googleId });
    let isNewUser = false;

    if (!user) {
      const emailUser = await User.findOne({ email: profile.email });
      if (emailUser) {
        // The same identity may have been created between the two reads.
        if (emailUser.googleId !== profile.googleId) throw linkRequired();
        user = emailUser;
      } else {
        try {
          user = await User.create({
            ...profile,
            role: 'user',
            status: 'active',
            isEmailVerified: true,
          });
          isNewUser = true;
        } catch (error: unknown) {
          if (!(error instanceof mongo.MongoServerError)) {
            throw error;
          }
          user = await User.findOne({ googleId: profile.googleId });
          if (!user) {
            if (error.keyPattern?.email) throw linkRequired();
            throw error;
          }
        }
      }
    }

    this.checkAccountStatus(user);
    const result = await this.startSession(user, deviceInfo);

    if (isNewUser) {
      void this.sendRegistrationEmails(user).catch(() => {
        logger.error('Failed to send Google registration emails');
      });
    }
    return { ...result, isNewUser };
  }

  /**
   * Login user
   */
  static async login(
    data: { email: string; password: string },
    req: Request,
  ): Promise<AuthResponse> {
    const deviceInfo = deviceService.extractDeviceInfo(req);
    const { email, password } = data;

    // Find user with password field
    const user = await User.findByEmail(email.toLowerCase());
    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check account status
    this.checkAccountStatus(user);

    // Check if account is locked (in Redis)
    const lockStatus = await accountSecurityStore.isAccountLocked(user._id.toString());

    if (lockStatus.locked) {
      const lockTimeRemaining = Math.ceil(
        (lockStatus.lockedUntil!.getTime() - Date.now()) / (60 * 1000),
      );

      throw new AppError(
        `Account is temporarily locked. Please try again in ${lockTimeRemaining} minute(s).`,
        429,
      );
    }

    // Validate password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const attempts = await accountSecurityStore.incrementLoginAttempts(user._id.toString());
      const remainingAttempts = Math.max(0, this.MAX_LOGIN_ATTEMPTS - attempts);

      if (remainingAttempts === 0) {
        await accountSecurityStore.lockAccount(user._id.toString(), 30);
        throw new AppError(
          'Account locked due to multiple failed login attempts. Please try again in 30 minutes.',
          429,
        );
      }

      throw new AppError(
        `Invalid email or password. ${remainingAttempts} attempt(s) remaining.`,
        401,
      );
    }

    // Reset login attempts after successful login
    await accountSecurityStore.resetLoginAttempts(user._id.toString());

    return this.startSession(user, deviceInfo);
  }

  /**
   * Rotate once, or return the exact successor for an immediately previous token.
   */
  static async refreshToken(token: string): Promise<TokenRefreshResult> {
    const claims = TokenService.verify(token, 'refresh');
    const hash = TokenService.hash(token);
    for (let attempt = 0; attempt < 8; attempt++) {
      const session = await authSessionStore.get(claims.sub, claims.deviceId);
      if (!session || session.sid !== claims.sid) {
        throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
      }
      await this.checkSessionUser(claims.sub, session);
      const now = Math.floor(Date.now() / 1000);
      if (hash === session.currentRefresh.hash) {
        const next: AuthSessionRecord = {
          ...session,
          lastRefreshAt: now,
          previousRefresh: { hash, validUntil: now + config.auth.grace },
        };
        TokenService.issueRefresh(claims.sub, next);
        if (!(await authSessionStore.write(claims.sub, next, session))) {
          continue;
        }
      } else if (
        hash !== session.previousRefresh?.hash ||
        session.previousRefresh.validUntil <= now
      ) {
        // Compare the generation too, so a concurrent successful rotation is re-evaluated.
        if (!(await authSessionStore.remove(claims.sub, session))) {
          continue;
        }
        throw new AppError('Refresh token has been reused', 403, 'REFRESH_TOKEN_REUSED');
      }
      // Final live-session check narrows delayed-response races. It cannot order HTTP responses.
      const latest = await authSessionStore.get(claims.sub, claims.deviceId);
      if (!latest || latest.sid !== claims.sid) {
        throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
      }
      await this.checkSessionUser(claims.sub, latest);
      return this.sessionTokens(claims.sub, latest);
    }
    throw new AppError('Authentication busy, please retry', 503, 'AUTH_UNAVAILABLE');
  }

  static async logout(token?: string): Promise<void> {
    if (!token) {
      return;
    }
    let claims;
    try {
      claims = TokenService.verify(token, 'refresh');
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        return;
      }
      throw error;
    }
    const hash = TokenService.hash(token);
    for (let attempt = 0; attempt < 8; attempt++) {
      const session = await authSessionStore.get(claims.sub, claims.deviceId);
      if (!session || session.sid !== claims.sid) {
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      if (
        hash !== session.currentRefresh.hash &&
        !(hash === session.previousRefresh?.hash && session.previousRefresh.validUntil > now)
      ) {
        return;
      }
      if (await authSessionStore.remove(claims.sub, session)) {
        return;
      }
    }
    throw new AppError('Authentication busy, please retry', 503, 'AUTH_UNAVAILABLE');
  }

  static async logoutAll(userId: string): Promise<number> {
    return authSessionStore.revokeAll(userId);
  }

  static async revokeDevice(userId: string, deviceId: string): Promise<void> {
    const session = await authSessionStore.get(userId, deviceId);
    if (session) {
      await authSessionStore.revoke(userId, deviceId, session.sid);
    }
  }

  static async getDevices(
    userId: string,
    currentDeviceId: string,
    sid: string,
  ): Promise<DeviceSession[]> {
    const devices = await authSessionStore.list(userId);
    return devices.map((session) => ({
      deviceId: session.deviceId,
      deviceName: session.device.name,
      browser: session.device.browser,
      os: session.device.os,
      ip: session.device.ip,
      lastSeen: new Date(session.lastRefreshAt * 1000),
      isCurrent: session.deviceId === currentDeviceId && session.sid === sid,
    }));
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string; phone?: string | null; address?: string | null },
  ): Promise<IUser> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if new email is already in use
    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
      user.email = data.email.toLowerCase();
      user.isEmailVerified = false;
    }

    if (data.firstName) {
      user.firstName = data.firstName;
    }

    if (data.lastName) {
      user.lastName = data.lastName;
    }

    // phone: null clears the field; undefined means not supplied
    if (data.phone !== undefined) {
      user.phone = data.phone ?? undefined;
    }

    // address: null clears the field; undefined means not supplied
    if (data.address !== undefined) {
      user.address = data.address ?? undefined;
    }

    await user.save();
    return user;
  }

  /**
   * Change password (logs out all other devices)
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentDeviceId: string,
    sid: string,
  ): Promise<AuthResponse> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    if (!user.password) {
      throw new AppError(
        'This account uses Google sign-in and has no password.',
        400,
        'PASSWORD_NOT_SET',
      );
    }
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    const session = await authSessionStore.get(userId, currentDeviceId);
    if (!session || session.sid !== sid || session.authVersion !== (user.authVersion ?? 0)) {
      throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
    }
    user.password = newPassword;
    await user.save(); // The model advances authVersion with every password change.

    // Keep only this exact session. Never overwrite a replacement login or resurrect logout.
    for (let attempt = 0; attempt < 8; attempt++) {
      const current = await authSessionStore.get(userId, currentDeviceId);
      if (!current || current.sid !== sid) {
        break;
      }
      const next = {
        ...current,
        authVersion: user.authVersion,
        lastRefreshAt: Math.floor(Date.now() / 1000),
      };
      delete next.previousRefresh;
      TokenService.issueRefresh(userId, next);
      if (await authSessionStore.write(userId, next, current, true)) {
        await this.checkSessionUser(userId, next);
        return { user: formatUserResponse(user, true), ...this.sessionTokens(userId, next) };
      }
    }
    throw new AppError('Session has been revoked. Please login again.', 401, 'SESSION_REVOKED');
  }

  /**
   * Request password reset - sends OTP via email
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return; // Don't reveal user existence
    }

    // Check if OTP was recently sent (rate limiting)
    const ttl = await otpStore.getResetOtpTTL(user.email);
    if (ttl > 240) {
      // If TTL > 4 minutes (sent less than 1 minute ago)
      const waitTime = Math.ceil((ttl - 240) / 60);
      throw new AppError(`Please wait ${waitTime} minute(s) before requesting another code`, 429);
    }

    // Generate and store OTP
    const otp = this.generateOtp();
    await otpStore.setResetOtp(user.email, otp);

    // Send reset email
    mailService
      .sendTemplate({
        to: user.email,
        subject: 'Reset Your Password',
        template: 'reset-password',
        data: {
          title: 'Reset Your Password',
          preheader: 'Password reset code',
          name: `${user.firstName} ${user.lastName}`,
          otp,
          expiresIn: '5 minutes',
        },
      })
      .catch((error) => {
        logger.error('Failed to send password reset email:', error);
        // Don't throw error - OTP is still valid
      });

    logger.info(`Password reset OTP sent to: ${user.email}`);

    return;
  }

  /**
   * Verify reset OTP and return reset token
   */
  static async verifyResetOtp(email: string, otp: string): Promise<string> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (!user.password) {
      throw new AppError('Invalid or expired reset code', 400);
    }

    // Verify OTP from Redis
    const storedOtp = await otpStore.getResetOtp(user.email);
    if (!storedOtp) {
      throw new AppError('OTP has expired or does not exist', 400);
    }

    if (storedOtp !== otp) {
      throw new AppError('Invalid OTP', 400);
    }

    // Generate reset token
    const resetToken = this.generateResetToken();
    await accountSecurityStore.storeResetToken(user.email, resetToken);

    // Delete OTP from Redis
    await otpStore.deleteResetOtp(user.email);

    logger.info(`Reset OTP verified for: ${user.email}`);

    return resetToken;
  }

  /**
   * Reset password with reset token (logs out all devices)
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    // Verify reset token and get email
    const email = await accountSecurityStore.getEmailByResetToken(resetToken);
    if (!email) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.password) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete reset token from Redis
    await accountSecurityStore.deleteResetToken(resetToken);

    // Logout from all devices
    await authSessionStore.revokeAll(user._id.toString());

    logger.info(`Password reset completed for: ${user.email}`);
  }

  /**
   * Verify email with OTP
   */
  static async verifyEmail(email: string, otp: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Verify OTP from Redis
    const storedOtp = await otpStore.getEmailOtp(user.email);
    if (!storedOtp) {
      throw new AppError('OTP has expired or does not exist', 400);
    }

    if (storedOtp !== otp) {
      throw new AppError('Invalid OTP', 400);
    }

    // Mark email as verified
    user.isEmailVerified = true;
    await user.save();

    // Delete OTP from Redis
    await otpStore.deleteEmailOtp(user.email);

    logger.info(`Email verified for: ${user.email}`);
  }

  /**
   * Resend verification email with new OTP
   */
  static async resendVerificationEmail(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('No account found with that email', 404);
    }

    if (user.isEmailVerified) {
      throw new AppError('Email is already verified', 400);
    }

    // Check if OTP was recently sent (rate limiting)
    const ttl = await otpStore.getEmailOtpTTL(user.email);
    if (ttl > 240) {
      // If TTL > 4 minutes (sent less than 1 minute ago)
      const waitTime = Math.ceil((ttl - 240) / 60);
      throw new AppError(`Please wait ${waitTime} minute(s) before requesting another code`, 429);
    }

    // Generate and store new OTP
    const otp = this.generateOtp();
    await otpStore.setEmailOtp(user.email, otp);

    // Send verification email
    await mailService.sendTemplate({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'verify-email',
      data: {
        title: 'Verify Your Email',
        preheader: 'Please verify your email address',
        name: `${user.firstName} ${user.lastName}`,
        otp,
        expiresIn: '5 minutes',
      },
    });

    logger.info(`Verification OTP resent to: ${user.email}`);
  }

  /**
   * Check account status
   */
  private static checkAccountStatus(user: IUser): void {
    if (user.status === 'inactive') {
      throw new AppError(
        'Your account is inactive. Please contact support.',
        403,
        'ACCOUNT_DISABLED',
      );
    }

    if (user.status === 'suspended') {
      throw new AppError(
        'Your account has been suspended. Please contact support.',
        403,
        'ACCOUNT_DISABLED',
      );
    }
  }
}
