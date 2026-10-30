import mongoose from 'mongoose';
import crypto from 'crypto';
import { Customer, ICustomer } from '../../models/Customer.model.js';
import { Business } from '../../models/Business.model.js';
import { ServiceTicket } from '../../models/ServiceTicket.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../utils/logger.js';
import { mailService } from '../../lib/mail/index.js';
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryParams } from './customer.schema.js';

export class CustomerService {
  /**
   * Create a customer contact for this business (owner only)
   */
  static async createCustomer(businessId: string, input: CreateCustomerInput): Promise<ICustomer> {
    validateObjectId(businessId, 'Business');

    const customer = await Customer.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name: input.name,
      email: input.email,
      phone: input.phone,
      address: input.address,
      status: 'active',
    });

    return customer;
  }

  /**
   * List customers for a business (owner only)
   */
  static async getCustomers(
    businessId: string,
    query?: CustomerQueryParams,
  ): Promise<{ customers: ICustomer[]; total: number; page: number; limit: number }> {
    validateObjectId(businessId, 'Business');

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
      deletedAt: { $exists: false },
    };

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1, _id: -1 }),
      Customer.countDocuments(filter),
    ]);

    return { customers, total, page, limit };
  }

  /**
   * Get single customer by ID (Owner, or linked Customer themselves)
   */
  static async getCustomerById(
    businessId: string,
    customerId: string,
    callerUserId: string,
    isOwner: boolean,
  ): Promise<ICustomer> {
    validateObjectId(businessId, 'Business');
    validateObjectId(customerId, 'Customer');

    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      businessId: new mongoose.Types.ObjectId(businessId),
      deletedAt: { $exists: false },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (!isOwner && customer.userId?.toString() !== callerUserId) {
      // Don't leak other customer records
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  static async deleteCustomer(businessId: string, customerId: string): Promise<void> {
    validateObjectId(businessId, 'Business');
    validateObjectId(customerId, 'Customer');
    const filter = { _id: new mongoose.Types.ObjectId(customerId), businessId: new mongoose.Types.ObjectId(businessId), deletedAt: { $exists: false } };
    const customer = await Customer.findOne(filter);
    if (!customer) throw new AppError('Customer not found', 404);
    if (customer.userId) throw new AppError('Pelanggan yang memiliki akun tidak dapat dihapus.', 409, 'CUSTOMER_HAS_ACCOUNT');
    const removed = await Customer.findOneAndUpdate({ ...filter, userId: null }, {
      $set: { status: 'archived', deletedAt: new Date() },
      $unset: { invitationTokenHash: 1, invitationExpiresAt: 1 },
    }, { new: true });
    if (!removed) throw new AppError('Pelanggan tidak dapat dihapus karena datanya telah berubah.', 409, 'CUSTOMER_CHANGED');
  }

  /**
   * Update customer contact info or archive/reactivate (owner only)
   */
  static async updateCustomer(
    businessId: string,
    customerId: string,
    input: UpdateCustomerInput,
  ): Promise<ICustomer> {
    validateObjectId(businessId, 'Business');
    validateObjectId(customerId, 'Customer');

    if (input.status === 'archived') {
      const hasActiveTickets = await ServiceTicket.exists({
        businessId: new mongoose.Types.ObjectId(businessId),
        customerId: new mongoose.Types.ObjectId(customerId),
        status: { $nin: ['completed', 'cancelled'] },
      });
      if (hasActiveTickets) {
        throw new AppError(
          'Cannot archive customer with active service tickets',
          409,
          'CUSTOMER_HAS_ACTIVE_TICKETS',
        );
      }
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(customerId),
        businessId: new mongoose.Types.ObjectId(businessId),
      },
      { $set: input },
      { new: true, runValidators: true },
    );

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    return customer;
  }

  /**
   * Issue or resend customer claim invitation
   */
  static async sendInvitation(businessId: string, customerId: string) {
    validateObjectId(businessId, 'Business');
    validateObjectId(customerId, 'Customer');

    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    if (customer.userId) {
      throw new AppError('Customer contact is already linked to an account', 400, 'ALREADY_LINKED');
    }

    if (!customer.email) {
      throw new AppError('Customer must have an email address to receive an invitation', 400, 'EMAIL_REQUIRED');
    }

    const business = await Business.findById(businessId);
    if (!business) {
      throw new AppError('Business not found', 404);
    }

    // Generate 32-byte crypto token and store its sha256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    customer.invitationTokenHash = tokenHash;
    customer.invitationExpiresAt = expiresAt;
    await customer.save();

    const frontendBaseUrl = config.allowedOrigins[0] || 'http://localhost:5173';
    const invitationUrl = `${frontendBaseUrl}/invitations/customer?token=${rawToken}`;

    logger.info(`[CUSTOMER INVITATION] Token generated for ${customer.email}: ${rawToken}`);

    let mailSent = false;
    try {
      mailSent = await mailService.sendTemplate({
        to: customer.email,
        subject: `Hubungkan Akun Anda di ${business.name}`,
        template: 'customer-invitation',
        data: {
          title: 'Hubungkan Akun Pelanggan',
          preheader: `Undangan dari ${business.name}`,
          name: customer.name,
          businessName: business.name,
          invitationUrl,
          expiresIn: '7 hari',
        },
      });
    } catch (err) {
      logger.error('Failed to send customer invitation email', { error: err });
    }

    return {
      customerId: customer._id.toString(),
      email: customer.email,
      expiresAt,
      mailSent,
      ...(config.nodeEnv !== 'production' && { token: rawToken, invitationUrl }),
    };
  }

  /**
   * Accept customer invitation and link account
   */
  static async acceptInvitation(
    userId: string,
    userEmail: string,
    isEmailVerified: boolean,
    rawToken: string,
  ): Promise<ICustomer> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    const customer = await Customer.findOne({
      invitationTokenHash: tokenHash,
      invitationExpiresAt: { $gt: new Date() },
    }).select('+invitationTokenHash');

    if (!customer) {
      throw new AppError('Invalid or expired invitation token', 400, 'INVALID_TOKEN');
    }

    if (customer.userId) {
      throw new AppError('Customer contact is already linked to an account', 400, 'ALREADY_LINKED');
    }

    if (!customer.email || customer.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new AppError('Logged-in email does not match invitation email', 403, 'EMAIL_MISMATCH');
    }

    if (!isEmailVerified) {
      throw new AppError('Please verify your email before accepting this invitation', 400, 'EMAIL_NOT_VERIFIED');
    }

    // Check if user already linked to this business
    const existing = await Customer.findOne({
      businessId: customer.businessId,
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (existing) {
      throw new AppError(
        'Your account is already linked to a customer contact in this business',
        409,
        'ALREADY_LINKED',
      );
    }

    customer.userId = new mongoose.Types.ObjectId(userId);
    customer.invitationTokenHash = undefined;
    customer.invitationExpiresAt = undefined;
    await customer.save();

    return customer;
  }
}
