import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Common IANA timezone validation helper
const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const createBusinessSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Business name is required').max(100, 'Max 100 characters'),
      slug: z
        .string()
        .trim()
        .toLowerCase()
        .min(2, 'Slug must be at least 2 characters')
        .max(50, 'Max 50 characters')
        .regex(slugRegex, 'Slug must be lowercase alphanumeric with single hyphens'),
      address: z.string().trim().max(200, 'Max 200 characters').optional(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      contactEmail: z.string().trim().email('Invalid contact email format').optional(),
      businessHours: z.string().trim().max(100, 'Max 100 characters').optional(),
      timezone: z
        .string()
        .trim()
        .refine(isValidTimezone, { message: 'Invalid IANA timezone' })
        .default('Asia/Jakarta'),
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .min(3)
        .max(5)
        .default('IDR'),
    })
    .strict(),
});

export const updateBusinessSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Business name is required').max(100, 'Max 100 characters').optional(),
      address: z.string().trim().max(200, 'Max 200 characters').optional(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      contactEmail: z.string().trim().email('Invalid contact email format').optional(),
      businessHours: z.string().trim().max(100, 'Max 100 characters').optional(),
      timezone: z
        .string()
        .trim()
        .refine(isValidTimezone, { message: 'Invalid IANA timezone' })
        .optional(),
      currency: z
        .string()
        .trim()
        .toUpperCase()
        .min(3)
        .max(5)
        .optional(),
    })
    .strict(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>['body'];
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>['body'];
