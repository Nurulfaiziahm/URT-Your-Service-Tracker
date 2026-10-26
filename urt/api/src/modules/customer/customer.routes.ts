import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  sendCustomerInvitation,
  acceptCustomerInvitation,
} from './customer.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
  acceptCustomerInvitationSchema,
} from './customer.schema.js';

// Business-scoped customer router: /businesses/:businessId/customers
export const customerRouter = express.Router({ mergeParams: true });

customerRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

customerRouter.use(protect);

// Owner-only directory operations
customerRouter.post(
  '/',
  requireBusinessAccess('owner'),
  validate(createCustomerSchema),
  createCustomer,
);

customerRouter.get(
  '/',
  requireBusinessAccess('owner'),
  validate(customerQuerySchema),
  getCustomers,
);

// Detail: Owner or the linked Customer themselves
customerRouter.get(
  '/:customerId',
  attachBusinessContext,
  getCustomerById,
);

// Owner updates customer contact
customerRouter.put(
  '/:customerId',
  requireBusinessAccess('owner'),
  validate(updateCustomerSchema),
  updateCustomer,
);

// Owner sends/resends claim invitation
customerRouter.post(
  '/:customerId/invitation',
  requireBusinessAccess('owner'),
  sendCustomerInvitation,
);

// Separate router for public/global invitation acceptance: /customer-invitations
export const customerInvitationRouter = express.Router();

customerInvitationRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

customerInvitationRouter.post(
  '/accept',
  protect,
  validate(acceptCustomerInvitationSchema),
  acceptCustomerInvitation,
);

export default customerRouter;
