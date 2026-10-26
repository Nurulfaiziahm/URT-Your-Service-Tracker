import mongoose, { Schema } from 'mongoose';
import { packageSnapshotSchema } from './BusinessSubscription.model.js';

const subscriptionPaymentSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  packageSnapshot: { type: packageSnapshotSchema, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['IDR'], required: true },
  paymentMethod: { type: String, required: true },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'expired'], default: 'pending', required: true },
  expiresAt: { type: Date, required: true },
  paidAt: { type: Date },
}, { timestamps: true });

subscriptionPaymentSchema.index(
  { businessId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

export const SubscriptionPayment = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
