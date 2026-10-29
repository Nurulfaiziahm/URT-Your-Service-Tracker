import crypto from 'node:crypto';
import { User } from '../../models/User.model.js';
import { accountSecurityStore, authSessionStore } from '../../lib/redis/index.js';
import { mailService } from '../../lib/mail/index.js';
import { AppError } from '../../middleware/error-handler.js';
import { config } from '../../core/config/index.js';
import { logger } from '../../utils/logger.js';
import { getAuthPortals, type AuthPortal } from './portal-access.js';

const invalidReset = () => new AppError('Kode atau tautan pemulihan tidak valid atau sudah kedaluwarsa.', 400, 'INVALID_RESET');
const pendingDeliveries = new Set<Promise<void>>();

export const passwordRecovery = {
  async request(email: string, portal: AuthPortal): Promise<void> {
    // Check mail infrastructure for every address, so configuration failures do not enumerate accounts.
    if (!(await mailService.available())) throw new AppError('Email pemulihan sedang tidak tersedia. Coba lagi nanti.', 503, 'MAIL_UNAVAILABLE');
    // Defer account-specific work so SMTP delivery time cannot disclose whether the address exists.
    const delivery = this.deliver(email, portal).catch(() => {
      logger.error('Password recovery processing failed', { portal });
    }).finally(() => { pendingDeliveries.delete(delivery); });
    pendingDeliveries.add(delivery);
  },

  async waitForDeliveries(): Promise<void> {
    await Promise.allSettled([...pendingDeliveries]);
  },

  async deliver(email: string, portal: AuthPortal): Promise<void> {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user?.password || user.status !== 'active' || !(await getAuthPortals(user)).includes(portal)) return;
    const token = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(100000, 1000000).toString();
    logger.info(`[OTP] Password reset OTP for ${user.email}: ${code}`);
    const created = await accountSecurityStore.createPasswordReset({
      userId: user._id.toString(), email: user.email, portal, authVersion: user.authVersion ?? 0,
    }, token, code);
    if (!created) return; // Same public response for cooldown, unknown email, or unsupported role.
    const resetUrl = `${config.allowedOrigins[0]}/${portal}/reset-password#token=${token}`;
    const sent = await mailService.sendTemplate({
      to: user.email, subject: 'Kode & Tautan Pemulihan Akun URT', template: 'reset-password',
      data: { title: 'Atur Ulang Kata Sandi', name: `${user.firstName} ${user.lastName}`, otp: code,
        resetUrl, portalLabel: { owner: 'Pemilik Usaha', customer: 'Pelanggan', technician: 'Teknisi' }[portal], expiresIn: '5 menit', linkExpiresIn: '15 menit' },
    });
    if (!sent) {
      await accountSecurityStore.discardPasswordReset(token);
      logger.error('Password recovery delivery failed', { portal });
      // Keep the response identical for existing/nonexistent addresses; never claim delivery here.
    }
  },

  async verifyCode(email: string, code: string, portal: AuthPortal): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    if (!(await accountSecurityStore.exchangePasswordResetCode(email.trim().toLowerCase(), portal, code, token))) throw invalidReset();
    return token;
  },

  async reset(token: string, password: string, portal: AuthPortal): Promise<void> {
    const grant = await accountSecurityStore.consumePasswordReset(token, portal);
    if (!grant) throw invalidReset();
    const user = await User.findById(grant.userId).select('+password');
    if (!user?.password || user.status !== 'active' || (user.authVersion ?? 0) !== grant.authVersion || !(await getAuthPortals(user)).includes(portal)) throw invalidReset();
    user.password = password;
    await user.save(); // Existing password hashing and authVersion increment remain authoritative.
    await authSessionStore.revokeAll(user._id.toString());
    logger.info('Password recovery completed', { portal });
  },
};
