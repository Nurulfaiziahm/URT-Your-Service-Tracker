import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Customer Document Interface
 * Represents a business contact / customer in URT.
 * May be a manual walk-in contact or linked to a registered User.
 */
export interface ICustomer extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'archived';
  invitationTokenHash?: string;
  invitationExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ICustomerModel = Model<ICustomer>;

const customerSchema = new Schema<ICustomer>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: undefined,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid customer email format'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    invitationTokenHash: {
      type: String,
      select: false,
    },
    invitationExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
// Partial unique index: enforce that a user is linked to at most one customer per business,
// only when userId is present, allowing multiple unlinked customer records with no userId.
customerSchema.index(
  { businessId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
customerSchema.index({ businessId: 1, status: 1 });
customerSchema.index({ businessId: 1, name: 1 });
customerSchema.index({ businessId: 1, email: 1 });

export const Customer = (mongoose.models.Customer as ICustomerModel) || mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);
