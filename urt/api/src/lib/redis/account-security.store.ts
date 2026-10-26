import redisClient from './client.js';

// Keep the existing prefixes so account locks and reset links survive cutover.
class AccountSecurityStore {
  async incrementLoginAttempts(userId: string): Promise<number> {
    return Number(
      await redisClient.eval(
        `
      local attempts = redis.call('INCR', KEYS[1])
      if attempts == 1 then redis.call('EXPIRE', KEYS[1], 900) end
      return attempts
    `,
        1,
        `auth:login:attempts:${userId}`,
      ),
    );
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    await redisClient.del(`auth:login:attempts:${userId}`);
  }

  async lockAccount(userId: string, minutes = 30): Promise<void> {
    await redisClient.setex(
      `auth:account:lock:${userId}`,
      minutes * 60,
      new Date(Date.now() + minutes * 60000).toISOString(),
    );
  }

  async isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const value = await redisClient.get(`auth:account:lock:${userId}`);
    return value ? { locked: true, lockedUntil: new Date(value) } : { locked: false };
  }

  async storeResetToken(email: string, resetToken: string): Promise<void> {
    await redisClient.setex(`auth:token:reset:${resetToken}`, 900, email);
  }

  async getEmailByResetToken(token: string): Promise<string | null> {
    return redisClient.get(`auth:token:reset:${token}`);
  }

  async deleteResetToken(token: string): Promise<void> {
    await redisClient.del(`auth:token:reset:${token}`);
  }
}

export const accountSecurityStore = new AccountSecurityStore();
