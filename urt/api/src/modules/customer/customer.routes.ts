import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  deleteCustomer,
  sendCustomerInvitation,
  acceptCustomerInvitation,
} from './customer.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import { AppError } from '../../middleware/error-handler.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import {
  createCustomerSchema,
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

// The owner directory is read-only; unlinked fictitious contacts may be removed.
customerRouter.put(
  '/:customerId',
  requireBusinessAccess('owner'),
  () => { throw new AppError('Data pelanggan hanya dapat dilihat pada portal pemilik.', 403, 'CUSTOMER_READ_ONLY'); },
);
customerRouter.delete('/:customerId', requireBusinessAccess('owner'), deleteCustomer);

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
