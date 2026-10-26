import { Request } from 'express';
import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { AppError } from '../../middleware/error-handler.js';

export interface DeviceInfo {
  deviceId: string;
  name: string;
  browser: string;
  os: string;
  userAgent: string;
  ip: string;
}

class DeviceService {
  generateDeviceId(req: Request): string {
    const header = req.headers['x-device-id'];

    // Count occurrences of 'x-device-id' header (case-insensitive)
    const count = req.rawHeaders.filter(
      (value, index) => index % 2 === 0 && value.toLowerCase() === 'x-device-id',
    ).length;

    // If no header is provided and this is the first request, generate a new device ID
    if (header === undefined && count === 0) {
      return crypto.randomUUID();
    }

    // If the header is provided, validate it
    if (count !== 1 || typeof header !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(header)) {
      throw new AppError('Invalid device ID', 400, 'INVALID_DEVICE_ID');
    }

    return header; // Return the valid device ID from the header
  }

  extractDeviceInfo(req: Request): DeviceInfo {
    const deviceId = this.generateDeviceId(req);
    const userAgent = (req.get('user-agent') || 'unknown').slice(0, 1024);
    const parsed = new UAParser(userAgent).getResult();
    const browser = parsed.browser.name || 'Unknown Browser';
    const os = parsed.os.name || 'Unknown OS';
    return {
      deviceId,
      name: `${browser} on ${os}`,
      browser,
      os,
      userAgent,
      ip: req.ip || 'unknown',
    };
  }
}

export const deviceService = new DeviceService();
