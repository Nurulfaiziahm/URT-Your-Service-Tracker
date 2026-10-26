import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './index.js';

// Bypass the failing local DNS resolver used by Node for Atlas SRV lookups.
dns.setServers(['1.1.1.1', '8.8.8.8']);

interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cache: ConnectionCache = { conn: null, promise: null };

/**
 * Connect to MongoDB using a cached connection.
 *
 * Points at the dedicated demo database ('urt_demo').
 * bufferCommands is disabled so operations fail fast before the connection
 * is established rather than silently queuing.
 *
 * A rejected promise is reset so a subsequent deliberate attempt can reconnect.
 */
export const connectDatabase = async (): Promise<void> => {
  if (cache.conn) return;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(config.mongoUri, {
        dbName: 'urt_demo',
        bufferCommands: false,
      })
      .then((m) => {
        console.log(`✅ MongoDB Connected: ${m.connection.host} / ${m.connection.name}`);
        return m;
      })
      .catch((error) => {
        console.error('❌ Database connection failed', {
          name: error instanceof Error ? error.name : 'Error',
        });
        cache.promise = null; // Reset so a retry can attempt a fresh connect
        throw error;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch {
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB gracefully.
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    cache.conn = null;
    cache.promise = null;
    console.log('✅ MongoDB disconnected gracefully');
  } catch (error) {
    console.error('❌ MongoDB disconnect failed', {
      name: error instanceof Error ? error.name : 'Error',
    });
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error', { name: err.name });
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});
