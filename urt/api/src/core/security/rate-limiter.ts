import rateLimit from 'express-rate-limit';

export const serviceRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Terlalu banyak pengajuan. Coba lagi nanti.',
  },
});

/**
 * General API Rate Limiter
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  // Public tracking and approval routes have their own stricter limiter below.
  // Excluding them here prevents status polling from consuming the general API quota.
  skip: (req) =>
    req.originalUrl.startsWith('/api/v1/public/tracking') ||
    req.originalUrl.startsWith('/api/v1/public/service-approvals'),
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth Routes Rate Limiter (stricter)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 auth requests per window
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Login Rate Limiter (very strict)
 */
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many failed login attempts. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 registration attempts per hour
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Password Reset Rate Limiter
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 requests per hour
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many password reset requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public Tracking Rate Limiter (stricter on lookups)
 */
export const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 failed requests per 15 minutes per IP
  message: {
    success: false,
    code: 'RATE_LIMITED',
    error: 'Too many tracking requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
