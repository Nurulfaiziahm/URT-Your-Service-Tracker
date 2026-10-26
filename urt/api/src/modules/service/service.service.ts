import mongoose from 'mongoose';
import { Service, IService } from '../../models/Service.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { CreateServiceInput, UpdateServiceInput, ServiceQueryParams } from './service.schema.js';

export class ServiceService {
  /**
   * Create a new repair service in business catalog (owner only)
   */
  static async createService(businessId: string, input: CreateServiceInput): Promise<IService> {
    validateObjectId(businessId, 'Business');

    const service = await Service.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name: input.name,
      description: input.description,
      category: input.category,
      basePrice: input.basePrice,
      estimatedDuration: input.estimatedDuration,
      status: 'active',
    });

    return service;
  }

  /**
   * List services for a business.
   * If caller is owner, they can view archived services or filter by status.
   * If caller is not owner, only active services are returned.
   */
  static async getServices(
    businessId: string,
    isOwner: boolean,
    query?: ServiceQueryParams,
  ): Promise<{ services: IService[]; total: number; page: number; limit: number }> {
    validateObjectId(businessId, 'Business');

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
    };

    if (isOwner) {
      if (query?.status) {
        filter.status = query.status;
      }
    } else {
      // Non-owners (customers, technicians, public) only see active services
      filter.status = 'active';
    }

    if (query?.category) {
      filter.category = query.category;
    }

    if (query?.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1, _id: -1 }),
      Service.countDocuments(filter),
    ]);

    return { services, total, page, limit };
  }

  /**
   * Get single service detail
   */
  static async getServiceById(
    businessId: string,
    serviceId: string,
    isOwner: boolean,
  ): Promise<IService> {
    validateObjectId(businessId, 'Business');
    validateObjectId(serviceId, 'Service');

    const service = await Service.findOne({
      _id: new mongoose.Types.ObjectId(serviceId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    if (!isOwner && service.status === 'archived') {
      throw new AppError('Service not found', 404);
    }

    return service;
  }

  /**
   * Update service or archive/reactivate (owner only)
   */
  static async updateService(
    businessId: string,
    serviceId: string,
    input: UpdateServiceInput,
  ): Promise<IService> {
    validateObjectId(businessId, 'Business');
    validateObjectId(serviceId, 'Service');

    const service = await Service.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(serviceId),
        businessId: new mongoose.Types.ObjectId(businessId),
      },
      { $set: input },
      { new: true, runValidators: true },
    );

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    return service;
  }
}
