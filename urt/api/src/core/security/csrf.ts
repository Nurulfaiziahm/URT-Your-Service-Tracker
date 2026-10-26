import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '../../middleware/error-handler.js';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('hex');

export const saveCsrfToken = async (req: Request, regenerate = false): Promise<string> => {
  if (regenerate) {
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
  }
  req.session.csrfToken ||= generateCsrfToken();
  await new Promise<void>((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve())),
  );
  return req.session.csrfToken;
};

export const createCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store');
  saveCsrfToken(req)
    .then(() => next())
    .catch(() => next(new AppError('Authentication unavailable', 503, 'AUTH_UNAVAILABLE')));
};

export const verifyCsrfToken = (req: Request, _res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const header = req.headers['x-csrf-token'];
  const count = req.rawHeaders.filter(
    (value, index) => index % 2 === 0 && value.toLowerCase() === 'x-csrf-token',
  ).length;
  if (!header || !req.session?.csrfToken) {
    return next(new AppError('CSRF token is missing', 403, 'CSRF_MISSING'));
  }
  if (
    count !== 1 ||
    typeof header !== 'string' ||
    !/^[a-f0-9]{64}$/.test(header) ||
    !/^[a-f0-9]{64}$/.test(req.session.csrfToken) ||
    !crypto.timingSafeEqual(Buffer.from(header, 'hex'), Buffer.from(req.session.csrfToken, 'hex'))
  ) {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_INVALID'));
  }
  next();
};
