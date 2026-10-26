import express from 'express';
import {
  createBusiness,
  getMyBusinesses,
  getBusinessById,
  updateBusiness,
  getPublicBusiness,
} from './business.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from './business.access.js';
import {
  createBusinessSchema,
  updateBusinessSchema,
} from './business.schema.js';
import serviceRoutes from '../service/service.routes.js';
import { customerRouter } from '../customer/customer.routes.js';
import { technicianRouter } from '../technician/technician.routes.js';
import ticketRoutes from '../ticket/ticket.routes.js';
import { dashboardRouter, reportRouter } from '../report/index.js';
import invoiceRoutes from '../invoice/invoice.routes.js';
import { subscriptionRouter } from '../subscription/subscription.routes.js';
import { requireActiveSubscription } from '../subscription/subscription.access.js';
import { asyncHandler } from '../../middleware/async-handler.js';

// Business router: /businesses
export const businessRouter = express.Router();

businessRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Nested sub-routers under /businesses/:businessId/...
businessRouter.use('/:businessId/subscription', subscriptionRouter);

// Paid operational writes; reads and billing remain available after expiry.
// Technician services check subscription access and available seats before writes,
// including invitation acceptance outside this router. Deactivation stays usable.
businessRouter.use(
  ['/:businessId/services', '/:businessId/customers', '/:businessId/tickets', '/:businessId/invoices'],
  (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    protect(req, res, next);
  },
  asyncHandler(async (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      await requireActiveSubscription(req.params.businessId);
    }
    next();
  }),
);
businessRouter.use('/:businessId/services', serviceRoutes);
businessRouter.use('/:businessId/customers', customerRouter);
businessRouter.use('/:businessId/technicians', technicianRouter);
businessRouter.use('/:businessId/tickets', ticketRoutes);
businessRouter.use('/:businessId/dashboard', dashboardRouter);
businessRouter.use('/:businessId/reports', reportRouter);
businessRouter.use('/:businessId/invoices', invoiceRoutes);

// Owner onboarding: create new business
businessRouter.post('/', protect, validate(createBusinessSchema), createBusiness);

// Scoped business settings / view
businessRouter.get(
  '/:businessId',
  protect,
  attachBusinessContext,
  requireBusinessAccess('owner', 'technician', 'customer'),
  getBusinessById,
);

businessRouter.put(
  '/:businessId',
  protect,
  requireBusinessAccess('owner'),
  validate(updateBusinessSchema),
  updateBusiness,
);

// /me/businesses router
export const meBusinessesRouter = express.Router();

meBusinessesRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

meBusinessesRouter.get('/', protect, getMyBusinesses);

// Public business router: /public/businesses
export const publicBusinessRouter = express.Router();

publicBusinessRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

publicBusinessRouter.get('/:slug', getPublicBusiness);

export default businessRouter;
