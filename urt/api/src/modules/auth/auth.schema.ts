import { z } from 'zod';

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

const passwordField = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password cannot exceed 128 characters');

const phoneField = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional();

// ============ Auth Schemas ============

const registerBodySchema = z.object({
  firstName: nameField('First name'),
  lastName: nameField('Last name'),
  email: emailField,
  phone: phoneField,
  address: z.string().trim().max(200, 'Address cannot exceed 200 characters').optional(),
  password: passwordField,
});

export const registerSchema = z.object({
  body: registerBodySchema.strict(),
});

const loginBodySchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
  invitationToken: z.string().trim().min(10).max(200).optional(),
});

export const loginSchema = z.object({
  body: loginBodySchema,
});

export const googleAuthSchema = z.object({
  body: z.object({ idToken: z.string().trim().min(1).max(16384) }).strict(),
});

// ============ Profile Schemas ============

const updateUserBodySchema = z.object({
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
});

export const updateUserSchema = z.object({
  body: updateUserBodySchema.strict(),
});

// ============ Password Schemas ============

const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z.object({
  body: changePasswordBodySchema,
});

const forgotPasswordBodySchema = z.object({
  email: emailField,
});

export const forgotPasswordSchema = z.object({
  body: forgotPasswordBodySchema,
});

export const verifyResetOtpSchema = z.object({
  body: z.object({ email: emailField, otp: z.string().regex(/^\d{6}$/, 'Masukkan 6 digit kode pemulihan') }).strict(),
});

const resetPasswordBodySchema = z
  .object({
    resetToken: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid reset token'),
    password: passwordField,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  body: resetPasswordBodySchema,
});

// ============ Type Exports ============

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserBodySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordBodySchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;
