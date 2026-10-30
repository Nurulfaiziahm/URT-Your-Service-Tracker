import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import corsConfig from './core/config/cors.js';
import sessionMiddleware from './core/config/session.js';
import { config } from './core/config/index.js';
import { verifyCsrfToken } from './core/security/csrf.js';
import mongoose from 'mongoose';
import { apiLimiter } from './core/security/rate-limiter.js';

import { authRoutes } from './modules/auth/index.js';
import { userRoutes } from './modules/user/index.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import {
  businessRoutes,
  meBusinessesRouter,
  publicBusinessRouter,
} from './modules/business/index.js';
import { customerInvitationRouter } from './modules/customer/index.js';
import { technicianInvitationRouter } from './modules/technician/index.js';
import { publicTrackingRouter } from './modules/ticket/index.js';
import { packageRouter } from './modules/subscription/subscription.routes.js';
import { publicApprovalRouter } from './modules/ticket/approval-access.routes.js';

const app: Application = express();

/**
 * Trust proxy for secure cookies behind reverse proxy
 */
app.set('trust proxy', config.trustProxy);

/**
 * Middleware Setup
 */
app.use(morgan('dev'));
app.use(helmet()); // Security headers
app.use('/api/v1/auth', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(corsConfig); // CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use('/api/v1', apiLimiter);
app.use(sessionMiddleware);
app.use('/api/v1', verifyCsrfToken);

/**
 * API Routes
 */
const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Module routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/uploads', uploadRoutes);
apiRouter.use('/packages', packageRouter);

// URT domain routes
apiRouter.use('/me/businesses', meBusinessesRouter);
apiRouter.use('/businesses', businessRoutes);
apiRouter.use('/public/businesses', publicBusinessRouter);
apiRouter.use('/public/tracking', publicTrackingRouter);
apiRouter.use('/public/service-approvals', publicApprovalRouter);
apiRouter.use('/customer-invitations', customerInvitationRouter);
apiRouter.use('/technician-invitations', technicianInvitationRouter);

// Mount API router
app.use('/api/v1', apiRouter);

/**
 * Error Handling
 */
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
