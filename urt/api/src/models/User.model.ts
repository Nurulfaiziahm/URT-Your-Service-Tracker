import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Document Interface
 * Note: Login attempts, account locking, and refresh tokens are handled by Redis
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  googleId?: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  authVersion: number;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User Model Interface (for statics)
 */
export interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
}

const userSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [
        function (this: IUser) {
          return !this.googleId;
        },
        'Please provide a last name',
      ],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [
        function (this: IUser) {
          return !this.googleId;
        },
        'Please provide a password',
      ],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+[1-9]\d{1,14}$/, 'Invalid phone number format'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      index: true,
      default: 'active',
    },
    authVersion: { type: Number, default: 0, min: 0 },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    if (!this.isNew) this.authVersion = (this.authVersion ?? 0) + 1;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Static method to find user by email
 */
userSchema.statics.findByEmail = async function (email: string): Promise<IUser | null> {
  return this.findOne({ email }).select('+password');
};

export const User = mongoose.model<IUser, IUserModel>('User', userSchema);
