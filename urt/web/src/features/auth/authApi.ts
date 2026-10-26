import { baseApi } from '../../redux/baseApi';
import type { ApiResponse } from '../../lib/api.types';
import { setCsrfToken, setDeviceId } from '../../lib/session';
import { credentialsReceived, profileUpdated, sessionEnded } from './authSlice';
import type {
  User,
  DeviceSession,
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  VerifyResetOtpRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  AuthSuccessData,
} from './types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthSuccessData>, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data) {
            if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
            if (data.data.deviceId) setDeviceId(data.data.deviceId);
            dispatch(
              credentialsReceived({
                user: data.data.user,
                accessToken: data.data.accessToken,
              }),
            );
          }
        } catch {
          /* Errors are handled in the calling component */
        }
      },
    }),

    register: builder.mutation<ApiResponse<AuthSuccessData>, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data) {
            if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
            if (data.data.deviceId) setDeviceId(data.data.deviceId);
            dispatch(
              credentialsReceived({
                user: data.data.user,
                accessToken: data.data.accessToken,
              }),
            );
          }
        } catch {
          /* Errors are handled in the calling component */
        }
      },
    }),

    googleLogin: builder.mutation<ApiResponse<AuthSuccessData>, GoogleLoginRequest>({
      query: (body) => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data) {
            if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
            if (data.data.deviceId) setDeviceId(data.data.deviceId);
            dispatch(
              credentialsReceived({
                user: data.data.user,
                accessToken: data.data.accessToken,
              }),
            );
          }
        } catch {
          /* Errors are handled in the calling component */
        }
      },
    }),

    logout: builder.mutation<ApiResponse<null>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionEnded());
        }
      },
    }),

    logoutAll: builder.mutation<ApiResponse<{ devicesLoggedOut: number }>, void>({
      query: () => ({
        url: '/auth/logout-all',
        method: 'POST',
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(sessionEnded());
        }
      },
    }),

    getProfile: builder.query<ApiResponse<{ user: User }>, void>({
      query: () => '/auth/profile',
      providesTags: ['Profile:ME'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data?.user) {
            dispatch(profileUpdated(data.data.user));
          }
        } catch {
          /* In case profile cannot be fetched */
        }
      },
    }),

    updateProfile: builder.mutation<ApiResponse<{ user: User }>, UpdateProfileRequest>({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile:ME'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data?.user) {
            dispatch(profileUpdated(data.data.user));
          }
        } catch {
          /* Errors are handled in the component */
        }
      },
    }),

    changePassword: builder.mutation<
      ApiResponse<{ user: User; accessToken: string; deviceId: string; csrfToken: string }>,
      ChangePasswordRequest
    >({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile:ME', 'Devices:ME'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data.data) {
            if (data.data.csrfToken) setCsrfToken(data.data.csrfToken);
            if (data.data.deviceId) setDeviceId(data.data.deviceId);
            dispatch(
              credentialsReceived({
                user: data.data.user,
                accessToken: data.data.accessToken,
              }),
            );
          }
        } catch {
          /* Handled in component */
        }
      },
    }),

    forgotPassword: builder.mutation<ApiResponse<null>, ForgotPasswordRequest>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    verifyResetOtp: builder.mutation<ApiResponse<{ resetToken: string }>, VerifyResetOtpRequest>({
      query: (body) => ({
        url: '/auth/verify-reset-otp',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: builder.mutation<ApiResponse<null>, ResetPasswordRequest>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    verifyEmail: builder.mutation<ApiResponse<null>, VerifyEmailRequest>({
      query: (body) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile:ME'],
    }),

    resendVerification: builder.mutation<ApiResponse<null>, ResendVerificationRequest>({
      query: (body) => ({
        url: '/auth/resend-verification',
        method: 'POST',
        body,
      }),
    }),

    getDevices: builder.query<ApiResponse<{ devices: DeviceSession[] }>, void>({
      query: () => '/auth/devices',
      providesTags: ['Devices:ME'],
    }),

    revokeDevice: builder.mutation<ApiResponse<null>, string>({
      query: (deviceId) => ({
        url: `/auth/devices/${encodeURIComponent(deviceId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Devices:ME'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
  useLogoutAllMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useVerifyResetOtpMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useGetDevicesQuery,
  useRevokeDeviceMutation,
} = authApi;
