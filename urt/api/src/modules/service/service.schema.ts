import { z } from 'zod';

export const createServiceSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Service name is required').max(100, 'Max 100 characters'),
      description: z.string().trim().max(500, 'Max 500 characters').optional(),
      category: z.string().trim().min(1, 'Category is required').max(50, 'Max 50 characters'),
      basePrice: z
        .number({ invalid_type_error: 'Base price must be a number' })
        .int('Base price must be a whole integer amount in rupiah')
        .min(0, 'Base price cannot be negative'),
      estimatedDuration: z.string().trim().max(50, 'Max 50 characters').optional(),
    })
    .strict(),
});

export const updateServiceSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1, 'Service name is required').max(100, 'Max 100 characters').optional(),
      description: z.string().trim().max(500, 'Max 500 characters').optional(),
      category: z.string().trim().min(1, 'Category is required').max(50, 'Max 50 characters').optional(),
      basePrice: z
        .number({ invalid_type_error: 'Base price must be a number' })
        .int('Base price must be a whole integer amount in rupiah')
        .min(0, 'Base price cannot be negative')
        .optional(),
      estimatedDuration: z.string().trim().max(50, 'Max 50 characters').optional(),
      status: z.enum(['active', 'archived']).optional(),
    })
    .strict(),
});

export const serviceQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
      category: z.string().trim().max(50).optional(),
      status: z.enum(['active', 'archived']).optional(),
    })
    .optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>['body'];
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>['body'];
export type ServiceQueryParams = z.infer<typeof serviceQuerySchema>['query'];
