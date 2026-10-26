import { BusinessContext } from '../modules/business/business.access.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        deviceId: string;
        jti: string;
        sid: string;
      };
      businessContext?: BusinessContext;
    }
  }
}

export {};
