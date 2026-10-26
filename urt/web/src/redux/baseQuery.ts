import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ApiResponse } from '../lib/api.types';
import {
  getCsrfToken,
  setCsrfToken,
  getDeviceId,
  setDeviceId,
  getRefreshPromise,
  setRefreshPromise,
} from '../lib/session';
import { tokenRefreshed, sessionEnded } from '../features/auth/authSlice';
import type { RootState } from './store';
import { getApiErrorMessage, successMessages } from '../lib/api-messages';
import { toastAdded } from '../components/feedback/toastSlice';

export const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  credentials: 'include',
  prepareHeaders(headers, { getState }) {
    const token = (getState() as RootState).auth.accessToken;
    const deviceId = getDeviceId();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (deviceId) headers.set('X-Device-Id', deviceId);
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
    return headers;
  },
  responseHandler: async (response) => {
    const body = await response.text();
    return body.trim() ? (JSON.parse(body) as unknown) : null;
  },
});

function isCsrfError(error: FetchBaseQueryError): boolean {
  if (error.status !== 403) return false;
  const data = error.data as { code?: string; error?: string } | undefined;
  const code = data?.code || '';
  const message = data?.error || '';
  return code.includes('CSRF') || message.toLowerCase().includes('csrf');
}

function isAuthBypassUrl(url: string): boolean {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/google') ||
    url.includes('/auth/refresh-token') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/verify-reset-otp') ||
    url.includes('/auth/csrf-token')
  );
}

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  options,
) => {
  const method = typeof args === 'string' ? 'GET' : (args.method || 'GET').toUpperCase();
  const url = typeof args === 'string' ? args : args.url;

  // Bootstrap CSRF before unsafe requests if missing.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !getCsrfToken()) {
    const bootstrap = await rawBaseQuery(
      { url: '/auth/csrf-token', cache: 'no-store' },
      api,
      options,
    );
    const token = (bootstrap.data as ApiResponse<{ csrfToken?: string }> | undefined)?.data
      ?.csrfToken;
    if (token) setCsrfToken(token);
  }

  let result = await rawBaseQuery(args, api, options);

  // Capture replacement CSRF token or device ID returned in responses.
  if (result.data) {
    const resData = (result.data as { data?: { csrfToken?: string; deviceId?: string } })?.data;
    if (resData?.csrfToken) setCsrfToken(resData.csrfToken);
    if (resData?.deviceId) setDeviceId(resData.deviceId);
  }

  // Handle 403 CSRF token expiry/mismatch: refresh CSRF and retry once.
  if (result.error && isCsrfError(result.error)) {
    setCsrfToken(null);
    const bootstrap = await rawBaseQuery(
      { url: '/auth/csrf-token', cache: 'no-store' },
      api,
      options,
    );
    const token = (bootstrap.data as ApiResponse<{ csrfToken?: string }> | undefined)?.data
      ?.csrfToken;
    if (token) {
      setCsrfToken(token);
      result = await rawBaseQuery(args, api, options);
    }
  }

  // Handle 401 Unauthorized for protected endpoints: bound refresh with shared in-flight promise.
  if (result.error && result.error.status === 401 && !isAuthBypassUrl(url)) {
    let refresh = getRefreshPromise();
    if (!refresh) {
      refresh = (async () => {
        if (!getCsrfToken()) {
          const csrfRes = await rawBaseQuery(
            { url: '/auth/csrf-token', cache: 'no-store' },
            api,
            options,
          );
          const token = (csrfRes.data as ApiResponse<{ csrfToken?: string }> | undefined)?.data
            ?.csrfToken;
          if (token) setCsrfToken(token);
        }
        const refreshResult = await rawBaseQuery(
          { url: '/auth/refresh-token', method: 'POST' },
          api,
          options,
        );
        if (refreshResult.data) {
          const payload = (
            refreshResult.data as ApiResponse<{ accessToken: string; deviceId?: string }>
          ).data;
          if (payload?.deviceId) setDeviceId(payload.deviceId);
          if (payload?.accessToken) {
            api.dispatch({
              type: tokenRefreshed.type,
              payload: { accessToken: payload.accessToken },
            });
            return payload.accessToken;
          }
        }
        if (
          refreshResult.error &&
          (refreshResult.error.status === 401 || refreshResult.error.status === 403)
        ) {
          api.dispatch(sessionEnded());
        }
        return null;
      })().finally(() => {
        setRefreshPromise(null);
      });
      setRefreshPromise(refresh);
    }

    const newToken = await refresh;
    if (newToken) {
      result = await rawBaseQuery(args, api, options);
    }
  }

  if (result.error) {
    const message = getApiErrorMessage(result.error);
    // Keep existing inline error handlers consistent with the global toast.
    if (typeof result.error.status === 'number' || result.error.status === 'CUSTOM_ERROR') {
      const body = typeof result.error.data === 'object' && result.error.data !== null
        ? result.error.data : {};
      result.error = { ...result.error, data: { ...body, error: message, message } };
    } else {
      result.error = { ...result.error, error: message };
    }
    if (!api.signal.aborted) api.dispatch(toastAdded({ type: 'error', message }));
  } else if (api.type === 'mutation' && Object.hasOwn(successMessages, api.endpoint) && !api.signal.aborted) {
    api.dispatch(toastAdded({ type: 'success', message: successMessages[api.endpoint] }));
  }

  return result;
};
