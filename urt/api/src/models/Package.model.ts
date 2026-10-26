import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPackage extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description: string;
  price: number;
  currency: 'IDR';
  billingInterval: 'month' | 'year';
  features: string[];
  maxTechnicians: number | null;
  includesInventory: boolean;
  includesPrioritySupport: boolean;
  includesFinancialExport: boolean;
  includesBrandedReceipts: boolean;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema<IPackage>(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // Whole rupiah, charged once per billing interval.
    price: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    currency: { type: String, enum: ['IDR'], required: true, default: 'IDR' },
    billingInterval: { type: String, enum: ['month', 'year'], required: true },
    features: { type: [String], required: true },
    // null means unlimited. Tickets are unlimited in both current packages.
    maxTechnicians: {
      type: Number,
      default: null,
      min: 1,
      validate: (value: number | null) => value === null || Number.isSafeInteger(value),
    },
    includesInventory: { type: Boolean, default: false },
    includesPrioritySupport: { type: Boolean, default: false },
    includesFinancialExport: { type: Boolean, default: false },
    includesBrandedReceipts: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Package =
  (mongoose.models.Package as Model<IPackage>) || mongoose.model<IPackage>('Package', packageSchema);
