import { User, IUser } from '../../models/User.model.js';
import { AppError } from '../../middleware/error-handler.js';

/**
 * User Service
 * Profile get/update is the same operation as in AuthService.
 * This module retains the admin user-listing capability.
 */
export class UserService {
  /**
   * Get user profile with password field selected for accurate capability flags.
   */
  static async getProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return user;
  }

  /**
   * Update profile fields.
   * phone/address: null clears the field, undefined means not provided.
   */
  static async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      address?: string | null;
    },
  ): Promise<IUser> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
      user.email = data.email.toLowerCase();
      user.isEmailVerified = false;
    }

    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.phone !== undefined) user.phone = data.phone ?? undefined;
    if (data.address !== undefined) user.address = data.address ?? undefined;

    await user.save();
    return user;
  }

  static async getUsers(
    page = 1,
    limit: number,
    q?: string,
    role?: 'user' | 'admin',
  ): Promise<{ users: IUser[]; totalItems: number }> {
    const filter: Record<string, unknown> = {};
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { firstName: { $regex: escaped, $options: 'i' } },
        { lastName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (role) filter.role = role;

    const skip = (page - 1) * limit;

    const [users, totalItems] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1, _id: -1 }),
      User.countDocuments(filter),
    ]);

    return { users, totalItems };
  }
}
