import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../middleware/error-handler.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { Business, IBusiness } from '../../models/Business.model.js';
import { Technician, ITechnician } from '../../models/Technician.model.js';
import { Customer, ICustomer } from '../../models/Customer.model.js';

export type BusinessRole = 'owner' | 'technician' | 'customer';

export interface BusinessContext {
  business: IBusiness;
  isOwner: boolean;
  technician: ITechnician | null;
  customer: ICustomer | null;
  roles: BusinessRole[];
}

/**
 * Validate MongoDB ObjectId string; throws 404 if invalid so we don't expose internal errors.
 */
export const validateObjectId = (id: string, resourceName = 'Resource'): void => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${resourceName} not found`, 404);
  }
};

/**
 * Resolve concrete business relationships for a user.
 * Returns null if business not found or inactive (when allowNotFound is true).
 */
export const getBusinessContext = async (
  businessId: string,
  userId: string,
): Promise<BusinessContext> => {
  validateObjectId(businessId, 'Business');

  const business = await Business.findById(businessId);
  if (!business) {
    throw new AppError('Business not found', 404);
  }

  if (!business.isActive) {
    throw new AppError('Business is currently inactive', 403, 'BUSINESS_FORBIDDEN');
  }

  const isOwner = business.ownerId.toString() === userId;

  const [technician, customer] = await Promise.all([
    Technician.findOne({
      businessId: business._id,
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
    }),
    Customer.findOne({
      businessId: business._id,
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
    }),
  ]);

  const roles: BusinessRole[] = [];
  if (isOwner) roles.push('owner');
  if (technician) roles.push('technician');
  if (customer) roles.push('customer');

  return {
    business,
    isOwner,
    technician,
    customer,
    roles,
  };
};

/**
 * Middleware: require caller to hold at least one of the allowed business roles.
 * Resolves context and attaches to req.businessContext.
 */
export const requireBusinessAccess = (...allowedRoles: BusinessRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = getAuthUser(req);
      const businessId = req.params.businessId;

      if (!businessId) {
        throw new AppError('Business ID is required in route parameter', 400);
      }

      const context = await getBusinessContext(businessId, user.id);

      const hasPermission = allowedRoles.some((role) => context.roles.includes(role));
      if (!hasPermission) {
        throw new AppError(
          'You do not have permission to perform this action in this business',
          403,
          'BUSINESS_FORBIDDEN',
        );
      }

      req.businessContext = context;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: optionally resolve and attach businessContext if user is authenticated
 * and businessId is valid and active. Does not throw 403/404, allowing open reads with
 * role-specific elevations (e.g. isOwner).
 */
export const attachBusinessContext = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const businessId = req.params.businessId;
    if (businessId && req.user?.id) {
      req.businessContext = await getBusinessContext(businessId, req.user.id);
    }
  } catch {
    // Leave businessContext undefined on error
  }
  next();
};
