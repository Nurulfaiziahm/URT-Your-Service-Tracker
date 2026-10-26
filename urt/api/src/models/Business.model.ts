import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Business Document Interface
 * Represents an owner's repair shop / business in URT.
 */
export interface IBusiness extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  businessHours?: string;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IBusinessModel = Model<IBusiness>;

const businessSchema = new Schema<IBusiness>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Business slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Slug cannot exceed 50 characters'],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must consist of lowercase alphanumeric words separated by single hyphens'],
      index: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid contact email format'],
    },
    businessHours: {
      type: String,
      trim: true,
      maxlength: [100, 'Business hours cannot exceed 100 characters'],
    },
    timezone: {
      type: String,
      required: [true, 'Timezone is required'],
      default: 'Asia/Jakarta',
      trim: true,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'IDR',
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  },
);

export const Business = (mongoose.models.Business as IBusinessModel) || mongoose.model<IBusiness, IBusinessModel>('Business', businessSchema);
