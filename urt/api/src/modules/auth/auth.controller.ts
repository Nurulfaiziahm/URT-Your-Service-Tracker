import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { AppError } from '../../middleware/error-handler.js';
import { ResponseHandler, CookieHelper } from '../../utils/index.js';
import { AuthService } from './auth.service.js';
import { saveCsrfToken } from '../../core/security/csrf.js';
import { config } from '../../core/config/index.js';
import { getAuthPortals, type AuthPortal } from './portal-access.js';
import { formatUserResponse } from '../../types/common.js';

import {
  RegisterInput,
  LoginInput,
  GoogleAuthInput,
  ChangePasswordInput,
  ResetPasswordInput,
  UpdateUserInput,
} from './auth.schema.js';

const destroyCsrfSession = async (req: Request, res: Response): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((err) => (err ? reject(err) : resolve())),
  );
  CookieHelper.clearSession(res);
};

/**
 * @route   GET /api/v1/auth/csrf-token
 * @desc    Get the reusable CSRF token for browser writes
 * @access  Public
 */
export const getCsrfToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.session.csrfToken;

  if (!token) {
    throw new AppError('Failed to generate CSRF token', 500);
  }

  ResponseHandler.success(res, { csrfToken: token }, 'CSRF token generated');
});

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const result = await AuthService.register(
    input,
    req,
    req.params.portal === 'owner' ? 'owner' : 'customer',
  );

  const csrfToken = await saveCsrfToken(req, true);
  CookieHelper.clearLegacyCookies(res);
  CookieHelper.setRefreshToken(res, result.refreshToken, result.expiresAt);

  ResponseHandler.created(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      deviceId: result.deviceId,
      csrfToken,
    },
    'User registered successfully',
  );
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const portal = req.params.portal as AuthPortal | undefined;
  const result = await AuthService.login(input, req, portal);

  const csrfToken = await saveCsrfToken(req, true);
  CookieHelper.clearLegacyCookies(res);
  CookieHelper.setRefreshToken(res, result.refreshToken, result.expiresAt);

  ResponseHandler.success(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
      deviceId: result.deviceId,
      csrfToken,
    },
    'Login successful',
  );
});

export const getAvailablePortals = asyncHandler(async (req, res) => {
  const user = await AuthService.getProfile(getAuthUser(req).id);
  ResponseHandler.success(res, { portals: await getAuthPortals(user) });
});

/**
 * @route   POST /api/v1/auth/google
 * @desc    Sign up or log in with a Google ID token
 * @access  Public (CSRF protected)
 */
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body as GoogleAuthInput;
  const result = await AuthService.googleLogin(
    idToken,
    req,
    (req.params.portal as AuthPortal | undefined) || 'customer',
  );

  const csrfToken = await saveCsrfToken(req, true);
  CookieHelper.clearLegacyCookies(res);
  CookieHelper.setRefreshToken(res, result.refreshToken, result.expiresAt);

  const data = {
    user: result.user,
    accessToken: result.accessToken,
    deviceId: result.deviceId,
    csrfToken,
    isNewUser: result.isNewUser,
  };
  if (result.isNewUser) {
    ResponseHandler.created(res, data, 'Google authentication successful');
  } else {
    ResponseHandler.success(res, data, 'Google authentication successful');
  }
});

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (with valid refresh token)
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[config.cookies.refreshName];

  if (!token) {
    throw new AppError('Refresh token is required', 401, 'INVALID_TOKEN');
  }

  const result = await AuthService.refreshToken(token);

  CookieHelper.setRefreshToken(res, result.refreshToken, result.expiresAt);

  ResponseHandler.success(
    res,
    { accessToken: result.accessToken, deviceId: result.deviceId },
    'Token refreshed',
  );
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user from current device
 * @access  Private
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logout(req.cookies?.[config.cookies.refreshName]);
  await destroyCsrfSession(req, res);
  CookieHelper.clearRefreshToken(res);
  CookieHelper.clearLegacyCookies(res);

  ResponseHandler.success(res, null, 'Logged out successfully');
});

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);

  const count = await AuthService.logoutAll(userId);
  await destroyCsrfSession(req, res);
  CookieHelper.clearRefreshToken(res);
  CookieHelper.clearLegacyCookies(res);

  ResponseHandler.success(res, { devicesLoggedOut: count }, 'Logged out from all devices');
});

/**
 * @route   GET /api/v1/auth/devices
 * @desc    Get all active device sessions
 * @access  Private
 */
export const getDevices = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const devices = await AuthService.getDevices(user.id, user.deviceId, user.sid);

  ResponseHandler.success(res, { devices }, 'Devices retrieved');
});

/**
 * @route   DELETE /api/v1/auth/devices/:deviceId
 * @desc    Revoke a specific device session
 * @access  Private
 */
export const revokeDevice = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new AppError('Device ID is required', 400);
  }

  if (deviceId === user.deviceId) {
    throw new AppError('Cannot revoke current device. Use logout instead.', 400);
  }

  await AuthService.revokeDevice(user.id, deviceId);

  ResponseHandler.success(res, null, 'Device session revoked');
});

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const user = await AuthService.getProfile(userId);

  ResponseHandler.success(res, { user: formatUserResponse(user, true) }, 'Profile fetched');
});

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id: userId } = getAuthUser(req);
  const input = req.body as UpdateUserInput;
  const user = await AuthService.updateProfile(userId, input);

  ResponseHandler.success(res, { user: formatUserResponse(user, true) }, 'Profile updated');
});

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password (logs out other devices)
 * @access  Private
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const { currentPassword, newPassword } = req.body as ChangePasswordInput;
  const result = await AuthService.changePassword(
    user.id,
    currentPassword,
    newPassword,
    user.deviceId,
    user.sid,
  );
  const csrfToken = await saveCsrfToken(req, true);
  CookieHelper.clearLegacyCookies(res);
  CookieHelper.setRefreshToken(res, result.refreshToken, result.expiresAt);
  ResponseHandler.success(
    res,
    { user: result.user, accessToken: result.accessToken, deviceId: result.deviceId, csrfToken },
    'Password changed. All other devices logged out.',
  );
});

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset OTP
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  await AuthService.forgotPassword(
    email,
    (req.params.portal as AuthPortal | undefined) || 'customer',
  );

  ResponseHandler.success(
    res,
    null,
    'Jika email ini terdaftar pada portal yang dipilih, Anda akan menerima kode pemulihan atau tautan aktivasi akun melalui email.',
  );
});

/**
 * @route   POST /api/v1/auth/verify-reset-otp
 * @desc    Verify reset OTP and get reset token
 * @access  Public
 */
export const verifyResetOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  const resetToken = await AuthService.verifyResetOtp(
    email,
    otp,
    (req.params.portal as AuthPortal | undefined) || 'customer',
  );

  ResponseHandler.success(res, { resetToken }, 'OTP verified successfully');
});

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with reset token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, password } = req.body as ResetPasswordInput;

  if (!resetToken || !password) {
    throw new AppError('Reset token and password are required', 400);
  }

  await AuthService.resetPassword(
    resetToken,
    password,
    (req.params.portal as AuthPortal | undefined) || 'customer',
  );

  ResponseHandler.success(
    res,
    null,
    'Password reset successfully. Please login with your new password.',
  );
});

/**
 * @route   POST /api/v1/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new AppError('Email and OTP are required', 400);
  }

  await AuthService.verifyEmail(email, otp);

  ResponseHandler.success(res, null, 'Email verified successfully!');
});

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend verification OTP
 * @access  Public
 */
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new AppError('Email is required', 400);
  }

  await AuthService.resendVerificationEmail(email);

  ResponseHandler.success(res, null, 'Verification OTP sent to your email');
});

/**
 * @route   GET /api/v1/auth/verify-token
 * @desc    Verify if the current access token is valid
 * @access  Private
 */
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  ResponseHandler.success(res, { valid: true, user }, 'Token is valid');
});
