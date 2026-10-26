import { baseApi } from '../../redux/baseApi';
import type { ApiResponse, Pagination } from '../../lib/api.types';
import type {
  InvoiceQueryParams,
  IssueInvoiceInput,
  RecordPaymentInput,
  ServiceInvoice,
  VoidInvoiceInput,
} from './types';

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<
      ApiResponse<{ invoices: ServiceInvoice[]; pagination: Pagination }>,
      { businessId: string; params?: InvoiceQueryParams }
    >({
      query: ({ businessId, params }) => {
        const query = new URLSearchParams({
          page: String(params?.page || 1),
          limit: String(params?.limit || 20),
        });
        if (params?.status) query.set('status', params.status);
        return `/businesses/${encodeURIComponent(businessId)}/invoices?${query.toString()}`;
      },
      providesTags: ['Invoices'],
    }),

    getInvoiceById: builder.query<
      ApiResponse<{ invoice: ServiceInvoice }>,
      { businessId: string; invoiceId: string }
    >({
      query: ({ businessId, invoiceId }) =>
        `/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}`,
      providesTags: (_result, _err, { invoiceId }) => [{ type: 'Invoices', id: invoiceId }],
    }),

    issueInvoice: builder.mutation<
      ApiResponse<{ invoice: ServiceInvoice }>,
      { businessId: string; ticketId: string; body?: IssueInvoiceInput }
    >({
      query: ({ businessId, ticketId, body = {} }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/invoice`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoices', 'Tickets', 'Dashboard', 'Reports'],
    }),

    recordPayment: builder.mutation<
      ApiResponse<{ invoice: ServiceInvoice }>,
      { businessId: string; invoiceId: string; body: RecordPaymentInput }
    >({
      query: ({ businessId, invoiceId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { invoiceId }) => [
        'Invoices',
        'Dashboard',
        'Reports',
        { type: 'Invoices', id: invoiceId },
      ],
    }),

    voidInvoice: builder.mutation<
      ApiResponse<{ invoice: ServiceInvoice }>,
      { businessId: string; invoiceId: string; body: VoidInvoiceInput }
    >({
      query: ({ businessId, invoiceId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/invoices/${encodeURIComponent(invoiceId)}/void`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { invoiceId }) => [
        'Invoices',
        'Dashboard',
        'Reports',
        { type: 'Invoices', id: invoiceId },
      ],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useIssueInvoiceMutation,
  useRecordPaymentMutation,
  useVoidInvoiceMutation,
} = invoicesApi;
