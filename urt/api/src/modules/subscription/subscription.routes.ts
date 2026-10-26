import { Router } from 'express';
import { protect } from '../../middleware/auth.guard.js';
import { validate } from '../../middleware/validation.js';
import { requireBusinessAccess } from '../business/business.access.js';
import {
  checkout,
  getPackages,
  getPayments,
  getSubscription,
  getPayment,
  confirmDemoPayment,
} from './subscription.controller.js';
import {
  checkoutSchema,
  paymentsSchema,
} from './subscription.schema.js';

export const packageRouter = Router();
packageRouter.get('/', getPackages);

export const subscriptionRouter = Router({ mergeParams: true });
subscriptionRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
subscriptionRouter.use(protect, requireBusinessAccess('owner'));
subscriptionRouter.get('/', getSubscription);
subscriptionRouter.post('/checkout', validate(checkoutSchema), checkout);
subscriptionRouter.get('/payments', validate(paymentsSchema), getPayments);
subscriptionRouter.get('/payments/:paymentId', getPayment);
subscriptionRouter.post('/payments/:paymentId/confirm-demo', confirmDemoPayment);
