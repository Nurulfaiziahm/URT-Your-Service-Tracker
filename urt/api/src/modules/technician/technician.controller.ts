import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { TechnicianService } from './technician.service.js';
import {
  InviteTechnicianInput,
  UpdateTechnicianInput,
  TechnicianQueryParams,
  AcceptTechnicianInvitationInput,
} from './technician.schema.js';

export const inviteTechnician = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const input = req.body as InviteTechnicianInput;
  const result = await TechnicianService.inviteTechnician(businessId, input);

  ResponseHandler.created(res, result, 'Technician invitation created');
});

export const resendTechnicianInvitation = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const technicianId = req.params.technicianId;
  const result = await TechnicianService.resendInvitation(businessId, technicianId);

  ResponseHandler.success(res, result, 'Technician invitation resent');
});

export const deleteTechnician = asyncHandler(async (req: Request, res: Response) => {
  await TechnicianService.deleteTechnician(req.params.businessId, req.params.technicianId);
  ResponseHandler.noContent(res);
});

export const getTechnicians = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const query = req.query as unknown as TechnicianQueryParams;

  const result = await TechnicianService.getTechnicians(businessId, query);

  ResponseHandler.paginated(
    res,
    result.technicians,
    result.page,
    result.limit,
    result.total,
    'Technicians retrieved successfully',
  );
});

export const getTechnicianById = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const technicianId = req.params.technicianId;
  const user = getAuthUser(req);
  const isOwner = Boolean(req.businessContext?.isOwner);

  const technician = await TechnicianService.getTechnicianById(
    businessId,
    technicianId,
    user.id,
    isOwner,
  );

  ResponseHandler.success(res, { technician }, 'Technician retrieved successfully');
});

export const updateTechnician = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const technicianId = req.params.technicianId;
  const user = getAuthUser(req);
  const isOwner = Boolean(req.businessContext?.isOwner);
  const input = req.body as UpdateTechnicianInput;

  const technician = await TechnicianService.updateTechnician(
    businessId,
    technicianId,
    user.id,
    isOwner,
    input,
  );

  ResponseHandler.success(res, { technician }, 'Technician updated successfully');
});

export const acceptTechnicianInvitation = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const input = req.body as AcceptTechnicianInvitationInput;

  const userRecord = await AuthService.getProfile(user.id);

  const technician = await TechnicianService.acceptInvitation(
    user.id,
    userRecord.email,
    userRecord.isEmailVerified,
    input.token,
  );

  ResponseHandler.success(res, { technician, membership: { businessId: technician.businessId.toString(), role: 'technician' } }, 'Technician invitation accepted successfully');
});

export const inspectTechnicianInvitation = asyncHandler(async (req, res) => {
  ResponseHandler.success(res, await TechnicianService.inspectInvitation(req.body.token));
});

export const activateTechnicianInvitation = asyncHandler(async (req, res) => {
  ResponseHandler.created(res, await TechnicianService.activateInvitation(req.body.token, req.body.password));
});
