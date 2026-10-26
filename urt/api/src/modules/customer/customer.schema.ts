import { z } from 'zod';

export const createCustomerSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Customer name is required').max(100, 'Max 100 characters'),
      email: z.string().trim().email('Invalid email format').toLowerCase().optional(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      address: z.string().trim().max(200, 'Max 200 characters').optional(),
    })
    .strict(),
});

export const updateCustomerSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Customer name is required').max(100, 'Max 100 characters').optional(),
      email: z.string().trim().email('Invalid email format').toLowerCase().optional(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      address: z.string().trim().max(200, 'Max 200 characters').optional(),
      status: z.enum(['active', 'archived']).optional(),
    })
    .strict(),
});

export const customerQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
      status: z.enum(['active', 'archived']).optional(),
    })
    .optional(),
});

export const acceptCustomerInvitationSchema = z.object({
  body: z
    .object({
      token: z.string().trim().min(10, 'Invitation token is required').max(200),
    })
    .strict(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
export type CustomerQueryParams = z.infer<typeof customerQuerySchema>['query'];
export type AcceptCustomerInvitationInput = z.infer<typeof acceptCustomerInvitationSchema>['body'];
