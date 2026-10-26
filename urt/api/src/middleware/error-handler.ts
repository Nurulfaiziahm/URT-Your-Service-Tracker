import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import redisClient from '../lib/redis/client.js';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  publicCode: string;

  constructor(message: string, statusCode: number = 500, code = 'REQUEST_FAILED') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.publicCode = code === 'REQUEST_FAILED' && statusCode === 429 ? 'RATE_LIMITED' : code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not Found Handler (404)
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (
  err: Error & {
    statusCode?: number;
    code?: number;
    isOperational?: boolean;
    publicCode?: string;
    errors?: Record<string, { message: string }>;
  },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  let code = err.publicCode || 'REQUEST_FAILED';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // Zod validation error
  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
    code = 'ACCESS_TOKEN_EXPIRED';
  }

  if (
    redisClient.status !== 'ready' ||
    err.name === 'ReplyError' ||
    /Command timed out|Connection is closed|Stream isn't writeable/.test(err.message)
  ) {
    statusCode = 503;
    message = 'Authentication unavailable';
    code = 'AUTH_UNAVAILABLE';
  }
  if (err.name === 'VersionError') {
    statusCode = 409;
    message = 'Account changed. Please retry.';
    code = 'ACCOUNT_CHANGED';
  }
  if (statusCode >= 500) {
    console.error('Request failed', { statusCode, code });
    if (statusCode !== 503) message = 'Internal Server Error';
  }
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
};
