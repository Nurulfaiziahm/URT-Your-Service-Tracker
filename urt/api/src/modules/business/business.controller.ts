import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { BusinessService } from './business.service.js';
import { CreateBusinessInput, UpdateBusinessInput } from './business.schema.js';

export const createBusiness = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const input = req.body as CreateBusinessInput;
  const business = await BusinessService.createBusiness(user.id, input);

  ResponseHandler.created(res, { business }, 'Business created successfully');
});

export const getMyBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const businesses = await BusinessService.getUserBusinesses(user.id);

  ResponseHandler.success(res, { businesses }, 'Accessible businesses retrieved');
});

export const getBusinessById = asyncHandler(async (req: Request, res: Response) => {
  const context = req.businessContext!;
  const business = await BusinessService.getBusinessById(context.business._id.toString(), context.isOwner);

  ResponseHandler.success(res, { business }, 'Business retrieved successfully');
});

export const updateBusiness = asyncHandler(async (req: Request, res: Response) => {
  const context = req.businessContext!;
  const input = req.body as UpdateBusinessInput;
  const business = await BusinessService.updateBusiness(context.business._id.toString(), input);

  ResponseHandler.success(res, { business }, 'Business updated successfully');
});

export const getPublicBusiness = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.params.slug;
  const result = await BusinessService.getPublicBusinessBySlug(slug);

  ResponseHandler.success(res, result, 'Public business profile retrieved');
});
