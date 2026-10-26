import { baseApi } from '../../redux/baseApi';
import type { ApiResponse, PaginatedResponse } from '../../lib/api.types';
import type { CreateCustomerInput, Customer, UpdateCustomerInput } from './types';

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomer: builder.query<
      ApiResponse<{ customer: Customer }>,
      { businessId: string; id: string }
    >({
      query: ({ businessId, id }) =>
        `/businesses/${encodeURIComponent(businessId)}/customers/${encodeURIComponent(id)}`,
      providesTags: ['Customers'],
    }),
    getCustomers: builder.query<
      PaginatedResponse<Customer>,
      { businessId: string; page?: number; limit?: number; q?: string; status?: string }
    >({
      query: ({ businessId, page = 1, limit = 20, q, status }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        return `/businesses/${encodeURIComponent(businessId)}/customers?${params.toString()}`;
      },
      providesTags: ['Customers'],
    }),

    createCustomer: builder.mutation<
      ApiResponse<{ customer: Customer }>,
      { businessId: string; body: CreateCustomerInput }
    >({
      query: ({ businessId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/customers`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Customers'],
    }),

    updateCustomer: builder.mutation<
      ApiResponse<{ customer: Customer }>,
      { businessId: string; customerId: string; body: UpdateCustomerInput }
    >({
      query: ({ businessId, customerId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/customers/${encodeURIComponent(customerId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Customers'],
    }),

    sendCustomerInvitation: builder.mutation<
      ApiResponse<{ customer: Customer; token?: string }>,
      { businessId: string; customerId: string }
    >({
      query: ({ businessId, customerId }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/customers/${encodeURIComponent(customerId)}/invitation`,
        method: 'POST',
      }),
      invalidatesTags: ['Customers'],
    }),

    acceptCustomerInvitation: builder.mutation<
      ApiResponse<{ membership: { businessId: string; role: 'customer' } }>,
      { token: string }
    >({
      query: (body) => ({
        url: '/customer-invitations/accept',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Membership:ME', 'Customers'],
    }),
  }),
});

export const {
  useGetCustomerQuery,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useSendCustomerInvitationMutation,
  useAcceptCustomerInvitationMutation,
} = customersApi;
