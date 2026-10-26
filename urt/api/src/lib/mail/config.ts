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
    console.error('❌ SMTP connection failed:', error);
    return false;
  }
};
