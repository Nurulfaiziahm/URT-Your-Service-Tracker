import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  updateIntake,
  assignTechnician,
  saveDiagnosis,
  saveEstimateDraft,
  submitEstimate,
  respondToEstimate,
  transitionTicket,
  handoverTicket,
  getTimeline,
  issueTrackingAccess,
  getPublicTracking,
  addAttachment,
  detachAttachment,
  getAttachmentDownload,
} from './ticket.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import { trackingLimiter } from '../../core/security/rate-limiter.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import { issueInvoice } from '../invoice/invoice.controller.js';
import { issueInvoiceSchema } from '../invoice/invoice.schema.js';
import {
  createTicketSchema,
  updateIntakeSchema,
  assignTechnicianSchema,
  diagnosisSchema,
  estimateDraftSchema,
  submitEstimateSchema,
  approvalSchema,
  ticketTransitionSchema,
  handoverSchema,
  ticketQuerySchema,
  issueTrackingAccessSchema,
  publicTrackingSchema,
  addAttachmentSchema,
  detachAttachmentSchema,
} from './ticket.schema.js';

// Business-scoped ticket router: /businesses/:businessId/tickets
const router = express.Router({ mergeParams: true });

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.use(protect);

// Ticket Intake (Customer self-submission or Owner walk-in)
router.post(
  '/',
  attachBusinessContext,
  validate(createTicketSchema),
  createTicket,
);

// Scoped Ticket List
router.get(
  '/',
  requireBusinessAccess('owner', 'technician', 'customer'),
  validate(ticketQuerySchema),
  getTickets,
);

// Detail view
router.get(
  '/:ticketId',
  requireBusinessAccess('owner', 'technician', 'customer'),
  getTicketById,
);

// Owner intake corrections
router.put(
  '/:ticketId/intake',
  requireBusinessAccess('owner'),
  validate(updateIntakeSchema),
  updateIntake,
);

// Owner assignment / reassignment
router.put(
  '/:ticketId/assignment',
  requireBusinessAccess('owner'),
  validate(assignTechnicianSchema),
  assignTechnician,
);

// Technician diagnosis
router.put(
  '/:ticketId/diagnosis',
  requireBusinessAccess('technician'),
  validate(diagnosisSchema),
  saveDiagnosis,
);

// Technician estimate draft
router.put(
  '/:ticketId/estimate-draft',
  requireBusinessAccess('technician'),
  validate(estimateDraftSchema),
  saveEstimateDraft,
);

// Technician submits estimate for customer approval
router.post(
  '/:ticketId/estimates',
  requireBusinessAccess('technician'),
  validate(submitEstimateSchema),
  submitEstimate,
);

// Customer estimate decision (approval or rejection)
router.post(
  '/:ticketId/approval',
  requireBusinessAccess('customer'),
  validate(approvalSchema),
  respondToEstimate,
);

// Ticket transitions (Repair start, QC submission, QC pass/fail, reopen, cancel, etc.)
router.post(
  '/:ticketId/transitions',
  requireBusinessAccess('owner', 'technician', 'customer'),
  validate(ticketTransitionSchema),
  transitionTicket,
);

// Owner confirms device handover
router.post(
  '/:ticketId/handover',
  requireBusinessAccess('owner'),
  validate(handoverSchema),
  handoverTicket,
);

// Owner issues service invoice for completed repair
router.post(
  '/:ticketId/invoice',
  requireBusinessAccess('owner'),
  validate(issueInvoiceSchema),
  issueInvoice,
);

// Scoped timeline
router.get(
  '/:ticketId/timeline',
  requireBusinessAccess('owner', 'technician', 'customer'),
  getTimeline,
);

// Owner generates or rotates tracking access secret
router.post(
  '/:ticketId/tracking-access',
  requireBusinessAccess('owner'),
  validate(issueTrackingAccessSchema),
  issueTrackingAccess,
);

// Ticket attachments
router.post(
  '/:ticketId/attachments',
  requireBusinessAccess('owner', 'technician', 'customer'),
  validate(addAttachmentSchema),
  addAttachment,
);

router.delete(
  '/:ticketId/attachments/:key',
  requireBusinessAccess('owner', 'technician', 'customer'),
  validate(detachAttachmentSchema),
  detachAttachment,
);

router.get(
  '/:ticketId/attachments/:key',
  requireBusinessAccess('owner', 'technician', 'customer'),
  getAttachmentDownload,
);

// Public Tracking Router: /public/tracking
export const publicTrackingRouter = express.Router();
publicTrackingRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
publicTrackingRouter.use(trackingLimiter);
publicTrackingRouter.post('/', validate(publicTrackingSchema), getPublicTracking);

export default router;
