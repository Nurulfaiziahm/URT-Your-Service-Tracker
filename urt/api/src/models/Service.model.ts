import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Service Document Interface
 * Represents a repair service in a business's service catalog.
 */
export interface IService extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  estimatedDuration?: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export type IServiceModel = Model<IService>;

const serviceSchema = new Schema<IService>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Base price must be a whole integer amount (IDR rupiah)',
      },
    },
    estimatedDuration: {
      type: String,
      trim: true,
      maxlength: [50, 'Estimated duration cannot exceed 50 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

serviceSchema.index({ businessId: 1, status: 1 });
serviceSchema.index({ businessId: 1, name: 1 });

export const Service = (mongoose.models.Service as IServiceModel) || mongoose.model<IService, IServiceModel>('Service', serviceSchema);
