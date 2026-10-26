import { baseApi } from '../../redux/baseApi';
import type { ApiResponse } from '../../lib/api.types';
import type {
  OwnerDashboardData,
  TechnicianDashboardData,
  CustomerDashboardData,
} from './types';

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOwnerDashboard: builder.query<
      ApiResponse<OwnerDashboardData>,
      { businessId: string }
    >({
      query: ({ businessId }) =>
        `/businesses/${encodeURIComponent(businessId)}/dashboard?role=owner`,
      providesTags: ['Dashboard', 'Tickets'],
    }),

    getTechnicianDashboard: builder.query<
      ApiResponse<TechnicianDashboardData>,
      { businessId: string }
    >({
      query: ({ businessId }) =>
        `/businesses/${encodeURIComponent(businessId)}/dashboard?role=technician`,
      providesTags: ['Dashboard', 'Tickets'],
    }),

    getCustomerDashboard: builder.query<
      ApiResponse<CustomerDashboardData>,
      { businessId: string }
    >({
      query: ({ businessId }) =>
        `/businesses/${encodeURIComponent(businessId)}/dashboard?role=customer`,
      providesTags: ['Dashboard', 'Tickets'],
    }),
  }),
});

export const {
  useGetOwnerDashboardQuery,
  useGetTechnicianDashboardQuery,
  useGetCustomerDashboardQuery,
} = dashboardApi;
