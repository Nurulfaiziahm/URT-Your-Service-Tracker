import redisClient from './client.js';
import { config } from '../../core/config/index.js';
import { DeviceInfo } from '../device/device.service.js';

export interface RefreshGeneration {
  hash: string;
  jti: string;
  iat: number;
  exp: number;
  kid: string;
  signingVersion: string;
}

export interface AuthSessionRecord {
  deviceId: string;
  sid: string;
  authVersion: number;
  currentRefresh: RefreshGeneration;
  previousRefresh?: { hash: string; validUntil: number };
  createdAt: number;
  lastRefreshAt: number;
  expiresAt: number;
  absoluteExpiresAt: number;
  device: Omit<DeviceInfo, 'deviceId'>;
}

// Every mutation and expiry cleanup compares the exact record it read.
// Redis executes the script atomically, including TTL maintenance.
const writeScript = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
if ARGV[2] ~= '*' and current ~= ARGV[2] then return 0 end
if ARGV[3] == '' then
  redis.call('HDEL', KEYS[1], ARGV[1])
  return 1
end
if ARGV[2] ~= '*' then
  local record = cjson.decode(current)
  if record.expiresAt <= tonumber(ARGV[5]) or record.absoluteExpiresAt <= tonumber(ARGV[5]) then return 0 end
end
if ARGV[6] == '1' then redis.call('DEL', KEYS[1]) end
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
local ttl = redis.call('TTL', KEYS[1])
if ttl < tonumber(ARGV[4]) - tonumber(ARGV[5]) then
  redis.call('EXPIREAT', KEYS[1], ARGV[4])
end
return 1
`;

class AuthSessionStore {
  key(userId: string): string {
    return `${config.auth.namespace}:{${userId}}`;
  }

  async get(userId: string, deviceId: string): Promise<AuthSessionRecord | null> {
    const raw = await redisClient.hget(this.key(userId), deviceId);
    if (!raw) {
      return null;
    }
    const record = JSON.parse(raw) as AuthSessionRecord;
    const now = Math.floor(Date.now() / 1000);
    if (record.expiresAt <= now || record.absoluteExpiresAt <= now) {
      await this.remove(userId, record);
      return null;
    }
    return record;
  }

  async write(
    userId: string,
    record: AuthSessionRecord,
    expected?: AuthSessionRecord,
    revokeOthers = false,
  ): Promise<boolean> {
    return (
      Number(
        await redisClient.eval(
          writeScript,
          1,
          this.key(userId),
          record.deviceId,
          expected ? JSON.stringify(expected) : '*',
          JSON.stringify(record),
          record.expiresAt,
          Math.floor(Date.now() / 1000),
          revokeOthers ? '1' : '0',
        ),
      ) === 1
    );
  }

  async remove(userId: string, expected: AuthSessionRecord): Promise<boolean> {
    return (
      Number(
        await redisClient.eval(
          writeScript,
          1,
          this.key(userId),
          expected.deviceId,
          JSON.stringify(expected),
          '',
          0,
          0,
          '0',
        ),
      ) === 1
    );
  }

  // Compare sid atomically: a slow revocation must never delete a replacement login.
  async revoke(userId: string, deviceId: string, sid: string): Promise<boolean> {
    return (
      Number(
        await redisClient.eval(
          `
      local raw = redis.call('HGET', KEYS[1], ARGV[1])
      if not raw or cjson.decode(raw).sid ~= ARGV[2] then return 0 end
      return redis.call('HDEL', KEYS[1], ARGV[1])
    `,
          1,
          this.key(userId),
          deviceId,
          sid,
        ),
      ) === 1
    );
  }

  async list(userId: string): Promise<AuthSessionRecord[]> {
    const values = await redisClient.hvals(this.key(userId));
    const records: AuthSessionRecord[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (const value of values) {
      const record = JSON.parse(value) as AuthSessionRecord;
      if (record.expiresAt <= now || record.absoluteExpiresAt <= now) {
        await this.remove(userId, record);
      } else {
        records.push(record);
      }
    }
    return records;
  }

  async revokeAll(userId: string): Promise<number> {
    return Number(
      await redisClient.eval(
        `
      local count = redis.call('HLEN', KEYS[1])
      redis.call('DEL', KEYS[1])
      return count
    `,
        1,
        this.key(userId),
      ),
    );
  }
}

export const authSessionStore = new AuthSessionStore();
