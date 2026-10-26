import express from 'express';
import { getDashboard, getReportOverview } from './report.controller.js';
import { protect } from '../../middleware/auth.guard.js';
import { validate } from '../../middleware/validation.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import { reportOverviewQuerySchema } from './report.schema.js';

// Dashboard router: /businesses/:businessId/dashboard
export const dashboardRouter = express.Router({ mergeParams: true });

dashboardRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

dashboardRouter.use(protect);
dashboardRouter.use(attachBusinessContext);

dashboardRouter.get(
  '/',
  requireBusinessAccess('owner', 'technician', 'customer'),
  getDashboard,
);

// Reports router: /businesses/:businessId/reports
export const reportRouter = express.Router({ mergeParams: true });

reportRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

reportRouter.use(protect);
reportRouter.use(attachBusinessContext);

reportRouter.get(
  '/overview',
  requireBusinessAccess('owner'),
  validate(reportOverviewQuerySchema),
  getReportOverview,
);

export default reportRouter;
