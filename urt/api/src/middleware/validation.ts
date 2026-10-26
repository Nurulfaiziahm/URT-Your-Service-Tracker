import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validation Middleware
 * Validates request body, query, and params against a Zod schema
 */
export const validate = (schema: ZodSchema): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors,
        });
        return;
      }
      next(error);
    }
  };
};
