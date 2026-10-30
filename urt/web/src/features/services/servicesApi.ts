import { baseApi } from '../../redux/baseApi';
import type { ApiResponse, PaginatedResponse } from '../../lib/api.types';
import type { CreateServiceInput, RepairService, UpdateServiceInput } from './types';

export const servicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    deleteService: builder.mutation<ApiResponse<null>, { businessId: string; serviceId: string }>({
      query: ({ businessId, serviceId }) => ({ url: `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`, method: 'DELETE' }),
      invalidatesTags: ['Services'],
    }),
    getService: builder.query<
      ApiResponse<{ service: RepairService }>,
      { businessId: string; id: string }
    >({
      query: ({ businessId, id }) =>
        `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(id)}`,
      providesTags: ['Services'],
    }),
    getServices: builder.query<
      PaginatedResponse<RepairService>,
      {
        businessId: string;
        page?: number;
        limit?: number;
        q?: string;
        category?: string;
        scope?: 'catalog';
        status?: string;
        entryType?: 'service' | 'part' | 'difficulty';
      }
    >({
      query: ({ businessId, page = 1, limit = 20, q, category, status, entryType, scope }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (q) params.set('q', q);
        if (category) params.set('category', category);
        if (status) params.set('status', status);
        if (entryType) params.set('entryType', entryType);
        if (scope) params.set('scope', scope);
        return `/businesses/${encodeURIComponent(businessId)}/services?${params.toString()}`;
      },
      providesTags: ['Services'],
    }),

    createService: builder.mutation<
      ApiResponse<{ service: RepairService }>,
      { businessId: string; body: CreateServiceInput }
    >({
      query: ({ businessId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/services`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Services'],
    }),

    updateService: builder.mutation<
      ApiResponse<{ service: RepairService }>,
      { businessId: string; serviceId: string; body: UpdateServiceInput }
    >({
      query: ({ businessId, serviceId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/services/${encodeURIComponent(serviceId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Services'],
    }),
  }),
});

export const {
  useDeleteServiceMutation,
  useGetServiceQuery,
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
} = servicesApi;
