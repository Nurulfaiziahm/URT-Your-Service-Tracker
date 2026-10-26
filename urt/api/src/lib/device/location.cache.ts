import redisClient from '../redis/client.js';
import { logger } from '../../utils/logger.js';

/**
 * Location data from IP geolocation API
 */
export interface LocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
  status: 'success' | 'fail';
  message?: string;
  cached?: boolean;
  cachedAt?: Date;
}

/**
 * Location Cache
 * Caches IP geolocation data in Redis to reduce external API calls
 */
class LocationCache {
  private readonly PREFIX = 'geo:location';
  private readonly DEFAULT_TTL = 2592000; // 30 days
  private readonly ERROR_TTL = 3600; // 1 hour for failed lookups

  /**
   * Build Redis key for IP
   */
  private buildKey(ip: string): string {
    return `${this.PREFIX}:${ip}`;
  }

  /**
   * Get cached location for IP
   */
  async get(ip: string): Promise<LocationData | null> {
    try {
      const key = this.buildKey(ip);
      const value = await redisClient.get(key);

      if (!value) {
        return null;
      }

      const data = JSON.parse(value) as LocationData;
      data.cached = true;
      return data;
    } catch (error) {
      logger.error(`Failed to get cached location for IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * Set location cache for IP
   */
  async set(ip: string, locationData: LocationData, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const key = this.buildKey(ip);
      const data = {
        ...locationData,
        cachedAt: new Date(),
      };
      await redisClient.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cached location for IP ${ip}`);
    } catch (error) {
      logger.error(`Failed to cache location for IP ${ip}:`, error);
    }
  }

  /**
   * Cache successful location lookup
   */
  async cacheSuccess(ip: string, locationData: LocationData): Promise<void> {
    await this.set(ip, locationData, this.DEFAULT_TTL);
  }

  /**
   * Cache failed location lookup with shorter TTL
   */
  async cacheFailed(ip: string, defaultData: LocationData): Promise<void> {
    await this.set(ip, defaultData, this.ERROR_TTL);
  }

  /**
   * Clear cached location for IP
   */
  async clear(ip: string): Promise<boolean> {
    try {
      const key = this.buildKey(ip);
      const result = await redisClient.del(key);
      return result === 1;
    } catch (error) {
      logger.error(`Failed to clear location cache for IP ${ip}:`, error);
      return false;
    }
  }

  /**
   * Get bulk locations for multiple IPs
   */
  async getBulk(ips: string[]): Promise<Record<string, LocationData | null>> {
    const results: Record<string, LocationData | null> = {};

    try {
      const pipeline = redisClient.pipeline();
      ips.forEach((ip: string) => {
        pipeline.get(this.buildKey(ip));
      });

      const pipelineResults = await pipeline.exec();

      ips.forEach((ip: string, index: number) => {
        const [err, value] = pipelineResults?.[index] || [null, null];
        if (!err && value) {
          const data = JSON.parse(value as string) as LocationData;
          data.cached = true;
          results[ip] = data;
        } else {
          results[ip] = null;
        }
      });
    } catch (error) {
      logger.error('Failed to get bulk locations:', error);
      ips.forEach((ip: string) => {
        results[ip] = null;
      });
    }

    return results;
  }
}

export const locationCache = new LocationCache();
