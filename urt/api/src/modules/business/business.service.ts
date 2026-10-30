import mongoose from 'mongoose';
import { Business, IBusiness } from '../../models/Business.model.js';
import { Service } from '../../models/Service.model.js';
import { Technician } from '../../models/Technician.model.js';
import { Customer } from '../../models/Customer.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { CreateBusinessInput, UpdateBusinessInput } from './business.schema.js';
import { validateObjectId } from './business.access.js';

export interface UserBusinessContextItem {
  businessId: string;
  slug: string;
  name: string;
  roles: Array<'owner' | 'technician' | 'customer'>;
}

export class BusinessService {
  /**
   * Onboard an owner: create a new business owned by caller
   */
  static async createBusiness(ownerId: string, input: CreateBusinessInput): Promise<IBusiness> {
    const existingOwned = await Business.findOne({ ownerId: new mongoose.Types.ObjectId(ownerId) });
    if (existingOwned) {
      throw new AppError('You already own a registered business', 409, 'BUSINESS_ALREADY_EXISTS');
    }

    const existingSlug = await Business.findOne({ slug: input.slug });
    if (existingSlug) {
      throw new AppError('Business slug is already taken. Please choose another.', 409, 'SLUG_IN_USE');
    }

    const business = await Business.create({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      name: input.name,
      slug: input.slug,
      address: input.address,
      phone: input.phone,
      contactEmail: input.contactEmail,
      businessHours: input.businessHours,
      timezone: input.timezone || 'Asia/Jakarta',
      currency: input.currency || 'IDR',
    });

    return business;
  }

  /**
   * Get accessible businesses and roles for the authenticated user
   */
  static async getUserBusinesses(userId: string): Promise<UserBusinessContextItem[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [ownedBusinesses, technicianMemberships, customerMemberships] = await Promise.all([
      Business.find({ ownerId: userObjectId, isActive: true }),
      Technician.find({ userId: userObjectId, status: 'active' }).populate<{ businessId: IBusiness }>('businessId'),
      Customer.find({ userId: userObjectId, status: 'active' }).populate<{ businessId: IBusiness }>('businessId'),
    ]);

    const businessMap = new Map<string, { businessId: string; slug: string; name: string; roles: Set<'owner' | 'technician' | 'customer'> }>();

    for (const b of ownedBusinesses) {
      const id = b._id.toString();
      businessMap.set(id, {
        businessId: id,
        slug: b.slug,
        name: b.name,
        roles: new Set(['owner']),
      });
    }

    for (const t of technicianMemberships) {
      if (t.businessId && t.businessId.isActive) {
        const id = t.businessId._id.toString();
        const entry = businessMap.get(id);
        if (entry) {
          entry.roles.add('technician');
        } else {
          businessMap.set(id, {
            businessId: id,
            slug: t.businessId.slug,
            name: t.businessId.name,
            roles: new Set(['technician']),
          });
        }
      }
    }

    for (const c of customerMemberships) {
      if (c.businessId && c.businessId.isActive) {
        const id = c.businessId._id.toString();
        const entry = businessMap.get(id);
        if (entry) {
          entry.roles.add('customer');
        } else {
          businessMap.set(id, {
            businessId: id,
            slug: c.businessId.slug,
            name: c.businessId.name,
            roles: new Set(['customer']),
          });
        }
      }
    }

    return Array.from(businessMap.values()).map((item) => ({
      businessId: item.businessId,
      slug: item.slug,
      name: item.name,
      roles: Array.from(item.roles),
    }));
  }

  /**
   * Get business details by ID (scoped by caller roles)
   */
  static async getBusinessById(businessId: string, isOwner: boolean): Promise<Partial<IBusiness>> {
    validateObjectId(businessId, 'Business');

    const business = await Business.findById(businessId);
    if (!business || !business.isActive) {
      throw new AppError('Business not found', 404);
    }

    if (isOwner) {
      return business;
    }

    // Safe view for technicians and customers
    return {
      id: business.id,
      _id: business._id,
      name: business.name,
      slug: business.slug,
      address: business.address,
      phone: business.phone,
      contactEmail: business.contactEmail,
      businessHours: business.businessHours,
      timezone: business.timezone,
      currency: business.currency,
      isActive: business.isActive,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
    };
  }

  /**
   * Update business settings (owner only)
   */
  static async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<IBusiness> {
    validateObjectId(businessId, 'Business');

    const business = await Business.findByIdAndUpdate(
      businessId,
      { $set: input },
      { new: true, runValidators: true },
    );

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    return business;
  }

  /**
   * Public business lookup by slug
   */
  static async getPublicBusinessBySlug(slug: string) {
    const business = await Business.findOne({
      slug: slug.toLowerCase().trim(),
      isActive: true,
    });

    if (!business) {
      throw new AppError('Business not found', 404);
    }

    const services = await Service.find({
      businessId: business._id,
      status: 'active',
      entryType: { $in: ['service', null] },
      deletedAt: { $exists: false },
    }).select('name description category basePrice estimatedDuration');

    return {
      business: {
        id: business._id.toString(),
        name: business.name,
        slug: business.slug,
        address: business.address,
        phone: business.phone,
        contactEmail: business.contactEmail,
        businessHours: business.businessHours,
        timezone: business.timezone,
        currency: business.currency,
      },
      services: services.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        description: s.description,
        category: s.category,
        basePrice: s.basePrice,
        estimatedDuration: s.estimatedDuration,
      })),
    };
  }
}
