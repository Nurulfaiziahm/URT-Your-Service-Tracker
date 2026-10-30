import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { TicketService } from './ticket.service.js';
import { serializeTicket } from './ticket.serializer.js';
import {
  CreateTicketInput,
  UpdateIntakeInput,
  AssignTechnicianInput,
  DiagnosisInput,
  EstimateDraftInput,
  SubmitEstimateInput,
  ApprovalInput,
  HandoverInput,
  TicketQueryParams,
  TicketTransitionInput,
  PublicTrackingInput,
  AddAttachmentInput,
} from './ticket.schema.js';

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const user = getAuthUser(req);
  const isOwner = Boolean(req.businessContext?.isOwner);
  const input = req.body as CreateTicketInput;

  const userProfile = await AuthService.getProfile(user.id);

  const ticket = await TicketService.createTicket(
    businessId,
    {
      id: user.id,
      email: userProfile.email,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
      phone: userProfile.phone,
      address: userProfile.address,
    },
    isOwner,
    input,
  );

  const serialized = serializeTicket(ticket, isOwner ? 'owner' : 'customer');
  ResponseHandler.created(res, { ticket: serialized }, 'Service ticket created successfully');
});

export const getTickets = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const user = getAuthUser(req);
  const query = req.query as unknown as TicketQueryParams;
  const roles = req.businessContext?.roles || [];

  let activeRole: 'owner' | 'technician' | 'customer' = 'customer';
  if (roles.includes('owner')) {
    activeRole = 'owner';
  } else if (roles.includes('technician')) {
    activeRole = 'technician';
  }

  const result = await TicketService.getTickets(businessId, user.id, activeRole, query);

  const serialized = result.tickets.map((t) => serializeTicket(t, activeRole));

  ResponseHandler.paginated(
    res,
    serialized,
    result.page,
    result.limit,
    result.total,
    'Tickets retrieved successfully',
  );
});

export const getTicketById = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];

  const { ticket, activeRole, isAssignedTechnician } = await TicketService.getTicketById(
    businessId,
    ticketId,
    user.id,
    roles,
  );

  const serialized = serializeTicket(ticket, activeRole, isAssignedTechnician);

  ResponseHandler.success(res, { ticket: serialized }, 'Ticket details retrieved successfully');
});

export const deleteAnonymousTicket = asyncHandler(async (req: Request, res: Response) => {
  await TicketService.deleteAnonymousTicket(req.params.businessId, req.params.ticketId, getAuthUser(req).id, req.body.expectedRevision);
  ResponseHandler.success(res, null, 'Tiket anonim berhasil dihapus.');
});

export const updateIntake = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as UpdateIntakeInput;

  const ticket = await TicketService.updateIntake(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'owner');

  ResponseHandler.success(res, { ticket: serialized }, 'Intake details updated successfully');
});

export const assignTechnician = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as AssignTechnicianInput;

  const ticket = await TicketService.assignTechnician(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'owner');

  ResponseHandler.success(res, { ticket: serialized }, 'Technician assigned successfully');
});

export const saveDiagnosis = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as DiagnosisInput;

  const ticket = await TicketService.saveDiagnosis(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'technician', true);

  ResponseHandler.success(res, { ticket: serialized }, 'Diagnosis saved successfully');
});

export const saveEstimateDraft = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as EstimateDraftInput;

  const ticket = await TicketService.saveEstimateDraft(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'technician', true);

  ResponseHandler.success(res, { ticket: serialized }, 'Estimate draft saved successfully');
});

export const submitEstimate = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as SubmitEstimateInput;

  const ticket = await TicketService.submitEstimate(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'technician', true);

  ResponseHandler.success(res, { ticket: serialized }, 'Estimate submitted for customer approval');
});

export const respondToEstimate = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as ApprovalInput;

  const ticket = await TicketService.respondToEstimate(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'customer');

  ResponseHandler.success(
    res,
    { ticket: serialized },
    input.decision === 'approved' ? 'Estimate approved successfully' : 'Estimate rejected',
  );
});

export const transitionTicket = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const input = req.body as TicketTransitionInput;

  const callerRole: 'owner' | 'technician' | 'customer' = roles.includes('owner')
    ? 'owner'
    : roles.includes('technician')
      ? 'technician'
      : 'customer';

  const ticket = await TicketService.transitionTicket(
    businessId,
    ticketId,
    user.id,
    callerRole,
    input,
  );

  const serialized = serializeTicket(ticket, callerRole);

  ResponseHandler.success(res, { ticket: serialized }, 'Ticket status updated successfully');
});

export const handoverTicket = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as HandoverInput;

  const ticket = await TicketService.handoverTicket(businessId, ticketId, user.id, input);
  const serialized = serializeTicket(ticket, 'owner');

  ResponseHandler.success(res, { ticket: serialized }, 'Device handover confirmed successfully');
});

export const getTimeline = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];

  const { ticket, activeRole, isAssignedTechnician } = await TicketService.getTicketById(
    businessId,
    ticketId,
    user.id,
    roles,
  );

  const serialized = serializeTicket(ticket, activeRole, isAssignedTechnician);

  ResponseHandler.success(
    res,
    { timeline: serialized.timeline },
    'Ticket timeline retrieved successfully',
  );
});

export const issueTrackingAccess = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as { expectedRevision: number };

  const result = await TicketService.issueTrackingAccess(
    businessId,
    ticketId,
    user.id,
    input.expectedRevision,
  );

  ResponseHandler.success(res, result, 'Tracking access generated successfully');
});

export const getPublicTracking = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as PublicTrackingInput;
  const result = await TicketService.getPublicTracking(input);

  ResponseHandler.success(res, result, 'Tracking status retrieved successfully');
});

export const addAttachment = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const primaryRole = roles.includes('owner')
    ? 'owner'
    : roles.includes('technician')
      ? 'technician'
      : 'customer';
  const input = req.body as AddAttachmentInput;

  const userProfile = await AuthService.getProfile(user.id);
  const ticket = await TicketService.addAttachment(
    businessId,
    ticketId,
    {
      id: user.id,
      email: userProfile.email,
      firstName: userProfile.firstName,
      lastName: userProfile.lastName,
    },
    primaryRole,
    input,
  );

  const serialized = serializeTicket(ticket, primaryRole);
  ResponseHandler.success(res, { ticket: serialized }, 'Attachment added successfully');
});

export const detachAttachment = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const key = req.params.key;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const primaryRole = roles.includes('owner')
    ? 'owner'
    : roles.includes('technician')
      ? 'technician'
      : 'customer';
  const input = req.body as { expectedRevision: number };

  const userProfile = await AuthService.getProfile(user.id);
  const ticket = await TicketService.detachAttachment(
    businessId,
    ticketId,
    key,
    { id: user.id, email: userProfile.email },
    primaryRole,
    input.expectedRevision,
  );

  const serialized = serializeTicket(ticket, primaryRole);
  ResponseHandler.success(res, { ticket: serialized }, 'Attachment detached successfully');
});

export const getAttachmentDownload = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const key = req.params.key;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const primaryRole = roles.includes('owner')
    ? 'owner'
    : roles.includes('technician')
      ? 'technician'
      : 'customer';

  const userProfile = await AuthService.getProfile(user.id);
  const result = await TicketService.getAttachmentDownload(
    businessId,
    ticketId,
    key,
    { id: user.id, email: userProfile.email },
    primaryRole,
  );

  ResponseHandler.success(res, result, 'Attachment download URL generated');
});
