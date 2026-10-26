import redisClient from './client.js';

/**
 * OTP Store Prefix Configuration
 */
interface OtpPrefix {
  EMAIL: string;
  PHONE: string;
  RESET: string;
  RESET_TOKEN: string;
}

/**
 * OTP Store
 * Manages OTPs and Reset Tokens in Redis
 */
class OtpStore {
  private readonly PREFIX: OtpPrefix = {
    EMAIL: 'auth:otp:email',
    PHONE: 'auth:otp:phone',
    RESET: 'auth:otp:reset',
    RESET_TOKEN: 'auth:token:reset',
  };

  private readonly OTP_TTL = 300; // 5 minutes
  private readonly RESET_TOKEN_TTL = 900; // 15 minutes

  // ==================== EMAIL OTP ====================

  async setEmailOtp(email: string, otp: string): Promise<void> {
    const key = `${this.PREFIX.EMAIL}:${email}`;
    await redisClient.setex(key, this.OTP_TTL, otp);
  }

  async getEmailOtp(email: string): Promise<string | null> {
    const key = `${this.PREFIX.EMAIL}:${email}`;
    return await redisClient.get(key);
  }

  async getEmailOtpTTL(email: string): Promise<number> {
    const key = `${this.PREFIX.EMAIL}:${email}`;
    return await redisClient.ttl(key);
  }

  async deleteEmailOtp(email: string): Promise<void> {
    const key = `${this.PREFIX.EMAIL}:${email}`;
    await redisClient.del(key);
  }

  // ==================== PHONE OTP ====================

  async setPhoneOtp(phone: string, otp: string): Promise<void> {
    const key = `${this.PREFIX.PHONE}:${phone}`;
    await redisClient.setex(key, this.OTP_TTL, otp);
  }

  async getPhoneOtp(phone: string): Promise<string | null> {
    const key = `${this.PREFIX.PHONE}:${phone}`;
    return await redisClient.get(key);
  }

  async deletePhoneOtp(phone: string): Promise<void> {
    const key = `${this.PREFIX.PHONE}:${phone}`;
    await redisClient.del(key);
  }

  // ==================== RESET PASSWORD OTP ====================

  async setResetOtp(email: string, otp: string): Promise<void> {
    const key = `${this.PREFIX.RESET}:${email}`;
    await redisClient.setex(key, this.OTP_TTL, otp);
  }

  async getResetOtp(email: string): Promise<string | null> {
    const key = `${this.PREFIX.RESET}:${email}`;
    return await redisClient.get(key);
  }

  async getResetOtpTTL(email: string): Promise<number> {
    const key = `${this.PREFIX.RESET}:${email}`;
    return await redisClient.ttl(key);
  }

  async deleteResetOtp(email: string): Promise<void> {
    const key = `${this.PREFIX.RESET}:${email}`;
    await redisClient.del(key);
  }

  // ==================== RESET PASSWORD TOKEN ====================

  async setResetToken(token: string, email: string): Promise<void> {
    const key = `${this.PREFIX.RESET_TOKEN}:${token}`;
    await redisClient.setex(key, this.RESET_TOKEN_TTL, email);
  }

  async getEmailByResetToken(token: string): Promise<string | null> {
    const key = `${this.PREFIX.RESET_TOKEN}:${token}`;
    return await redisClient.get(key);
  }

  async deleteResetToken(token: string): Promise<void> {
    const key = `${this.PREFIX.RESET_TOKEN}:${token}`;
    await redisClient.del(key);
  }
}

export const otpStore = new OtpStore();
