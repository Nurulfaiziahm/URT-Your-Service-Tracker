import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  recordPayment,
  voidInvoice,
} from './invoice.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import {
  recordPaymentSchema,
  voidInvoiceSchema,
  invoiceQuerySchema,
} from './invoice.schema.js';

// Business-scoped invoices router: /businesses/:businessId/invoices
const router = express.Router({ mergeParams: true });

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.use(protect);
router.use(attachBusinessContext);

// List invoices (Owner, Customer)
router.get(
  '/',
  requireBusinessAccess('owner', 'customer'),
  validate(invoiceQuerySchema),
  getInvoices,
);

// Get single invoice detail (Owner, Customer)
router.get(
  '/:invoiceId',
  requireBusinessAccess('owner', 'customer'),
  getInvoiceById,
);

// Record confirmed receipt payment (Owner only)
router.post(
  '/:invoiceId/payments',
  requireBusinessAccess('owner'),
  validate(recordPaymentSchema),
  recordPayment,
);

// Void unpaid invoice with reason (Owner only)
router.post(
  '/:invoiceId/void',
  requireBusinessAccess('owner'),
  validate(voidInvoiceSchema),
  voidInvoice,
);

export default router;
