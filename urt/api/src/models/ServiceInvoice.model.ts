import mongoose, { Document, Schema, Model } from 'mongoose';

export type InvoiceStatus = 'issued' | 'partially_paid' | 'paid' | 'voided';
export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other';

export interface IInvoiceLine {
  description: string;
  type: 'part' | 'labor';
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoicePayment {
  _id?: mongoose.Types.ObjectId;
  operationId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: Date;
  recordedBy: mongoose.Types.ObjectId;
  recordedByName: string;
}

export interface IBusinessSnapshot {
  name: string;
  slug: string;
  phone?: string;
  address?: string;
}

export interface ICustomerSnapshot {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface IDeviceSnapshot {
  category: string;
  brand?: string;
  model: string;
  serialNumber?: string;
}

export interface IServiceInvoice extends Document {
  _id: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  ticketCode: string;
  customerId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  revision: number;
  currency: string;
  estimateVersion: number;
  lines: IInvoiceLine[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  businessSnapshot: IBusinessSnapshot;
  customerSnapshot: ICustomerSnapshot;
  deviceSnapshot: IDeviceSnapshot;
  payments: IInvoicePayment[];
  issuedAt: Date;
  issuedBy: mongoose.Types.ObjectId;
  issuedByName: string;
  voidReason?: string;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  isDemoData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type IServiceInvoiceModel = Model<IServiceInvoice>;

const invoiceLineSchema = new Schema<IInvoiceLine>(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['part', 'labor'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer',
      },
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Unit price must be a whole integer in rupiah',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Line total must be a whole integer in rupiah',
      },
    },
  },
  { _id: false },
);

const invoicePaymentSchema = new Schema<IInvoicePayment>(
  {
    operationId: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'Payment amount must be a whole integer in rupiah',
      },
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'transfer', 'qris', 'card', 'other'],
      required: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recordedByName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true },
);

const serviceInvoiceSchema = new Schema<IServiceInvoice>(
  {
    businessId: {
      type: Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Business ID is required'],
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceTicket',
      required: [true, 'Ticket ID is required'],
      index: true,
    },
    ticketCode: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['issued', 'partially_paid', 'paid', 'voided'],
      default: 'issued',
      index: true,
    },
    revision: {
      type: Number,
      default: 1,
      min: 1,
    },
    currency: {
      type: String,
      default: 'IDR',
      required: true,
    },
    estimateVersion: {
      type: Number,
      required: true,
    },
    lines: {
      type: [invoiceLineSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
    },
    businessSnapshot: {
      name: { type: String, required: true, trim: true },
      slug: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    customerSnapshot: {
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    deviceSnapshot: {
      category: { type: String, required: true, trim: true },
      brand: { type: String, trim: true },
      model: { type: String, required: true, trim: true },
      serialNumber: { type: String, trim: true },
    },
    payments: {
      type: [invoicePaymentSchema],
      default: [],
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedByName: {
      type: String,
      required: true,
      trim: true,
    },
    voidReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    voidedAt: {
      type: Date,
    },
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isDemoData: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Enforce unique invoice number within business
serviceInvoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });

// Partial unique index: at most one active issued invoice per ticket
serviceInvoiceSchema.index(
  { businessId: 1, ticketId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['issued', 'partially_paid', 'paid'] } },
  },
);

// Scoped listing & reporting indexes
serviceInvoiceSchema.index({ businessId: 1, status: 1, createdAt: -1 });
serviceInvoiceSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
serviceInvoiceSchema.index({ businessId: 1, 'payments.paidAt': 1 });
serviceInvoiceSchema.index({ businessId: 1, 'payments.operationId': 1 });

export const ServiceInvoice =
  (mongoose.models.ServiceInvoice as IServiceInvoiceModel) ||
  mongoose.model<IServiceInvoice, IServiceInvoiceModel>('ServiceInvoice', serviceInvoiceSchema);
