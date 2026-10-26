import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { CustomerService } from './customer.service.js';
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  AcceptCustomerInvitationInput,
} from './customer.schema.js';

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const input = req.body as CreateCustomerInput;
  const customer = await CustomerService.createCustomer(businessId, input);

  ResponseHandler.created(res, { customer }, 'Customer created successfully');
});

export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const query = req.query as unknown as CustomerQueryParams;

  const result = await CustomerService.getCustomers(businessId, query);

  ResponseHandler.paginated(
    res,
    result.customers,
    result.page,
    result.limit,
    result.total,
    'Customers retrieved successfully',
  );
});

export const getCustomerById = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const customerId = req.params.customerId;
  const user = getAuthUser(req);
  const isOwner = Boolean(req.businessContext?.isOwner);

  const customer = await CustomerService.getCustomerById(businessId, customerId, user.id, isOwner);

  ResponseHandler.success(res, { customer }, 'Customer retrieved successfully');
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const customerId = req.params.customerId;
  const input = req.body as UpdateCustomerInput;

  const customer = await CustomerService.updateCustomer(businessId, customerId, input);

  ResponseHandler.success(res, { customer }, 'Customer updated successfully');
});

export const sendCustomerInvitation = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const customerId = req.params.customerId;

  const result = await CustomerService.sendInvitation(businessId, customerId);

  ResponseHandler.success(res, result, 'Customer invitation sent');
});

export const acceptCustomerInvitation = asyncHandler(async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  const input = req.body as AcceptCustomerInvitationInput;

  // Retrieve user record to verify email and email verification status
  const userRecord = await AuthService.getProfile(user.id);

  const customer = await CustomerService.acceptInvitation(
    user.id,
    userRecord.email,
    userRecord.isEmailVerified,
    input.token,
  );

  ResponseHandler.success(res, { customer }, 'Customer invitation accepted successfully');
});
