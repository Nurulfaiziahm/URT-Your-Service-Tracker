import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Technician Document Interface
 * Represents a technician associated with a repair business.
 * May be in 'pending' status awaiting invitation acceptance, 'active', or 'inactive'.
 */
export interface ITechnician extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  specializations: string[];
  status: 'pending' | 'active' | 'inactive';
  invitationTokenHash?: string;
  invitationExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ITechnicianModel = Model<ITechnician>;

const technicianSchema = new Schema<ITechnician>(
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
      required: [true, 'Technician name is required'],
      trim: true,
      maxlength: [100, 'Technician name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Technician email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid technician email format'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    specializations: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive'],
      default: 'pending',
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
    // Include Mongoose's string id getter for frontend routes and API consumers.
    toJSON: { virtuals: true },
  },
);

// Indexes
// Partial unique index: enforce that a user is linked to at most one technician record per business
// only when userId is present, so pending records without userId never collide.
technicianSchema.index(
  { businessId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
// Unique index per business + email so duplicate invitations/records aren't created for the same email
technicianSchema.index({ businessId: 1, email: 1 }, { unique: true });
technicianSchema.index({ businessId: 1, status: 1 });

export const Technician = (mongoose.models.Technician as ITechnicianModel) || mongoose.model<ITechnician, ITechnicianModel>('Technician', technicianSchema);
