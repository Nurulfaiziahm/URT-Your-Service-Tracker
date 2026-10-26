import { IServiceInvoice, IInvoiceLine, IInvoicePayment } from '../../models/ServiceInvoice.model.js';

export interface SerializedInvoice {
  id: string;
  businessId: string;
  ticketId: string;
  ticketCode: string;
  customerId: string;
  invoiceNumber: string;
  status: string;
  statusLabel: string;
  revision: number;
  currency: string;
  estimateVersion: number;
  lines: IInvoiceLine[];
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
  payments: Array<{
    id?: string;
    operationId: string;
    amount: number;
    amountFormatted: string;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    paidAt: Date;
    recordedByName: string;
  }>;
  issuedAt: Date;
  issuedByName: string;
  voidReason?: string;
  voidedAt?: Date;
  isDemoData: boolean;
  demoNotice: string;
  printable: {
    formattedSubtotal: string;
    formattedTax: string;
    formattedTotal: string;
    formattedPaid: string;
    formattedBalance: string;
    isSettled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const statusLabels: Record<string, string> = {
  issued: 'Belum Dibayar',
  partially_paid: 'Sebagian Dibayar',
  paid: 'Lunas',
  voided: 'Dibatalkan',
};

const formatRupiah = (val: number): string => {
  return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
};

export const serializeInvoice = (invoice: IServiceInvoice): SerializedInvoice => {
  return {
    id: invoice._id.toString(),
    businessId: invoice.businessId.toString(),
    ticketId: invoice.ticketId.toString(),
    ticketCode: invoice.ticketCode,
    customerId: invoice.customerId.toString(),
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    statusLabel: statusLabels[invoice.status] || invoice.status,
    revision: invoice.revision,
    currency: invoice.currency,
    estimateVersion: invoice.estimateVersion,
    lines: invoice.lines,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    totalAmount: invoice.totalAmount,
    paidAmount: invoice.paidAmount,
    balance: invoice.balance,
    business: invoice.businessSnapshot,
    customer: invoice.customerSnapshot,
    device: invoice.deviceSnapshot,
    payments: (invoice.payments || []).map((p: IInvoicePayment) => ({
      id: p._id?.toString(),
      operationId: p.operationId,
      amount: p.amount,
      amountFormatted: formatRupiah(p.amount),
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      paidAt: p.paidAt,
      recordedByName: p.recordedByName,
    })),
    issuedAt: invoice.issuedAt,
    issuedByName: invoice.issuedByName,
    voidReason: invoice.voidReason,
    voidedAt: invoice.voidedAt,
    isDemoData: invoice.isDemoData !== false,
    demoNotice: 'DOKUMEN CONTOH / DEMO - TIDAK ADA DANA NYATA YANG DITRANSFER',
    printable: {
      formattedSubtotal: formatRupiah(invoice.subtotal),
      formattedTax: formatRupiah(invoice.tax),
      formattedTotal: formatRupiah(invoice.totalAmount),
      formattedPaid: formatRupiah(invoice.paidAmount),
      formattedBalance: formatRupiah(invoice.balance),
      isSettled: invoice.balance === 0,
    },
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
};
