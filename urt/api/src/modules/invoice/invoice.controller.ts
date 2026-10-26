import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { ResponseHandler } from '../../utils/response.js';
import { getAuthUser } from '../../middleware/auth.guard.js';
import { InvoiceService } from './invoice.service.js';
import { serializeInvoice } from './invoice.serializer.js';
import {
  IssueInvoiceInput,
  RecordPaymentInput,
  VoidInvoiceInput,
  InvoiceQueryParams,
} from './invoice.schema.js';

export const issueInvoice = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const ticketId = req.params.ticketId;
  const user = getAuthUser(req);
  const input = req.body as IssueInvoiceInput;

  const invoice = await InvoiceService.issueInvoice(businessId, ticketId, user.id, input);
  const serialized = serializeInvoice(invoice);

  ResponseHandler.success(res, { invoice: serialized }, 'Invoice issued successfully');
});

export const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const primaryRole = roles.includes('owner') ? 'owner' : 'customer';
  const query = req.query as unknown as InvoiceQueryParams;

  const { invoices, total, page, limit } = await InvoiceService.getInvoices(
    businessId,
    user.id,
    primaryRole,
    query,
  );

  const serialized = invoices.map(serializeInvoice);

  ResponseHandler.success(
    res,
    {
      invoices: serialized,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
    'Invoices retrieved successfully',
  );
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const invoiceId = req.params.invoiceId;
  const user = getAuthUser(req);
  const roles = req.businessContext?.roles || [];
  const primaryRole = roles.includes('owner') ? 'owner' : 'customer';

  const invoice = await InvoiceService.getInvoiceById(
    businessId,
    invoiceId,
    user.id,
    primaryRole,
  );
  const serialized = serializeInvoice(invoice);

  ResponseHandler.success(res, { invoice: serialized }, 'Invoice retrieved successfully');
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const invoiceId = req.params.invoiceId;
  const user = getAuthUser(req);
  const input = req.body as RecordPaymentInput;

  const invoice = await InvoiceService.recordPayment(
    businessId,
    invoiceId,
    user.id,
    input,
  );
  const serialized = serializeInvoice(invoice);

  ResponseHandler.success(res, { invoice: serialized }, 'Payment recorded successfully');
});

export const voidInvoice = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.params.businessId;
  const invoiceId = req.params.invoiceId;
  const user = getAuthUser(req);
  const input = req.body as VoidInvoiceInput;

  const invoice = await InvoiceService.voidInvoice(
    businessId,
    invoiceId,
    user.id,
    input,
  );
  const serialized = serializeInvoice(invoice);

  ResponseHandler.success(res, { invoice: serialized }, 'Invoice voided successfully');
});
