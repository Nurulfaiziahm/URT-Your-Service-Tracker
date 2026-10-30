import mongoose from 'mongoose';
import crypto from 'crypto';
import {
  ServiceInvoice,
  IServiceInvoice,
  IInvoicePayment,
} from '../../models/ServiceInvoice.model.js';
import { ServiceTicket } from '../../models/ServiceTicket.model.js';
import { Business } from '../../models/Business.model.js';
import { Customer } from '../../models/Customer.model.js';
import { User } from '../../models/User.model.js';
import { AppError } from '../../middleware/error-handler.js';
import { validateObjectId } from '../business/business.access.js';
import {
  IssueInvoiceInput,
  RecordPaymentInput,
  VoidInvoiceInput,
  InvoiceQueryParams,
} from './invoice.schema.js';

export class InvoiceService {
  /**
   * Helper to generate unique business-scoped invoice number: INV-YYYY-XXXX
   */
  private static async generateInvoiceNumber(businessId: mongoose.Types.ObjectId): Promise<string> {
    const year = new Date().getFullYear();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let attempt = 0; attempt < 5; attempt++) {
      let suffix = '';
      const bytes = crypto.randomBytes(4);
      for (let i = 0; i < 4; i++) {
        suffix += chars[bytes[i] % chars.length];
      }
      const invoiceNumber = `INV-${year}-${suffix}`;
      const exists = await ServiceInvoice.exists({ businessId, invoiceNumber });
      if (!exists) {
        return invoiceNumber;
      }
    }

    return `INV-${year}-${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Issue a service invoice for a completed repair (Owner only)
   * Enforces approved estimate freeze and single active invoice per ticket.
   */
  static async issueInvoice(
    businessId: string,
    ticketId: string,
    callerUserId: string,
    _input?: IssueInvoiceInput,
  ): Promise<IServiceInvoice> {
    validateObjectId(businessId, 'Business');
    validateObjectId(ticketId, 'ServiceTicket');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    const ticket = await ServiceTicket.findOne({ deletedAt: { $exists: false },
      _id: ticketObjectId,
      businessId: businessObjectId,
    });

    if (!ticket) {
      throw new AppError('Ticket not found', 404);
    }

    if (ticket.status !== 'completed') {
      throw new AppError('Invoice can only be issued for completed repairs', 400, 'TICKET_NOT_COMPLETED');
    }

    if (!ticket.approvedEstimate) {
      throw new AppError('Ticket has no approved estimate basis to issue an invoice', 400, 'NO_APPROVED_ESTIMATE');
    }

    // Idempotent / conflict check: return existing active invoice if already issued
    const existingActive = await ServiceInvoice.findOne({
      businessId: businessObjectId,
      ticketId: ticketObjectId,
      status: { $in: ['issued', 'partially_paid', 'paid'] },
    });

    if (existingActive) {
      return existingActive;
    }

    const business = await Business.findById(businessObjectId);
    if (!business) {
      throw new AppError('Business not found', 404);
    }

    const customer = await Customer.findById(ticket.customerId);
    if (!customer) {
      throw new AppError('Customer record not found', 404);
    }

    const user = await User.findById(callerUserId);
    const callerName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Pemilik Usaha';

    // Freeze snapshot data
    const invoiceNumber = await this.generateInvoiceNumber(businessObjectId);
    const approved = ticket.approvedEstimate;

    const lines = approved.lines.map((l) => ({
      description: l.description,
      type: l.type,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.total,
    }));

    const subtotal = lines.reduce((acc, curr) => acc + curr.total, 0);
    const tax = 0;
    const totalAmount = subtotal + tax;

    const invoice = await ServiceInvoice.create({
      businessId: businessObjectId,
      ticketId: ticketObjectId,
      ticketCode: ticket.ticketCode,
      customerId: ticket.customerId,
      invoiceNumber,
      status: 'issued',
      revision: 1,
      currency: approved.currency || 'IDR',
      estimateVersion: approved.version,
      lines,
      subtotal,
      tax,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      businessSnapshot: {
        name: business.name,
        slug: business.slug,
        phone: business.phone,
        address: business.address,
      },
      customerSnapshot: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      deviceSnapshot: {
        category: ticket.device.category,
        brand: ticket.device.brand,
        model: ticket.device.model,
        serialNumber: ticket.device.serialNumber,
      },
      payments: [],
      issuedAt: new Date(),
      issuedBy: new mongoose.Types.ObjectId(callerUserId),
      issuedByName: callerName,
      isDemoData: true,
    });

    // Record invoice issuance in ticket timeline
    ticket.timeline.push({
      status: ticket.status,
      action: 'invoice_issued',
      actorId: new mongoose.Types.ObjectId(callerUserId),
      actorRole: 'owner',
      actorName: callerName,
      note: `Invoice tagihan servis diterbitkan: #${invoice.invoiceNumber} (Rp ${totalAmount.toLocaleString('id-ID')})`,
      isPublic: true,
      timestamp: new Date(),
    });

    await ticket.save();

    return invoice;
  }

  /**
   * List invoices (Owner sees all, linked Customer sees only their own)
   */
  static async getInvoices(
    businessId: string,
    callerUserId: string,
    callerRole: 'owner' | 'customer',
    query?: InvoiceQueryParams,
  ): Promise<{ invoices: IServiceInvoice[]; total: number; page: number; limit: number }> {
    validateObjectId(businessId, 'Business');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      businessId: businessObjectId,
    };

    if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: new mongoose.Types.ObjectId(callerUserId),
        status: 'active',
      });
      if (!customer) {
        return { invoices: [], total: 0, page, limit };
      }
      filter.customerId = customer._id;
    } else {
      // Owner can filter by customerId or ticketId
      if (query?.customerId) {
        validateObjectId(query.customerId, 'Customer');
        filter.customerId = new mongoose.Types.ObjectId(query.customerId);
      }
    }

    if (query?.status) {
      filter.status = query.status;
    }

    if (query?.ticketId) {
      validateObjectId(query.ticketId, 'ServiceTicket');
      filter.ticketId = new mongoose.Types.ObjectId(query.ticketId);
    }

    const [invoices, total] = await Promise.all([
      ServiceInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ServiceInvoice.countDocuments(filter),
    ]);

    return { invoices, total, page, limit };
  }

  /**
   * Get invoice detail by ID
   */
  static async getInvoiceById(
    businessId: string,
    invoiceId: string,
    callerUserId: string,
    callerRole: 'owner' | 'customer',
  ): Promise<IServiceInvoice> {
    validateObjectId(businessId, 'Business');
    validateObjectId(invoiceId, 'ServiceInvoice');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

    const invoice = await ServiceInvoice.findOne({
      _id: invoiceObjectId,
      businessId: businessObjectId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (callerRole === 'customer') {
      const customer = await Customer.findOne({
        businessId: businessObjectId,
        userId: new mongoose.Types.ObjectId(callerUserId),
        status: 'active',
      });
      if (!customer || invoice.customerId.toString() !== customer._id.toString()) {
        throw new AppError('Invoice not found', 404);
      }
    }

    return invoice;
  }

  /**
   * Record a payment receipt on an invoice (Owner only)
   * Enforces revision check, duplicate operation ID prevention, and overpayment blocker.
   */
  static async recordPayment(
    businessId: string,
    invoiceId: string,
    callerUserId: string,
    input: RecordPaymentInput,
  ): Promise<IServiceInvoice> {
    validateObjectId(businessId, 'Business');
    validateObjectId(invoiceId, 'ServiceInvoice');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

    const invoice = await ServiceInvoice.findOne({
      _id: invoiceObjectId,
      businessId: businessObjectId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.revision !== input.expectedRevision) {
      throw new AppError(
        `Invoice has been modified (current revision: ${invoice.revision}, expected: ${input.expectedRevision})`,
        409,
        'INVOICE_CHANGED',
      );
    }

    if (!['issued', 'partially_paid'].includes(invoice.status)) {
      throw new AppError(
        `Cannot record payment on an invoice with status '${invoice.status}'`,
        400,
        'INVALID_INVOICE_STATUS',
      );
    }

    // Atomic duplicate operation ID check on this invoice
    if (invoice.payments.some((p) => p.operationId === input.operationId)) {
      throw new AppError(
        `Payment with operation ID '${input.operationId}' has already been recorded on this invoice`,
        409,
        'DUPLICATE_PAYMENT_OPERATION',
      );
    }

    // Atomic duplicate operation ID check across business
    const existingOp = await ServiceInvoice.exists({
      businessId: businessObjectId,
      'payments.operationId': input.operationId,
    });
    if (existingOp) {
      throw new AppError(
        `Payment operation ID '${input.operationId}' has already been processed`,
        409,
        'DUPLICATE_PAYMENT_OPERATION',
      );
    }

    // Overpayment check
    if (input.amount > invoice.balance) {
      throw new AppError(
        `Payment amount (Rp ${input.amount.toLocaleString('id-ID')}) exceeds remaining balance of Rp ${invoice.balance.toLocaleString('id-ID')}`,
        400,
        'OVERPAYMENT_NOT_ALLOWED',
      );
    }

    const user = await User.findById(callerUserId);
    const callerName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Pemilik Usaha';

    const now = new Date();
    const newPayment: IInvoicePayment = {
      operationId: input.operationId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      notes: input.notes,
      paidAt: now,
      recordedBy: new mongoose.Types.ObjectId(callerUserId),
      recordedByName: callerName,
    };

    invoice.payments.push(newPayment);
    invoice.paidAmount += input.amount;
    invoice.balance = invoice.totalAmount - invoice.paidAmount;

    if (invoice.balance === 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partially_paid';
    }

    invoice.revision += 1;
    await invoice.save();

    // Append payment to ticket timeline if ticket exists
    const ticket = await ServiceTicket.findById(invoice.ticketId);
    if (ticket) {
      const isSettled = invoice.balance === 0;
      ticket.timeline.push({
        status: ticket.status,
        action: 'payment_received',
        actorId: new mongoose.Types.ObjectId(callerUserId),
        actorRole: 'owner',
        actorName: callerName,
        note: `Pembayaran diterima: Rp ${input.amount.toLocaleString('id-ID')} via ${input.paymentMethod.toUpperCase()}${
          isSettled ? ' (Lunas)' : ` (Sisa: Rp ${invoice.balance.toLocaleString('id-ID')})`
        }`,
        isPublic: true,
        timestamp: now,
      });
      await ticket.save();
    }

    return invoice;
  }

  /**
   * Void an unpaid invoice with reason (Owner only)
   */
  static async voidInvoice(
    businessId: string,
    invoiceId: string,
    callerUserId: string,
    input: VoidInvoiceInput,
  ): Promise<IServiceInvoice> {
    validateObjectId(businessId, 'Business');
    validateObjectId(invoiceId, 'ServiceInvoice');

    const businessObjectId = new mongoose.Types.ObjectId(businessId);
    const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

    const invoice = await ServiceInvoice.findOne({
      _id: invoiceObjectId,
      businessId: businessObjectId,
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.revision !== input.expectedRevision) {
      throw new AppError(
        `Invoice has been modified (current revision: ${invoice.revision}, expected: ${input.expectedRevision})`,
        409,
        'INVOICE_CHANGED',
      );
    }

    if (invoice.status === 'voided') {
      throw new AppError('Invoice is already voided', 400, 'ALREADY_VOIDED');
    }

    if (invoice.paidAmount > 0 || invoice.status === 'paid' || invoice.status === 'partially_paid') {
      throw new AppError(
        'Cannot void an invoice with recorded payments. Refunds require an explicit business policy.',
        400,
        'CANNOT_VOID_PAID_INVOICE',
      );
    }

    const now = new Date();
    invoice.status = 'voided';
    invoice.voidReason = input.reason;
    invoice.voidedAt = now;
    invoice.voidedBy = new mongoose.Types.ObjectId(callerUserId);
    invoice.revision += 1;

    await invoice.save();

    // Record voiding in ticket timeline
    const ticket = await ServiceTicket.findById(invoice.ticketId);
    if (ticket) {
      ticket.timeline.push({
        status: ticket.status,
        action: 'invoice_voided',
        actorId: new mongoose.Types.ObjectId(callerUserId),
        actorRole: 'owner',
        actorName: 'Pemilik Usaha',
        note: `Invoice #${invoice.invoiceNumber} dibatalkan: ${input.reason}`,
        isPublic: true,
        timestamp: now,
      });
      await ticket.save();
    }

    return invoice;
  }
}
