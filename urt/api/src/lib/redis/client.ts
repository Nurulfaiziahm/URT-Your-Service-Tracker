import { Redis } from 'ioredis';
import { config } from '../../core/config/index.js';

const redisClient = new Redis(config.redisUri, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  commandTimeout: 3000,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

export const connectRedis = async (): Promise<void> => {
  await redisClient.connect();
  console.log('Redis connected');
};
redisClient.on('error', () => console.error('Redis connection unavailable'));

export const disconnectRedis = async (): Promise<void> => {
  redisClient.disconnect();
};

export default redisClient;
