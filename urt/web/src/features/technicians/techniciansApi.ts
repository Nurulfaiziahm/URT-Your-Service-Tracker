import { baseApi } from '../../redux/baseApi';
import type { ApiResponse, PaginatedResponse } from '../../lib/api.types';
import type { InviteTechnicianInput, Technician, UpdateTechnicianInput } from './types';

export const techniciansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    inspectTechnicianInvitation: builder.mutation<ApiResponse<{ name: string; email: string; businessName: string; accountExists: boolean }>, { token: string }>({
      query: (body) => ({ url: '/technician-invitations/inspect', method: 'POST', body }),
    }),
    activateTechnicianInvitation: builder.mutation<ApiResponse<{ email: string; membership: { businessId: string; role: 'technician' } }>, { token: string; password: string; confirmPassword: string }>({
      query: (body) => ({ url: '/technician-invitations/activate', method: 'POST', body }),
      invalidatesTags: ['Membership:ME', 'Technicians'],
    }),
    getTechnician: builder.query<
      ApiResponse<{ technician: Technician }>,
      { businessId: string; id: string }
    >({
      query: ({ businessId, id }) =>
        `/businesses/${encodeURIComponent(businessId)}/technicians/${encodeURIComponent(id)}`,
      providesTags: ['Technicians'],
    }),
    getTechnicians: builder.query<
      PaginatedResponse<Technician>,
      { businessId: string; page?: number; limit?: number; q?: string; status?: string }
    >({
      query: ({ businessId, page = 1, limit = 20, q, status }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        return `/businesses/${encodeURIComponent(businessId)}/technicians?${params.toString()}`;
      },
      providesTags: ['Technicians'],
    }),

    inviteTechnician: builder.mutation<
      ApiResponse<{ technician: Technician; token?: string }>,
      { businessId: string; body: InviteTechnicianInput }
    >({
      query: ({ businessId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/technicians/invitations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Technicians'],
    }),

    resendTechnicianInvitation: builder.mutation<
      ApiResponse<{
        technicianId: string;
        email: string;
        expiresAt: string;
        mailSent: boolean;
        invitationUrl?: string;
        token?: string;
      }>,
      { businessId: string; technicianId: string }
    >({
      query: ({ businessId, technicianId }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/technicians/${encodeURIComponent(technicianId)}/invitation`,
        method: 'POST',
      }),
      invalidatesTags: ['Technicians'],
    }),

    deleteTechnician: builder.mutation<void, { businessId: string; technicianId: string }>({
      query: ({ businessId, technicianId }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/technicians/${encodeURIComponent(technicianId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Technicians'],
    }),

    updateTechnician: builder.mutation<
      ApiResponse<{ technician: Technician }>,
      { businessId: string; technicianId: string; body: UpdateTechnicianInput }
    >({
      query: ({ businessId, technicianId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/technicians/${encodeURIComponent(technicianId)}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Technicians'],
    }),

    acceptTechnicianInvitation: builder.mutation<
      ApiResponse<{ membership: { businessId: string; role: 'technician' } }>,
      { token: string }
    >({
      query: (body) => ({
        url: '/technician-invitations/accept',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Membership:ME', 'Technicians'],
    }),
  }),
});

export const {
  useInspectTechnicianInvitationMutation,
  useActivateTechnicianInvitationMutation,
  useGetTechnicianQuery,
  useGetTechniciansQuery,
  useInviteTechnicianMutation,
  useResendTechnicianInvitationMutation,
  useDeleteTechnicianMutation,
  useUpdateTechnicianMutation,
  useAcceptTechnicianInvitationMutation,
} = techniciansApi;
