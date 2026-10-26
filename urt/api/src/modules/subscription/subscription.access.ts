import { BusinessSubscription } from '../../models/BusinessSubscription.model.js';
import { Technician } from '../../models/Technician.model.js';
import { AppError } from '../../middleware/error-handler.js';

export const countTechnicianSeats = (businessId: string, excludeTechnicianId?: string) =>
  Technician.countDocuments({
    businessId,
    ...(excludeTechnicianId && { _id: { $ne: excludeTechnicianId } }),
    $or: [{ status: 'active' }, { status: 'pending', invitationExpiresAt: { $gt: new Date() } }],
  });

export const requireActiveSubscription = async (businessId: string) => {
  const now = new Date();
  const subscription = await BusinessSubscription.findOne({
    businessId,
    currentPeriodStart: { $lte: now },
    currentPeriodEnd: { $gt: now },
  });
  if (!subscription) {
    throw new AppError(
      'An active subscription is required for this operation',
      403,
      'SUBSCRIPTION_REQUIRED',
    );
  }
  return subscription;
};

// Simple pre-write check for the presentation app. An existing technician or
// pending invitation is excluded so accepting/resending doesn't need two seats.
export const requireTechnicianSeat = async (businessId: string, technicianId?: string) => {
  const subscription = await requireActiveSubscription(businessId);
  const limit = subscription.packageSnapshot.maxTechnicians;
  if (limit != null && (await countTechnicianSeats(businessId, technicianId)) >= limit) {
    throw new AppError(
      `This package allows up to ${limit} technician seats, including pending invitations`,
      409,
      'TECHNICIAN_LIMIT_REACHED',
    );
  }
};
