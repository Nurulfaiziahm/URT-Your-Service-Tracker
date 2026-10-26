import mongoose from 'mongoose';
import crypto from 'crypto';
import { Technician, ITechnician } from '../../models/Technician.model.js';
import { ServiceTicket } from '../../models/ServiceTicket.model.js';
import { Business } from '../../models/Business.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../utils/logger.js';
import { requireActiveSubscription, requireTechnicianSeat } from '../subscription/subscription.access.js';
import { mailService } from '../../lib/mail/index.js';
import {
  InviteTechnicianInput,
  UpdateTechnicianInput,
  TechnicianQueryParams,
} from './technician.schema.js';

export class TechnicianService {
  /**
   * Invite a new technician to the business (owner only)
   */
  static async inviteTechnician(businessId: string, input: InviteTechnicianInput) {
    validateObjectId(businessId, 'Business');

    const business = await Business.findById(businessId);
    if (!business) {
      throw new AppError('Business not found', 404);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await Technician.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      email: normalizedEmail,
    });

    if (existing) {
      if (existing.status === 'active') {
        throw new AppError(
          'A technician with this email is already active in this business',
          409,
          'TECHNICIAN_EXISTS',
        );
      }
      if (existing.status === 'pending') {
        throw new AppError(
          'An invitation is already pending for this email. Use resend invitation instead.',
          409,
          'INVITATION_PENDING',
        );
      }
    }

    await requireTechnicianSeat(businessId, existing?._id.toString());

    let technician: ITechnician;

    if (existing && existing.status === 'inactive') {
      // Re-invite previously inactive technician
      existing.name = input.name;
      existing.phone = input.phone;
      existing.specializations = input.specializations || [];
      existing.status = 'pending';
      existing.invitationTokenHash = tokenHash;
      existing.invitationExpiresAt = expiresAt;
      existing.userId = undefined;
      await existing.save();
      technician = existing;
    } else {
      technician = await Technician.create({
        businessId: new mongoose.Types.ObjectId(businessId),
        name: input.name,
        email: normalizedEmail,
        phone: input.phone,
        specializations: input.specializations || [],
        status: 'pending',
        invitationTokenHash: tokenHash,
        invitationExpiresAt: expiresAt,
      });
    }

    const frontendBaseUrl = config.allowedOrigins[0] || 'http://localhost:5173';
    const invitationUrl = `${frontendBaseUrl}/invitations/technician?token=${rawToken}`;

    logger.info(`[TECHNICIAN INVITATION] Token generated for ${normalizedEmail}: ${rawToken}`);

    let mailSent = false;
    try {
      mailSent = await mailService.sendTemplate({
        to: normalizedEmail,
        subject: `Undangan Bergabung sebagai Teknisi di ${business.name}`,
        template: 'technician-invitation',
        data: {
          title: 'Undangan Teknisi',
          preheader: `Undangan dari ${business.name}`,
          name: technician.name,
          businessName: business.name,
          invitationUrl,
          expiresIn: '7 hari',
        },
      });
    } catch (err) {
      logger.error('Failed to send technician invitation email', { error: err });
    }

    return {
      technician,
      mailSent,
      ...(config.nodeEnv !== 'production' && { token: rawToken, invitationUrl }),
    };
  }

  /**
   * Resend invitation to a pending technician (owner only)
   */
  static async resendInvitation(businessId: string, technicianId: string) {
    validateObjectId(businessId, 'Business');
    validateObjectId(technicianId, 'Technician');

    const business = await Business.findById(businessId);
    if (!business) {
      throw new AppError('Business not found', 404);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const technician = await Technician.findOne({
      _id: new mongoose.Types.ObjectId(technicianId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!technician) {
      throw new AppError('Technician not found', 404);
    }

    if (technician.status !== 'pending') {
      throw new AppError('Technician is not in pending status', 400, 'NOT_PENDING');
    }

    await requireTechnicianSeat(businessId, technician._id.toString());

    technician.invitationTokenHash = tokenHash;
    technician.invitationExpiresAt = expiresAt;
    await technician.save();

    const frontendBaseUrl = config.allowedOrigins[0] || 'http://localhost:5173';
    const invitationUrl = `${frontendBaseUrl}/invitations/technician?token=${rawToken}`;

    logger.info(`[TECHNICIAN RESEND] Token generated for ${technician.email}: ${rawToken}`);

    let mailSent = false;
    try {
      mailSent = await mailService.sendTemplate({
        to: technician.email,
        subject: `Undangan Bergabung sebagai Teknisi di ${business.name}`,
        template: 'technician-invitation',
        data: {
          title: 'Undangan Teknisi',
          preheader: `Undangan dari ${business.name}`,
          name: technician.name,
          businessName: business.name,
          invitationUrl,
          expiresIn: '7 hari',
        },
      });
    } catch (err) {
      logger.error('Failed to send technician invitation email', { error: err });
    }

    return {
      technicianId: technician._id.toString(),
      email: technician.email,
      expiresAt,
      mailSent,
      ...(config.nodeEnv !== 'production' && { token: rawToken, invitationUrl }),
    };
  }

  /** Permanently remove a technician only when no service tickets reference it. */
  static async deleteTechnician(businessId: string, technicianId: string): Promise<void> {
    validateObjectId(businessId, 'Business');
    validateObjectId(technicianId, 'Technician');

    const technician = await Technician.findOne({
      _id: new mongoose.Types.ObjectId(technicianId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });
    if (!technician) throw new AppError('Technician not found', 404);

    // Revoke access and invalidate a pending invitation before checking references.
    if (technician.status !== 'inactive') {
      technician.status = 'inactive';
      await technician.save();
    }

    const hasTickets = await ServiceTicket.exists({
      businessId: technician.businessId,
      assignedTechnicianId: technician._id,
    });
    if (hasTickets) {
      throw new AppError(
        'This technician has service ticket history and was deactivated instead of deleted.',
        409,
        'TECHNICIAN_HAS_TICKETS',
      );
    }

    await Technician.deleteOne({
      _id: technician._id,
      businessId: technician.businessId,
      status: 'inactive',
    });
  }

  /**
   * List technicians in a business (owner only)
   */
  static async getTechnicians(
    businessId: string,
    query?: TechnicianQueryParams,
  ): Promise<{ technicians: ITechnician[]; total: number; page: number; limit: number }> {
    validateObjectId(businessId, 'Business');

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
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

    const [technicians, total] = await Promise.all([
      Technician.find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1, _id: -1 }),
      Technician.countDocuments(filter),
    ]);

    return { technicians, total, page, limit };
  }

  /**
   * Get single technician detail (Owner, or the technician themselves)
   */
  static async getTechnicianById(
    businessId: string,
    technicianId: string,
    callerUserId: string,
    isOwner: boolean,
  ): Promise<ITechnician> {
    validateObjectId(businessId, 'Business');
    validateObjectId(technicianId, 'Technician');

    const technician = await Technician.findOne({
      _id: new mongoose.Types.ObjectId(technicianId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!technician) {
      throw new AppError('Technician not found', 404);
    }

    if (!isOwner && technician.userId?.toString() !== callerUserId) {
      throw new AppError('Technician not found', 404);
    }

    return technician;
  }

  /**
   * Update technician profile / status
   * - Owner can update name, phone, specializations, status
   * - Technician themselves can only update name, phone, specializations
   */
  static async updateTechnician(
    businessId: string,
    technicianId: string,
    callerUserId: string,
    isOwner: boolean,
    input: UpdateTechnicianInput,
  ): Promise<ITechnician> {
    validateObjectId(businessId, 'Business');
    validateObjectId(technicianId, 'Technician');

    const technician = await Technician.findOne({
      _id: new mongoose.Types.ObjectId(technicianId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    if (!technician) {
      throw new AppError('Technician not found', 404);
    }

    if (!isOwner && technician.userId?.toString() !== callerUserId) {
      throw new AppError('Technician not found', 404);
    }

    if (isOwner && input.status === 'active') {
      await requireTechnicianSeat(businessId, technician._id.toString());
    } else if (!(isOwner && input.status === 'inactive')) {
      await requireActiveSubscription(businessId);
    }

    if (!isOwner) {
      // Technician updating own profile
      if (input.status !== undefined) {
        throw new AppError(
          'Technicians are not authorized to modify their own active status',
          403,
          'STATUS_CHANGE_FORBIDDEN',
        );
      }
      if (input.name !== undefined) technician.name = input.name;
      if (input.phone !== undefined) technician.phone = input.phone;
      if (input.specializations !== undefined) technician.specializations = input.specializations;
    } else {
      // Owner updating technician
      if (input.status === 'active' && !technician.userId) {
        throw new AppError('Technician must accept their invitation before activation', 409, 'INVITATION_REQUIRED');
      }
      if (input.name !== undefined) technician.name = input.name;
      if (input.phone !== undefined) technician.phone = input.phone;
      if (input.specializations !== undefined) technician.specializations = input.specializations;
      if (input.status !== undefined) {
        if (input.status === 'inactive' && technician.status !== 'inactive') {
          // Reject deactivation if technician still has active assigned tickets
          const activeTicketsCount = await ServiceTicket.countDocuments({
            businessId: technician.businessId,
            assignedTechnicianId: technician._id,
            status: { $nin: ['completed', 'cancelled'] },
          });

          if (activeTicketsCount > 0) {
            throw new AppError(
              `Cannot deactivate technician with ${activeTicketsCount} active assigned ticket(s). Reassign them first.`,
              400,
              'TECHNICIAN_HAS_ACTIVE_TICKETS',
            );
          }
        }
        technician.status = input.status;
      }
    }

    await technician.save();
    return technician;
  }

  /**
   * Accept technician invitation and link user account
   */
  static async acceptInvitation(
    userId: string,
    userEmail: string,
    isEmailVerified: boolean,
    rawToken: string,
  ): Promise<ITechnician> {
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    const technician = await Technician.findOne({
      invitationTokenHash: tokenHash,
      status: 'pending',
      invitationExpiresAt: { $gt: new Date() },
    }).select('+invitationTokenHash');

    if (!technician) {
      throw new AppError('Invalid or expired invitation token', 400, 'INVALID_TOKEN');
    }

    if (technician.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new AppError('Logged-in email does not match invitation email', 403, 'EMAIL_MISMATCH');
    }

    if (!isEmailVerified) {
      throw new AppError('Please verify your email before accepting this invitation', 400, 'EMAIL_NOT_VERIFIED');
    }

    // Check if user is already an active technician in this business
    const existing = await Technician.findOne({
      businessId: technician.businessId,
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
    });

    if (existing) {
      throw new AppError('You are already an active technician in this business', 409, 'ALREADY_ACTIVE');
    }

    await requireTechnicianSeat(technician.businessId.toString(), technician._id.toString());

    technician.userId = new mongoose.Types.ObjectId(userId);
    technician.status = 'active';
    technician.invitationTokenHash = undefined;
    technician.invitationExpiresAt = undefined;
    await technician.save();

    return technician;
  }
}
