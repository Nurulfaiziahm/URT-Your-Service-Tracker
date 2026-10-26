import mongoose, { Document, Schema } from 'mongoose';

/**
 * File Upload Document Interface
 */
export interface IFile extends Document {
  key: string; // Unique S3-like key (e.g., "img_a1b2c3d4e5f6")
  originalName: string;
  objectKey: string;
  category: 'images' | 'documents';
  mimeType: string;
  size: number;
  referenceCount: number;
  deleting: boolean;
  uploadedBy: mongoose.Types.ObjectId;
  businessId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<IFile>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    objectKey: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['images', 'documents'],
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    referenceCount: { type: Number, default: 0, min: 0 },
    deleting: { type: Boolean, default: false },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index for efficient queries
fileSchema.index({ uploadedBy: 1, category: 1 });
fileSchema.index({ businessId: 1, key: 1 });

export const File = mongoose.model<IFile>('File', fileSchema);
