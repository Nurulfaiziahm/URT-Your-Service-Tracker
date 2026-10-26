import { baseApi } from '../../redux/baseApi';
import type { ApiResponse, PaginatedResponse } from '../../lib/api.types';
export interface SubscriptionPackage {
  code: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: 'month' | 'year';
  maxTechnicians: number | null;
  includesInventory: boolean;
  includesPrioritySupport: boolean;
  includesFinancialExport: boolean;
  includesBrandedReceipts: boolean;
}
export interface AvailablePackage extends SubscriptionPackage {
  id: string;
  description?: string;
  features: string[];
  isPopular: boolean;
}
export interface SubscriptionPayment {
  id: string;
  businessId: string;
  reference: string;
  package: SubscriptionPackage;
  amount: number;
  currency: string;
  paymentMethod: 'manual' | 'demo';
  status: 'pending' | 'paid' | 'failed' | 'expired';
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
}
export interface Subscription {
  status: 'active' | 'expired' | 'unpaid';
  planName: string | null;
  package: SubscriptionPackage | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  daysRemaining: number;
  occupiedTechnicianSeats: number;
  pendingPayment: SubscriptionPayment | null;
}
const subscriptionApi = baseApi
  .enhanceEndpoints({ addTagTypes: ['Subscription'] })
  .injectEndpoints({
    endpoints: (builder) => ({
      getPackages: builder.query<ApiResponse<{ packages: AvailablePackage[] }>, void>({
        query: () => '/packages',
      }),
      getSubscription: builder.query<ApiResponse<{ subscription: Subscription }>, string>({
        query: (id) => `/businesses/${encodeURIComponent(id)}/subscription`,
        providesTags: ['Subscription'],
      }),
      getSubscriptionPayments: builder.query<
        PaginatedResponse<SubscriptionPayment>,
        { businessId: string; page?: number }
      >({
        query: ({ businessId, page = 1 }) =>
          `/businesses/${encodeURIComponent(businessId)}/subscription/payments?page=${page}&limit=20`,
        providesTags: ['Subscription'],
      }),
      getSubscriptionPayment: builder.query<
        ApiResponse<{ payment: SubscriptionPayment; instructions: string; demoConfirmationAvailable: boolean }>,
        { businessId: string; paymentId: string }
      >({
        query: ({ businessId, paymentId }) => `/businesses/${encodeURIComponent(businessId)}/subscription/payments/${encodeURIComponent(paymentId)}`,
        providesTags: ['Subscription'],
      }),
      confirmDemoSubscriptionPayment: builder.mutation<
        ApiResponse<{ payment: SubscriptionPayment; subscription: Subscription }>,
        { businessId: string; paymentId: string }
      >({
        query: ({ businessId, paymentId }) => ({
          url: `/businesses/${encodeURIComponent(businessId)}/subscription/payments/${encodeURIComponent(paymentId)}/confirm-demo`,
          method: 'POST',
          body: {},
        }),
        invalidatesTags: ['Subscription', 'Dashboard', 'Membership:ME'],
      }),
      checkoutSubscription: builder.mutation<
        ApiResponse<{ payment: SubscriptionPayment; instructions: string }>,
        { businessId: string; packageCode: string }
      >({
        query: ({ businessId, packageCode }) => ({
          url: `/businesses/${encodeURIComponent(businessId)}/subscription/checkout`,
          method: 'POST',
          body: { packageCode, paymentMethod: 'manual' },
        }),
        invalidatesTags: ['Subscription', 'Dashboard'],
      }),
    }),
  });
export const {
  useGetPackagesQuery,
  useGetSubscriptionQuery,
  useGetSubscriptionPaymentsQuery,
  useCheckoutSubscriptionMutation,
  useGetSubscriptionPaymentQuery,
  useConfirmDemoSubscriptionPaymentMutation,
} = subscriptionApi;
