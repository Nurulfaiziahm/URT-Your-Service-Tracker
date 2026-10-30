import { baseApi } from '../../redux/baseApi';
import type { ServiceRequestInput, ServiceRequestReceipt } from '../customer/service-request.types';
import type { ApiResponse, PaginatedResponse } from '../../lib/api.types';
import type {
  ApprovalInput,
  PublicServiceApproval,
  AssignTechnicianInput,
  CreateTicketInput,
  DiagnosisInput,
  EstimateDraftInput,
  HandoverInput,
  PublicTrackingInput,
  PublicTrackingResult,
  ServiceTicket,
  SubmitEstimateInput,
  TicketQueryParams,
  TimelineEvent,
  TrackingAccessResponse,
  TransitionTicketInput,
  UpdateIntakeInput,
} from './types';

export const ticketsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    deleteAnonymousTicket: builder.mutation<ApiResponse<null>, { businessId: string; ticketId: string; expectedRevision: number }>({
      query: ({ businessId, ticketId, expectedRevision }) => ({ url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}`, method: 'DELETE', body: { expectedRevision } }),
      invalidatesTags: ['Tickets', 'Dashboard'],
    }),
    getCustomerApprovalLink: builder.query<ApiResponse<{ approvalUrl: string; expiresAt: string }>, { businessId: string; ticketId: string; estimateVersion: number }>({
      query: ({ businessId, ticketId, estimateVersion }) => ({ url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/customer-approval-link`, method: 'POST', body: { estimateVersion } }),
      keepUnusedDataFor: 0,
    }),
    inspectServiceApproval: builder.query<ApiResponse<PublicServiceApproval>, string>({
      query: (token) => ({ url: '/public/service-approvals/inspect', method: 'POST', body: { token } }),
      keepUnusedDataFor: 0,
    }),
    respondServiceApproval: builder.mutation<ApiResponse<{ decision: 'approved' | 'rejected' }>, { token: string; expectedRevision: number; decision: 'approved' | 'rejected'; reason?: string }>({
      query: (body) => ({ url: '/public/service-approvals/respond', method: 'POST', body }),
      invalidatesTags: ['Tickets', 'Dashboard'],
    }),
    submitServiceRequest: builder.mutation<ApiResponse<ServiceRequestReceipt>, { slug: string; body: ServiceRequestInput }>({
      query: ({ slug, body }) => ({
        url: `/public/businesses/${encodeURIComponent(slug)}/service-requests`, method: 'POST', body,
      }),
      invalidatesTags: ['Tickets', 'Membership:ME', 'Dashboard'],
    }),
    getTickets: builder.query<
      PaginatedResponse<ServiceTicket>,
      { businessId: string; params?: TicketQueryParams }
    >({
      query: ({ businessId, params }) => {
        const query = new URLSearchParams({
          page: String(params?.page || 1),
          limit: String(params?.limit || 20),
        });
        if (params?.q) query.set('q', params.q);
        if (params?.status) query.set('status', params.status);
        if (params?.customerId) query.set('customerId', params.customerId);
        if (params?.technicianId) query.set('technicianId', params.technicianId);

        return `/businesses/${encodeURIComponent(businessId)}/tickets?${query.toString()}`;
      },
      providesTags: ['Tickets'],
    }),

    getTicketById: builder.query<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string }
    >({
      query: ({ businessId, ticketId }) =>
        `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}`,
      providesTags: (_result, _err, { ticketId }) => [{ type: 'Tickets', id: ticketId }],
    }),

    createTicket: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; body: CreateTicketInput }
    >({
      query: ({ businessId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tickets', 'Membership:ME', 'Dashboard'],
    }),

    assignTechnician: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: AssignTechnicianInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/assignment`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        'Dashboard',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    updateIntake: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: UpdateIntakeInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/intake`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    saveDiagnosis: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: DiagnosisInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/diagnosis`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    saveEstimateDraft: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: EstimateDraftInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/estimate-draft`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    submitEstimate: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: SubmitEstimateInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/estimates`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        'Dashboard',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    respondToEstimate: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: ApprovalInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/approval`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        'Dashboard',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    transitionTicket: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: TransitionTicketInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/transitions`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        'Dashboard',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    handoverTicket: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; body: HandoverInput }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/handover`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        'Dashboard',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    issueTrackingAccess: builder.mutation<
      ApiResponse<TrackingAccessResponse>,
      { businessId: string; ticketId: string; expectedRevision: number }
    >({
      query: ({ businessId, ticketId, expectedRevision }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/tracking-access`,
        method: 'POST',
        body: { expectedRevision },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    getPublicTracking: builder.mutation<
      ApiResponse<PublicTrackingResult>,
      PublicTrackingInput
    >({
      query: (body) => ({
        url: `/public/tracking`,
        method: 'POST',
        body,
      }),
    }),

    uploadFile: builder.mutation<
      ApiResponse<{ key: string; originalName: string; size: number; downloadUrl: string }>,
      FormData
    >({
      query: (formData) => ({
        url: '/uploads',
        method: 'POST',
        body: formData,
      }),
    }),

    addAttachment: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      {
        businessId: string;
        ticketId: string;
        body: { key: string; visibility: 'customer' | 'staff'; expectedRevision: number };
      }
    >({
      query: ({ businessId, ticketId, body }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/attachments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    detachAttachment: builder.mutation<
      ApiResponse<{ ticket: ServiceTicket }>,
      { businessId: string; ticketId: string; key: string; expectedRevision: number }
    >({
      query: ({ businessId, ticketId, key, expectedRevision }) => ({
        url: `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(key)}`,
        method: 'DELETE',
        body: { expectedRevision },
      }),
      invalidatesTags: (_result, _err, { ticketId }) => [
        'Tickets',
        { type: 'Tickets', id: ticketId },
      ],
    }),

    getAttachmentDownload: builder.query<
      ApiResponse<{ downloadUrl: string }>,
      { businessId: string; ticketId: string; key: string }
    >({
      query: ({ businessId, ticketId, key }) =>
        `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(key)}`,
    }),

    getTimeline: builder.query<
      ApiResponse<{ timeline: TimelineEvent[] }>,
      { businessId: string; ticketId: string }
    >({
      query: ({ businessId, ticketId }) =>
        `/businesses/${encodeURIComponent(businessId)}/tickets/${encodeURIComponent(ticketId)}/timeline`,
    }),
  }),
});

export const {
  useDeleteAnonymousTicketMutation,
  useGetCustomerApprovalLinkQuery,
  useInspectServiceApprovalQuery,
  useRespondServiceApprovalMutation,
  useSubmitServiceRequestMutation,
  useGetTicketsQuery,
  useGetTicketByIdQuery,
  useCreateTicketMutation,
  useAssignTechnicianMutation,
  useUpdateIntakeMutation,
  useSaveDiagnosisMutation,
  useSaveEstimateDraftMutation,
  useSubmitEstimateMutation,
  useRespondToEstimateMutation,
  useTransitionTicketMutation,
  useHandoverTicketMutation,
  useIssueTrackingAccessMutation,
  useGetPublicTrackingMutation,
  useUploadFileMutation,
  useAddAttachmentMutation,
  useDetachAttachmentMutation,
  useGetAttachmentDownloadQuery,
  useGetTimelineQuery,
} = ticketsApi;
