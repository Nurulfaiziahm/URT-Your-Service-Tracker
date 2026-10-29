import express from 'express';
import {
  inviteTechnician,
  resendTechnicianInvitation,
  deleteTechnician,
  getTechnicians,
  getTechnicianById,
  updateTechnician,
  acceptTechnicianInvitation,
  inspectTechnicianInvitation,
  activateTechnicianInvitation,
} from './technician.controller.js';
import { validate } from '../../middleware/validation.js';
import { protect } from '../../middleware/auth.guard.js';
import {
  requireBusinessAccess,
  attachBusinessContext,
} from '../business/business.access.js';
import {
  inviteTechnicianSchema,
  updateTechnicianSchema,
  technicianQuerySchema,
  acceptTechnicianInvitationSchema,
  activateTechnicianInvitationSchema,
} from './technician.schema.js';
import { passwordResetLimiter } from '../../core/security/rate-limiter.js';

// Business-scoped technician router: /businesses/:businessId/technicians
export const technicianRouter = express.Router({ mergeParams: true });

technicianRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

technicianRouter.use(protect);

// Owner-only technician list
technicianRouter.get(
  '/',
  requireBusinessAccess('owner'),
  validate(technicianQuerySchema),
  getTechnicians,
);

// Owner creates technician invitation
technicianRouter.post(
  '/invitations',
  requireBusinessAccess('owner'),
  validate(inviteTechnicianSchema),
  inviteTechnician,
);

// Owner resends technician invitation
technicianRouter.post(
  '/:technicianId/invitation',
  requireBusinessAccess('owner'),
  resendTechnicianInvitation,
);

// Owner removes an unassigned technician without deleting service history.
technicianRouter.delete('/:technicianId', requireBusinessAccess('owner'), deleteTechnician);

// Detail: Owner or technician themselves
technicianRouter.get(
  '/:technicianId',
  attachBusinessContext,
  getTechnicianById,
);

// Update: Owner (full) or Technician themselves (permitted profile fields)
technicianRouter.put(
  '/:technicianId',
  attachBusinessContext,
  validate(updateTechnicianSchema),
  updateTechnician,
);

// Separate router for public/global technician invitation acceptance: /technician-invitations
export const technicianInvitationRouter = express.Router();

technicianInvitationRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

technicianInvitationRouter.post(
  '/inspect', passwordResetLimiter, validate(acceptTechnicianInvitationSchema), inspectTechnicianInvitation,
);
technicianInvitationRouter.post(
  '/activate', passwordResetLimiter, validate(activateTechnicianInvitationSchema), activateTechnicianInvitation,
);
technicianInvitationRouter.post(
  '/accept',
  protect,
  validate(acceptTechnicianInvitationSchema),
  acceptTechnicianInvitation,
);

export default technicianRouter;
