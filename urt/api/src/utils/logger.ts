/**
 * Simple Logger Utility
 * Can be extended with Winston/Pino for production
 */
const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const formatMessage = (level: LogLevel, message: string, ...args: unknown[]): void => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'debug':
      if (isDev) console.debug(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'error':
      console.error(prefix, message, ...args);
      break;
  }
};

export const logger = {
  debug: (message: string, ...args: unknown[]) => formatMessage('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => formatMessage('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => formatMessage('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => formatMessage('error', message, ...args),
};
