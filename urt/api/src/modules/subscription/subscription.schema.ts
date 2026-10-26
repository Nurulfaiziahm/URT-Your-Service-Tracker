import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z
    .object({
      packageCode: z.string().trim().min(1).max(100),
      paymentMethod: z.literal('manual'),
    })
    .strict(),
});

export const paymentsSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict(),
});

export type CheckoutSchema = z.infer<typeof checkoutSchema>;
export type PaymentsSchema = z.infer<typeof paymentsSchema>;
