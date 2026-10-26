export type InvoiceStatus = 'issued' | 'partially_paid' | 'paid' | 'voided';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other';

export interface InvoiceLine {
  id?: string;
  description: string;
  type: 'part' | 'labor';
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InvoicePayment {
  id?: string;
  operationId: string;
  amount: number;
  amountFormatted: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: string;
  recordedByName: string;
}

export interface ServiceInvoice {
  id: string;
  businessId: string;
  ticketId: string;
  ticketCode: string;
  customerId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  statusLabel: string;
  revision: number;
  currency: string;
  estimateVersion: number;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  business: {
    name: string;
    slug: string;
    phone?: string;
    address?: string;
  };
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  device: {
    category: string;
    brand?: string;
    model: string;
    serialNumber?: string;
  };
  payments: InvoicePayment[];
  issuedAt: string;
  issuedByName: string;
  voidReason?: string;
  voidedAt?: string;
  isDemoData?: boolean;
  demoNotice?: string;
  printable?: {
    formattedSubtotal: string;
    formattedTax: string;
    formattedTotal: string;
    formattedPaid: string;
    formattedBalance: string;
    isSettled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentInput {
  expectedRevision: number;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface VoidInvoiceInput {
  expectedRevision: number;
  reason: string;
}

export interface IssueInvoiceInput {
  expectedRevision?: number;
  notes?: string;
  dueDate?: string;
}

export interface InvoiceQueryParams {
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}
