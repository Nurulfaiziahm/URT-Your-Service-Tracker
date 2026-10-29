import redisClient from './client.js';
import crypto from 'node:crypto';
import { config } from '../../core/config/index.js';

export interface PasswordResetGrant {
  userId: string;
  email: string;
  portal: 'owner' | 'customer' | 'technician';
  authVersion: number;
}
const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const resetPrefix = `${config.prefix}:password-reset:`;

// Keep the existing prefixes so account locks and reset links survive cutover.
class AccountSecurityStore {
  async createPasswordReset(grant: PasswordResetGrant, token: string, code: string): Promise<boolean> {
    const currentKey = `${resetPrefix}current:${grant.portal}:${digest(grant.email)}`;
    const now = Math.floor(Date.now() / 1000);
    const record = { ...grant, currentKey, requestedAt: now, codeExpiresAt: now + 300, codeHash: digest(code), attempts: 0 };
    return Number(await redisClient.eval(`
      local previous = redis.call('GET', KEYS[1])
      if previous then
        local value = redis.call('GET', ARGV[4] .. previous)
        if value and tonumber(ARGV[3]) - cjson.decode(value).requestedAt < 60 then return 0 end
        redis.call('DEL', ARGV[4] .. previous)
      end
      redis.call('SET', KEYS[2], ARGV[1], 'EX', 900)
      redis.call('SET', KEYS[1], ARGV[2], 'EX', 900)
      return 1
    `, 2, currentKey, `${resetPrefix}grant:${digest(token)}`, JSON.stringify(record), digest(token), now, `${resetPrefix}grant:`)) === 1;
  }

  async exchangePasswordResetCode(email: string, portal: PasswordResetGrant['portal'], code: string, newToken: string): Promise<boolean> {
    const currentKey = `${resetPrefix}current:${portal}:${digest(email)}`;
    return Number(await redisClient.eval(`
      local hash = redis.call('GET', KEYS[1])
      if not hash then return 0 end
      local key = ARGV[1] .. hash
      local value = redis.call('GET', key)
      if not value then return 0 end
      local record = cjson.decode(value)
      if not record.codeHash or record.codeExpiresAt <= tonumber(ARGV[4]) then return 0 end
      if record.codeHash ~= ARGV[2] then
        record.attempts = record.attempts + 1
        if record.attempts >= 5 then redis.call('DEL', key, KEYS[1])
        else
          local remaining = redis.call('TTL', key)
          if remaining > 0 then redis.call('SET', key, cjson.encode(record), 'EX', remaining) end
        end
        return 0
      end
      local ttl = redis.call('TTL', key)
      if ttl <= 0 then return 0 end
      record.codeHash = nil
      redis.call('DEL', key)
      redis.call('SET', ARGV[1] .. ARGV[3], cjson.encode(record), 'EX', ttl)
      redis.call('SET', KEYS[1], ARGV[3], 'EX', ttl)
      return 1
    `, 1, currentKey, `${resetPrefix}grant:`, digest(code), digest(newToken), Math.floor(Date.now() / 1000))) === 1;
  }

  async consumePasswordReset(token: string, portal: PasswordResetGrant['portal']): Promise<PasswordResetGrant | null> {
    const hash = digest(token);
    const value = await redisClient.eval(`
      local value = redis.call('GET', KEYS[1])
      if not value then return nil end
      local record = cjson.decode(value)
      if record.portal ~= ARGV[1] then return nil end
      if redis.call('GET', record.currentKey) ~= ARGV[2] then return nil end
      redis.call('DEL', KEYS[1], record.currentKey)
      return value
    `, 1, `${resetPrefix}grant:${hash}`, portal, hash);
    return typeof value === 'string' ? JSON.parse(value) as PasswordResetGrant : null;
  }

  async discardPasswordReset(token: string): Promise<void> {
    const hash = digest(token);
    await redisClient.eval(`
      local value = redis.call('GET', KEYS[1])
      if value then
        local record = cjson.decode(value)
        if redis.call('GET', record.currentKey) == ARGV[1] then redis.call('DEL', record.currentKey) end
        redis.call('DEL', KEYS[1])
      end
      return 1
    `, 1, `${resetPrefix}grant:${hash}`, hash);
  }
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
