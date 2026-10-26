import { baseApi } from '../../redux/baseApi';
import type { ApiResponse } from '../../lib/api.types';
import type {
  Business,
  CreateBusinessInput,
  PublicBusinessResponse,
  UpdateBusinessInput,
  UserBusinessContextItem,
} from './types';

export const businessApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyBusinesses: builder.query<ApiResponse<{ businesses: UserBusinessContextItem[] }>, void>({
      query: () => '/me/businesses',
      providesTags: ['Membership:ME'],
    }),

    createBusiness: builder.mutation<ApiResponse<{ business: Business }>, CreateBusinessInput>({
      query: (body) => ({
        url: '/businesses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Membership:ME'],
    }),

    getBusinessById: builder.query<ApiResponse<{ business: Business }>, string>({
      query: (businessId) => `/businesses/${encodeURIComponent(businessId)}`,
      providesTags: (_result, _err, businessId) => [{ type: 'Business', id: businessId }],
    }),

    updateBusiness: builder.mutation<
      ApiResponse<{ business: Business }>,
      { businessId: string; body: UpdateBusinessInput }
    >({
      query: ({ businessId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { businessId }) => [
        { type: 'Business', id: businessId },
        'Membership:ME',
      ],
    }),

    getPublicBusiness: builder.query<ApiResponse<PublicBusinessResponse>, string>({
      query: (slug) => `/public/businesses/${encodeURIComponent(slug)}`,
    }),
  }),
});

export const {
  useGetMyBusinessesQuery,
  useCreateBusinessMutation,
  useGetBusinessByIdQuery,
  useUpdateBusinessMutation,
  useGetPublicBusinessQuery,
} = businessApi;
