import { z } from 'zod';
import { numericString } from '../../schemas/common.schema.js';

/**
 * User Validation Schemas using Zod
 * All schemas wrap body/query/params for consistent validation
 */

// ============ Reusable Field Validators ============

const nameField = (field: string) =>
  z
    .string()
    .min(2, `${field} must be at least 2 characters`)
    .max(50, `${field} cannot exceed 50 characters`)
    .trim();

const emailField = z.string().email('Invalid email address').toLowerCase().trim();

// ============ Profile Schemas ============

const updateUserBodySchema = z
  .object({
    firstName: nameField('First name').optional(),
    lastName: nameField('Last name').optional(),
    email: emailField.optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
      .nullish(),
    address: z
      .string()
      .trim()
      .max(200, 'Address cannot exceed 200 characters')
      .nullish(),
  })
  .strict();

export const updateUserSchema = z.object({
  body: updateUserBodySchema,
});

const getUsersQuery = z.object({
  page: numericString.optional(),
  limit: numericString.optional(),
  q: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
});

export const getUsersSchema = z.object({
  query: getUsersQuery,
});

// ============ Type Exports ============

export type UpdateUserInput = z.infer<typeof updateUserBodySchema>;
export type GetUsersQueryInput = z.infer<typeof getUsersQuery>;
