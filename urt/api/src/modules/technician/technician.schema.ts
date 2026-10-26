import { z } from 'zod';

export const inviteTechnicianSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Technician name is required').max(100, 'Max 100 characters'),
      email: z.string().trim().email('Invalid email format').toLowerCase(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      specializations: z
        .array(z.string().trim().min(1).max(50))
        .max(20, 'Max 20 specializations')
        .default([]),
    })
    .strict(),
});

export const updateTechnicianSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Technician name is required').max(100, 'Max 100 characters').optional(),
      phone: z.string().trim().max(30, 'Max 30 characters').optional(),
      specializations: z
        .array(z.string().trim().min(1).max(50))
        .max(20, 'Max 20 specializations')
        .optional(),
      status: z.enum(['active', 'inactive']).optional(),
    })
    .strict(),
});

export const technicianQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
      status: z.enum(['pending', 'active', 'inactive']).optional(),
    })
    .optional(),
});

export const acceptTechnicianInvitationSchema = z.object({
  body: z
    .object({
      token: z.string().trim().min(10, 'Invitation token is required').max(200),
    })
    .strict(),
});

export type InviteTechnicianInput = z.infer<typeof inviteTechnicianSchema>['body'];
export type UpdateTechnicianInput = z.infer<typeof updateTechnicianSchema>['body'];
export type TechnicianQueryParams = z.infer<typeof technicianQuerySchema>['query'];
export type AcceptTechnicianInvitationInput = z.infer<typeof acceptTechnicianInvitationSchema>['body'];
