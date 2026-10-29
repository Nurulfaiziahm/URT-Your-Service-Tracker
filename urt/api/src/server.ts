import http from 'http';
import app from './app.js';
import { config } from './core/config/index.js';
import { connectDatabase, disconnectDatabase } from './core/config/database.js';
import { connectRedis, disconnectRedis } from './lib/redis/index.js';
import { logger } from './utils/index.js';
import { passwordRecovery } from './modules/auth/password-recovery.service.js';

const PORT = Number(config.port);
let server: http.Server;

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`🛑 ${signal} received. Shutting down...`);

  const forceExit = setTimeout(() => process.exit(1), 10000);

  try {
    server?.close();
    await passwordRecovery.waitForDeliveries();
    await disconnectRedis();
    await disconnectDatabase();
    clearTimeout(forceExit);
    process.exit(0);
  } catch {
    process.exit(1);
  }
};

const startServer = async (): Promise<void> => {
  try {
    await connectRedis();
    await connectDatabase();

    server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} [${config.nodeEnv}]`);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      logger.error(`❌ Server error: ${err.message}`);
      process.exit(1);
    });

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
      logger.error('❌ Uncaught Exception', { name: err.name });
      gracefulShutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('❌ Unhandled Rejection', {
        name: reason instanceof Error ? reason.name : 'Error',
      });
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error('❌ Startup failed', { name: error instanceof Error ? error.name : 'Error' });
    process.exit(1);
  }
};

startServer();
