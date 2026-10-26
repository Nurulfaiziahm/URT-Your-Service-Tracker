import { z } from 'zod';

export const reportOverviewQuerySchema = z.object({
  query: z
    .object({
      startDate: z
        .string()
        .trim()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
          message: 'Invalid startDate format (must be ISO-8601 date string)',
        })
        .optional(),
      endDate: z
        .string()
        .trim()
        .refine((val) => !val || !isNaN(Date.parse(val)), {
          message: 'Invalid endDate format (must be ISO-8601 date string)',
        })
        .optional(),
    })
    .optional(),
});

export type ReportOverviewQueryParams = z.infer<typeof reportOverviewQuerySchema>['query'];
