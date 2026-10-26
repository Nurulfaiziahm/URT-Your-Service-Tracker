import crypto from 'crypto';

/**
 * Generate unique S3-like key for uploaded files
 * Format: {prefix}_{16 hex characters}
 */
export const generateFileKey = (category: 'images' | 'documents'): string => {
  const prefix = category === 'images' ? 'img' : 'doc';
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${randomBytes}`;
};

/**
 * Validate file key format
 */
export const isValidFileKey = (key: string): boolean => {
  const keyPattern = /^(img|doc)_[a-f0-9]{16}$/;
  return keyPattern.test(key);
};
