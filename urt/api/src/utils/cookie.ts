import { Response } from 'express';
import { config } from '../core/config/index.js';

export const CookieHelper = {
  clearLegacyCookies(res: Response): void {
    const options = {
      ...config.cookies.options,
      sameSite: config.nodeEnv === 'production' ? ('strict' as const) : ('lax' as const),
    };
    res.clearCookie('refreshToken', options);
    res.clearCookie('sid', options);
  },
  setRefreshToken(res: Response, token: string, expiresAt: number): void {
    res.cookie(config.cookies.refreshName, token, {
      ...config.cookies.options,
      maxAge: Math.max(0, expiresAt * 1000 - Date.now()),
    });
  },
  clearRefreshToken(res: Response): void {
    res.clearCookie(config.cookies.refreshName, config.cookies.options);
  },
  clearSession(res: Response): void {
    res.clearCookie(config.cookies.sessionName, config.cookies.options);
  },
};
