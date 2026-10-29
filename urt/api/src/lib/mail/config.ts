import nodemailer from 'nodemailer';
import { config } from '../../core/config/index.js';

/**
 * Nodemailer Transporter
 * Centralized email transport configuration
 */
export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

/**
 * Verify SMTP connection
 */
export const verifyConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    const failure = error as { code?: string; responseCode?: number };
    console.error('SMTP connection failed', { code: failure.code, responseCode: failure.responseCode });
    return false;
  }
};
