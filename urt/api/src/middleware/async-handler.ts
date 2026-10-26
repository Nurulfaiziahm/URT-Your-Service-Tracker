import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Async Handler Wrapper
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handler middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
