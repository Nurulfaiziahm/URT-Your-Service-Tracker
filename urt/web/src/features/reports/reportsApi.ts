import { baseApi } from '../../redux/baseApi';
import type { ApiResponse } from '../../lib/api.types';
import type { ReportOverviewData, ReportOverviewQueryParams } from './types';

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportOverview: builder.query<
      ApiResponse<ReportOverviewData>,
      { businessId: string; params?: ReportOverviewQueryParams }
    >({
      query: ({ businessId, params }) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.set('startDate', params.startDate);
        if (params?.endDate) query.set('endDate', params.endDate);
        const qStr = query.toString();
        return `/businesses/${encodeURIComponent(businessId)}/reports/overview${qStr ? `?${qStr}` : ''}`;
      },
      providesTags: ['Reports'],
    }),
  }),
});

export const { useGetReportOverviewQuery } = reportsApi;
