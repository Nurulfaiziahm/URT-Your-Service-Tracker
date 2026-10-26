import { z } from 'zod';

const deviceSchema = z.object({
  category: z.string().trim().min(1, 'Category is required').max(50, 'Max 50 characters'),
  brand: z.string().trim().max(50, 'Max 50 characters').optional(),
  model: z.string().trim().min(1, 'Model is required').max(100, 'Max 100 characters'),
  serialNumber: z.string().trim().max(100, 'Max 100 characters').optional(),
  accessories: z.array(z.string().trim().max(50)).max(20).optional().default([]),
  condition: z.string().trim().max(200, 'Max 200 characters').optional(),
});

const estimateLineInputSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(200, 'Max 200 characters'),
  type: z.enum(['part', 'labor']),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1'),
  unitPrice: z
    .number({ invalid_type_error: 'Unit price must be a number' })
    .int('Unit price must be a whole integer in rupiah')
    .min(0, 'Unit price cannot be negative'),
});

export const createTicketSchema = z.object({
  body: z
    .object({
      customerId: z.string().trim().optional(),
      requestedServiceId: z.string().trim().optional(),
      assignedTechnicianId: z.string().trim().optional(),
      device: deviceSchema,
      complaint: z.string().trim().min(3, 'Complaint is required').max(1000, 'Max 1000 characters'),
      intakeMethod: z.enum(['walk_in', 'online']).optional(),
    })
    .strict(),
});

export const updateIntakeSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      device: deviceSchema.partial().optional(),
      complaint: z.string().trim().min(3).max(1000).optional(),
      requestedServiceId: z.string().trim().optional(),
    })
    .strict(),
});

export const assignTechnicianSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      assignedTechnicianId: z.string().trim().min(1, 'assignedTechnicianId is required'),
      reason: z.string().trim().max(200).optional(),
    })
    .strict(),
});

export const diagnosisSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      staffFindings: z.string().trim().max(1000).optional(),
      customerExplanation: z
        .string()
        .trim()
        .min(3, 'Customer explanation is required')
        .max(1000, 'Max 1000 characters'),
    })
    .strict(),
});

export const estimateDraftSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      lines: z.array(estimateLineInputSchema).min(1, 'At least one line item is required'),
      targetCompletionDate: z.coerce.date().optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});

export const submitEstimateSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      customerExplanation: z.string().trim().min(3).max(1000).optional(),
      lines: z.array(estimateLineInputSchema).min(1).optional(),
      targetCompletionDate: z.coerce.date().optional(),
    })
    .strict(),
});

export const approvalSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      estimateVersion: z.number().int().min(1, 'estimateVersion is required'),
      decision: z.enum(['approved', 'rejected']),
      reason: z.string().trim().max(300).optional(),
    })
    .strict(),
});

export const handoverSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      handedOverTo: z.string().trim().min(1, 'Recipient name is required').max(100),
      notes: z.string().trim().max(500).optional(),
    })
    .strict(),
});

export const ticketTransitionSchema = z.object({
  body: z
    .object({
      expectedRevision: z.number().int().min(1, 'expectedRevision is required'),
      targetStatus: z.enum([
        'waiting_diagnosis',
        'diagnosing',
        'repairing',
        'quality_check',
        'completed',
        'cancelled',
      ]),
      reason: z.string().trim().max(300).optional(),
      workSummary: z.string().trim().max(1000).optional(),
      qcPassed: z.boolean().optional(),
      qcNotes: z.string().trim().max(500).optional(),
      warrantyDays: z.number().int().min(0).optional(),
      warrantyTerms: z.string().trim().max(500).optional(),
    })
    .strict(),
});

export const ticketQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
      status: z
        .enum([
          'submitted',
          'waiting_diagnosis',
          'diagnosing',
          'awaiting_approval',
          'approved',
          'rejected',
          'repairing',
          'quality_check',
          'completed',
          'cancelled',
        ])
        .optional(),
      customerId: z.string().trim().optional(),
      technicianId: z.string().trim().optional(),
    })
    .optional(),
});

export const issueTrackingAccessSchema = z.object({
  body: z.object({
    expectedRevision: z.number().int().min(1, 'expectedRevision must be an integer >= 1'),
  }),
});

export const publicTrackingSchema = z.object({
  body: z.object({
    businessSlug: z.string().trim().min(1, 'Business slug is required'),
    ticketCode: z.string().trim().min(1, 'Ticket code is required'),
    trackingSecret: z.string().trim().min(1, 'Tracking secret is required'),
  }),
});

export const addAttachmentSchema = z.object({
  body: z.object({
    key: z.string().trim().min(1, 'File key is required'),
    visibility: z.enum(['customer', 'staff']).default('customer'),
    expectedRevision: z.number().int().min(1, 'expectedRevision must be an integer >= 1'),
  }),
});

export const detachAttachmentSchema = z.object({
  body: z.object({
    expectedRevision: z.number().int().min(1, 'expectedRevision must be an integer >= 1'),
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>['body'];
export type UpdateIntakeInput = z.infer<typeof updateIntakeSchema>['body'];
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>['body'];
export type DiagnosisInput = z.infer<typeof diagnosisSchema>['body'];
export type EstimateDraftInput = z.infer<typeof estimateDraftSchema>['body'];
export type SubmitEstimateInput = z.infer<typeof submitEstimateSchema>['body'];
export type ApprovalInput = z.infer<typeof approvalSchema>['body'];
export type HandoverInput = z.infer<typeof handoverSchema>['body'];
export type TicketTransitionInput = z.infer<typeof ticketTransitionSchema>['body'];
export type TicketQueryParams = z.infer<typeof ticketQuerySchema>['query'];
export type IssueTrackingAccessInput = z.infer<typeof issueTrackingAccessSchema>['body'];
export type PublicTrackingInput = z.infer<typeof publicTrackingSchema>['body'];
export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>['body'];
export type DetachAttachmentInput = z.infer<typeof detachAttachmentSchema>['body'];
