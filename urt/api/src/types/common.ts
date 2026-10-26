import { IUser } from '../models/User.model.js';

/**
 * Domain constants established in Phase 0.
 *
 * Global identity uses 'user' | 'admin' only.
 * Business portal access (owner / technician / customer) comes from concrete
 * business relationships stored in their own collections — not from this role.
 *
 * Money: IDR amounts use whole rupiah (safe non-negative integers).
 * Timezone: each Business document supplies its own IANA timezone string.
 * Ticket status 'completed' means the repair is ready for pickup.
 * Handover (actual device collection) is recorded separately after completion.
 */

// ─── Safe profile response ───────────────────────────────────────────────────

/**
 * Fields returned for every profile/auth response.
 * Never includes password hash, googleId, or authVersion.
 */
export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  /** true when a bcrypt password hash is stored for this account */
  hasPassword: boolean;
  /**
   * true when the caller can use the change-password endpoint.
   * Derived server-side; Google-only accounts return false.
   */
  canChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serialize a user document into the safe profile response.
 *
 * Requires the document to have been fetched with `+password` selected
 * so that `hasPassword` is accurate. When fetched without `+password`,
 * the field is `undefined` (not `null`), which means we cannot confirm
 * the account has no password — only that it was not selected.
 *
 * Pass `passwordSelected: true` only when the query explicitly included
 * `.select('+password')`.
 */
export const formatUserResponse = (
  user: IUser,
  passwordSelected = false,
): UserResponse => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  ...(user.phone !== undefined && { phone: user.phone }),
  ...(user.address !== undefined && { address: user.address }),
  role: user.role,
  status: user.status,
  isEmailVerified: user.isEmailVerified,
  hasPassword: passwordSelected ? Boolean(user.password) : Boolean(user.password),
  canChangePassword: Boolean(user.password),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
