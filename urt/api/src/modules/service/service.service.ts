import mongoose from 'mongoose';
import { Service, IService } from '../../models/Service.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { CreateServiceInput, UpdateServiceInput, ServiceQueryParams } from './service.schema.js';

export class ServiceService {
  private static async checkDifficulty(businessId: string, level: string, excludeId?: string) {
    const found = await Service.findOne({ businessId: new mongoose.Types.ObjectId(businessId), entryType: 'difficulty', difficultyLevel: level, status: 'active', deletedAt: { $exists: false }, ...(excludeId ? { _id: { $ne: new mongoose.Types.ObjectId(excludeId) } } : {}) });
    if (found) throw new AppError('Tarif aktif untuk tingkat kesulitan ini sudah tersedia. Edit tarif yang ada.', 409, 'DUPLICATE_DIFFICULTY');
  }

  static async deleteService(businessId: string, serviceId: string) {
    validateObjectId(businessId, 'Business'); validateObjectId(serviceId, 'Service');
    const item = await Service.findOneAndUpdate({ _id: new mongoose.Types.ObjectId(serviceId), businessId: new mongoose.Types.ObjectId(businessId), deletedAt: { $exists: false } }, { $set: { status: 'archived', deletedAt: new Date() } }, { new: true, runValidators: true });
    if (!item) throw new AppError('Item katalog tidak ditemukan.', 404);
  }
  /**
   * Create a catalog item. Routes authorize owners and technicians.
   */
  static async createService(businessId: string, input: CreateServiceInput): Promise<IService> {
    validateObjectId(businessId, 'Business');
    if (input.entryType === 'difficulty' && input.difficultyLevel) await this.checkDifficulty(businessId, input.difficultyLevel);

    const service = await Service.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name: input.name,
      description: input.description,
      category: input.category,
      basePrice: input.basePrice,
      entryType: input.entryType,
      difficultyLevel: input.entryType === 'difficulty' ? input.difficultyLevel : undefined,
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
      deletedAt: { $exists: false },
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
    if (query?.entryType) filter.entryType = query.entryType === 'service' ? { $in: ['service', null] } : query.entryType;
    if (query?.scope === 'catalog') filter.entryType = { $in: ['service', 'part', null] };

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
      deletedAt: { $exists: false },
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

    const current = await Service.findOne({ _id: new mongoose.Types.ObjectId(serviceId), businessId: new mongoose.Types.ObjectId(businessId), deletedAt: { $exists: false } });
    if (!current) throw new AppError('Service not found', 404);
    const nextType = input.entryType ?? current.entryType ?? 'service';
    const nextLevel = input.difficultyLevel ?? current.difficultyLevel;
    if (nextType === 'difficulty' && !nextLevel) throw new AppError('Pilih tingkat kesulitan.', 400, 'DIFFICULTY_REQUIRED');
    if (nextType === 'difficulty' && (input.status ?? current.status) === 'active' && nextLevel) await this.checkDifficulty(businessId, nextLevel, serviceId);

    const service = await Service.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(serviceId),
        businessId: new mongoose.Types.ObjectId(businessId),
        deletedAt: { $exists: false },
      },
      { $set: { ...input, entryType: nextType, ...(nextType === 'difficulty' ? { difficultyLevel: nextLevel } : {}) }, ...(nextType !== 'difficulty' ? { $unset: { difficultyLevel: 1 } } : {}) },
      { new: true, runValidators: true },
    );

    if (!service) {
      throw new AppError('Service not found', 404);
    }

    return service;
  }
}
