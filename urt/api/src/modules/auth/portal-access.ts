import { Business } from '../../models/Business.model.js';
import { Customer } from '../../models/Customer.model.js';
import { Technician } from '../../models/Technician.model.js';
import type { IUser } from '../../models/User.model.js';
import { AppError } from '../../middleware/error-handler.js';

export type AuthPortal = 'owner' | 'customer' | 'technician';

export async function getAuthPortals(user: IUser): Promise<AuthPortal[]> {
  const [owner, customer, technician] = await Promise.all([
    Business.exists({ ownerId: user._id }),
    Customer.exists({ userId: user._id, status: 'active' }),
    Technician.exists({ userId: user._id, status: 'active' }),
  ]);
  const portals: AuthPortal[] = [];
  if (owner || user.registrationPortal === 'owner') portals.push('owner');
  if (customer || user.registrationPortal === 'customer') portals.push('customer');
  if (technician) portals.push('technician');
  // Historical accounts have no signup intent. Preserve onboarding until a concrete role exists.
  if (!user.registrationPortal && portals.length === 0) return ['owner', 'customer'];
  return portals;
}

export async function requireAuthPortal(user: IUser, portal: AuthPortal) {
  if (!(await getAuthPortals(user)).includes(portal)) {
    throw new AppError('Akun ini tidak memiliki akses ke portal yang dipilih.', 403, 'PORTAL_FORBIDDEN');
  }
}
