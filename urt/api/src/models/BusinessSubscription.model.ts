import mongoose, { Schema } from 'mongoose';

// A purchase keeps its price and entitlements when the catalog changes.
export const packageSnapshotSchema = new Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: ['IDR'], required: true },
  billingInterval: { type: String, enum: ['month', 'year'], required: true },
  maxTechnicians: { type: Number, default: null, min: 1 },
  includesInventory: { type: Boolean, required: true },
  includesPrioritySupport: { type: Boolean, required: true },
  includesFinancialExport: { type: Boolean, required: true },
  includesBrandedReceipts: { type: Boolean, required: true },
}, { _id: false });

export type PackageSnapshot = mongoose.InferSchemaType<typeof packageSnapshotSchema>;

const businessSubscriptionSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true, unique: true },
  packageId: { type: Schema.Types.ObjectId, ref: 'Package', required: true },
  packageSnapshot: { type: packageSnapshotSchema, required: true },
  currentPeriodStart: { type: Date, required: true },
  currentPeriodEnd: { type: Date, required: true },
  lastPaymentId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPayment' },
  // Effective status is calculated from the dates, never from a scheduler.
}, { timestamps: true });

export const BusinessSubscription = mongoose.model('BusinessSubscription', businessSubscriptionSchema);
