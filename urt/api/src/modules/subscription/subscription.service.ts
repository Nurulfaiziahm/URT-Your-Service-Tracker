import crypto from 'crypto';
import { Business } from '../../models/Business.model.js';
import { Package, IPackage } from '../../models/Package.model.js';
import { BusinessSubscription, PackageSnapshot } from '../../models/BusinessSubscription.model.js';
import { SubscriptionPayment } from '../../models/SubscriptionPayment.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { config } from '../../core/config/index.js';
import { validateObjectId } from '../business/business.access.js';
import { countTechnicianSeats } from './subscription.access.js';

const snapshotPackage = (plan: IPackage): PackageSnapshot => ({
  code: plan.code,
  name: plan.name,
  price: plan.price,
  currency: plan.currency,
  billingInterval: plan.billingInterval,
  maxTechnicians: plan.maxTechnicians,
  includesInventory: plan.includesInventory,
  includesPrioritySupport: plan.includesPrioritySupport,
  includesFinancialExport: plan.includesFinancialExport,
  includesBrandedReceipts: plan.includesBrandedReceipts,
});

export class SubscriptionService {
  static async getPayment(businessId: string, paymentId: string) {
    validateObjectId(businessId, 'Business');
    validateObjectId(paymentId, 'Subscription payment');
    const payment = await SubscriptionPayment.findOne({ _id: paymentId, businessId });
    if (!payment) throw new AppError('Subscription payment not found', 404, 'PAYMENT_NOT_FOUND');
    return {
      payment: this.serializePayment(payment),
      instructions: config.subscriptionPaymentInstructions.replace(/\\r\\n|\\n/g, '\n'),
      demoConfirmationAvailable: config.nodeEnv !== 'production',
    };
  }

  static async confirmDemoPayment(businessId: string, paymentId: string) {
    if (config.nodeEnv === 'production') {
      throw new AppError('Demo payment confirmation is disabled in production', 403, 'DEMO_PAYMENT_DISABLED');
    }
    validateObjectId(businessId, 'Business');
    validateObjectId(paymentId, 'Subscription payment');
    const payment = await SubscriptionPayment.findOne({ _id: paymentId, businessId });
    if (!payment) throw new AppError('Subscription payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (payment.status === 'paid') {
      return { payment: this.serializePayment(payment), subscription: await this.getSubscription(businessId) };
    }
    const now = new Date();
    if (payment.status !== 'pending' || payment.expiresAt <= now) {
      throw new AppError('Only an unexpired pending payment can be confirmed', 409, 'PAYMENT_NOT_PENDING');
    }
    const subscription = await BusinessSubscription.findOne({ businessId });
    const active = !!subscription && subscription.currentPeriodEnd > now;
    if (active && !subscription.packageId.equals(payment.packageId)) {
      throw new AppError('Cannot change an active package', 409, 'ACTIVE_PACKAGE_CHANGE');
    }
    const limit = payment.packageSnapshot.maxTechnicians;
    if (limit != null && await countTechnicianSeats(businessId) > limit) {
      throw new AppError('The business exceeds this package technician limit', 409, 'TECHNICIAN_LIMIT_REACHED');
    }
    // Remember the payment on the subscription before marking it paid. A retry
    // after a partial write must not extend the subscription a second time.
    if (!subscription?.lastPaymentId?.equals(payment._id)) {
      const extendFrom = active ? subscription.currentPeriodEnd : now;
      const end = new Date(extendFrom);
      const day = end.getUTCDate();
      end.setUTCDate(1);
      end.setUTCMonth(end.getUTCMonth() + (payment.packageSnapshot.billingInterval === 'year' ? 12 : 1));
      const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
      end.setUTCDate(Math.min(day, lastDay));
      await BusinessSubscription.findOneAndUpdate(
        { businessId },
        { $set: {
          packageId: payment.packageId,
          packageSnapshot: payment.packageSnapshot,
          currentPeriodStart: active ? subscription.currentPeriodStart : now,
          currentPeriodEnd: end,
          lastPaymentId: payment._id,
        } },
        { upsert: true, new: true, runValidators: true },
      );
    }
    payment.status = 'paid';
    payment.paymentMethod = 'demo';
    payment.paidAt = now;
    await payment.save();
    return { payment: this.serializePayment(payment), subscription: await this.getSubscription(businessId) };
  }

  static async getPackages() {
    const plans = await Package.find({ isActive: true }).sort({ sortOrder: 1, code: 1 });
    return plans.map((plan) => ({
      id: plan.id as string,
      ...snapshotPackage(plan),
      description: plan.description,
      features: plan.features,
      isPopular: plan.isPopular,
    }));
  }

  static async getSubscription(businessId: string) {
    validateObjectId(businessId, 'Business');
    const subscription = await BusinessSubscription.findOne({ businessId });
    const occupiedTechnicianSeats = await countTechnicianSeats(businessId);
    const now = Date.now();
    const active =
      !!subscription &&
      subscription.currentPeriodStart.getTime() <= now &&
      subscription.currentPeriodEnd.getTime() > now;
    const pendingPayment = await SubscriptionPayment.findOne({
      businessId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    return {
      status: subscription ? (active ? 'active' : 'expired') : 'unpaid',
      planName: subscription?.packageSnapshot.name ?? null,
      package: subscription?.packageSnapshot ?? null,
      currentPeriodStart: subscription?.currentPeriodStart ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      daysRemaining: active
        ? Math.ceil((subscription!.currentPeriodEnd.getTime() - now) / 86400000)
        : 0,
      occupiedTechnicianSeats,
      pendingPayment: pendingPayment ? this.serializePayment(pendingPayment) : null,
    };
  }

  static serializePayment(payment: InstanceType<typeof SubscriptionPayment>) {
    return {
      id: payment.id as string,
      businessId: payment.businessId.toString(),
      reference: payment.reference,
      package: payment.packageSnapshot,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status:
        payment.status === 'pending' && payment.expiresAt.getTime() <= Date.now()
          ? 'expired'
          : payment.status,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt ?? null,
      createdAt: payment.createdAt,
    };
  }

  static async checkout(businessId: string, packageCode: string) {
    validateObjectId(businessId, 'Business');
    if (!config.subscriptionPaymentInstructions) {
      throw new AppError(
        'Subscription payment instructions have not been configured',
        503,
        'PAYMENT_NOT_CONFIGURED',
      );
    }
    const business = await Business.findOne({ _id: businessId, isActive: true });
    if (!business) throw new AppError('Active business not found', 404);

    const now = new Date();
    const plan = await Package.findOne({ code: packageCode, isActive: true });
    if (!plan) throw new AppError('Package not found', 404, 'PACKAGE_NOT_FOUND');
    const subscription = await BusinessSubscription.findOne({ businessId });
    if (
      subscription &&
      subscription.currentPeriodEnd > now &&
      subscription.packageId.toString() !== plan.id
    ) {
      throw new AppError(
        'An active subscription can only renew its current package; change packages after expiry',
        409,
        'ACTIVE_PACKAGE_CHANGE',
      );
    }
    if (
      plan.maxTechnicians != null &&
      (await countTechnicianSeats(businessId)) > plan.maxTechnicians
    ) {
      throw new AppError(
        'Reduce active technicians and pending invitations before selecting this package',
        409,
        'TECHNICIAN_LIMIT_REACHED',
      );
    }
    await SubscriptionPayment.updateMany(
      { businessId, status: 'pending', expiresAt: { $lte: now } },
      { $set: { status: 'expired' } },
    );
    const pending = await SubscriptionPayment.findOne({ businessId, status: 'pending' });
    if (pending) {
      throw new AppError('A subscription payment is already pending', 409, 'PAYMENT_PENDING');
    }
    const payment = await SubscriptionPayment.create({
      businessId,
      packageId: plan._id,
      packageSnapshot: snapshotPackage(plan),
      amount: plan.price,
      currency: plan.currency,
      paymentMethod: 'manual',
      reference: `URT-${crypto.randomUUID()}`,
      status: 'pending',
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });
    return {
      payment: this.serializePayment(payment),
      instructions: config.subscriptionPaymentInstructions,
    };
  }

  static async getPayments(businessId: string, page: number, limit: number) {
    validateObjectId(businessId, 'Business');
    const [payments, total] = await Promise.all([
      SubscriptionPayment.find({ businessId })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SubscriptionPayment.countDocuments({ businessId }),
    ]);
    return { payments: payments.map((payment) => this.serializePayment(payment)), total };
  }
}
