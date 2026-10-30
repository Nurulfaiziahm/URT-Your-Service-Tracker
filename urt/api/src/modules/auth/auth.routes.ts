import express from 'express';
import {
  register,
  login,
  googleLogin,
  getProfile,
  updateProfile,
  logout,
  logoutAll,
  refreshToken,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  verifyEmail,
  resendVerification,
  verifyToken,
  getDevices,
  revokeDevice,
  getCsrfToken,
  getAvailablePortals,
} from './auth.controller.js';
import {
  authLimiter,
  loginLimiter,
  passwordResetLimiter,
  registerLimiter,
} from '../../core/security/rate-limiter.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import { createCsrfToken, verifyCsrfToken } from '../../core/security/csrf.js';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  updateUserSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
} from './auth.schema.js';

const router = express.Router();
router.use(authLimiter);

// ===== Public routes =====

// Bootstrap CSRF before browser writes.
router.get('/csrf-token', createCsrfToken, getCsrfToken);

router.post('/register', registerLimiter, validate(registerSchema), register);
router.post(
  '/:portal(owner|customer)/register',
  registerLimiter,
  validate(registerSchema),
  register,
);
router.post(
  '/:portal(owner|customer|technician)/login',
  loginLimiter,
  validate(loginSchema),
  login,
);
router.post('/login', loginLimiter, validate(loginSchema), login);
router.post('/google', loginLimiter, validate(googleAuthSchema), googleLogin);
router.post(
  '/:portal(owner|customer|technician)/google',
  loginLimiter,
  validate(googleAuthSchema),
  googleLogin,
);

// Refresh access token (CSRF protected)
router.post('/refresh-token', verifyCsrfToken, refreshToken);

// Request password reset
router.post(
  '/:portal(owner|customer|technician)/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  '/:portal(owner|customer|technician)/verify-reset-otp',
  passwordResetLimiter,
  validate(verifyResetOtpSchema),
  verifyResetOtp,
);
router.post(
  '/:portal(owner|customer|technician)/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);

// Verify reset OTP and get reset token
router.post(
  '/verify-reset-otp',
  passwordResetLimiter,
  validate(verifyResetOtpSchema),
  verifyResetOtp,
);

// Reset password with reset token
router.post('/reset-password', passwordResetLimiter, validate(resetPasswordSchema), resetPassword);

// Verify email with OTP
router.post('/verify-email', passwordResetLimiter, verifyEmail);

// Resend email verification OTP
router.post('/resend-verification', passwordResetLimiter, resendVerification);

// ===== Protected routes (require authentication) =====

// Get current user profile
router.get('/profile', protect, getProfile);
router.get('/portals', protect, getAvailablePortals);

// Verify access token
router.get('/verify-token', protect, verifyToken);

// Get all active device sessions
router.get('/devices', protect, getDevices);

// Update user profile
router.put('/profile', protect, validate(updateUserSchema), updateProfile);

// Change password
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);

// Logout current device (refresh cookie; no access JWT required)
router.post('/logout', logout);

// Logout from all devices
router.post('/logout-all', protect, logoutAll);

// Revoke a specific device session
router.delete('/devices/:deviceId', protect, revokeDevice);

export default router;
