import { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';
import { asyncHandler } from './async-handler.js';
import { AuthService } from '../modules/auth/auth.service.js';

/**
 * Helper to get authenticated user (throws if not authenticated)
 */
export const getAuthUser = (req: Request): NonNullable<Request['user']> => {
  if (!req.user?.id) {
    throw new AppError('User not authenticated', 401);
  }
  return req.user as NonNullable<Request['user']>;
};

/**
 * Helper to get device ID from token (throws if not present)
 */
export const getDeviceId = (req: Request): string => {
  const user = getAuthUser(req);
  if (!user.deviceId) {
    throw new AppError('Device ID not found in token', 400);
  }
  return user.deviceId;
};

/**
 * Authentication Guard Middleware
 * Verifies JWT token and attaches user info to request
 */
export const protect = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized to access this route', 401, 'INVALID_TOKEN');
  }

  req.user = await AuthService.verifyAccessToken(token);
  next();
});

/**
 * Role-based Authorization Middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(
        `User role '${req.user.role}' is not authorized to access this route`,
        403,
      );
    }

    next();
  };
};
