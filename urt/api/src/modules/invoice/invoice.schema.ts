import { z } from 'zod';

export const issueInvoiceSchema = z.object({
  body: z
    .object({
      notes: z.string().trim().max(500).optional(),
    })
    .optional(),
});

export const recordPaymentSchema = z.object({
  body: z.object({
    expectedRevision: z.number().int().min(1, 'expectedRevision must be an integer >= 1'),
    operationId: z.string().trim().min(1, 'operationId is required for atomic idempotency'),
    amount: z.number().int().min(1, 'amount must be a whole integer in rupiah > 0'),
    paymentMethod: z.enum(['cash', 'transfer', 'qris', 'card', 'other']),
    reference: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
});

export const voidInvoiceSchema = z.object({
  body: z.object({
    expectedRevision: z.number().int().min(1, 'expectedRevision must be an integer >= 1'),
    reason: z.string().trim().min(3, 'Void reason must be at least 3 characters').max(500),
  }),
});

export const invoiceQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(20),
      status: z.enum(['issued', 'partially_paid', 'paid', 'voided']).optional(),
      customerId: z.string().trim().optional(),
      ticketId: z.string().trim().optional(),
    })
    .optional(),
});

export type IssueInvoiceInput = z.infer<typeof issueInvoiceSchema>['body'];
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>['body'];
export type InvoiceQueryParams = z.infer<typeof invoiceQuerySchema>['query'];
