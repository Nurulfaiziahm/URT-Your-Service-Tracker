import { createListenerMiddleware } from '@reduxjs/toolkit';
import {
  credentialsReceived,
  sessionEnded,
  sessionUnavailable,
} from '../features/auth/authSlice';
import { clearBusinessSelection } from '../features/business/businessSlice';
import type { User } from '../features/auth/types';
import type { ApiResponse } from '../lib/api.types';
import {
  clearSessionState,
  getBootstrapPromise,
  getCsrfToken,
  setBootstrapPromise,
  setCsrfToken,
  setDeviceId,
} from '../lib/session';
import { baseApi } from './baseApi';
import { rawBaseQuery } from './baseQuery';
import type { AppStore } from './store';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { toastAdded } from '../components/feedback/toastSlice';
import { errorMessages } from '../lib/api-messages';

export const sessionListener = createListenerMiddleware();
sessionListener.startListening({
  actionCreator: credentialsReceived,
  effect: (action, api) => {
    const previous = api.getOriginalState() as ReturnType<AppStore['getState']>;
    if (previous.auth.user?.id !== action.payload.user.id) {
      api.dispatch(clearBusinessSelection());
      api.dispatch(baseApi.util.resetApiState());
    }
  },
});
sessionListener.startListening({
  actionCreator: sessionEnded,
  effect: (_action, api) => {
    clearSessionState();
    api.dispatch(clearBusinessSelection());
    api.dispatch(baseApi.util.resetApiState());
  },
});

sessionListener.startListening({
  actionCreator: sessionUnavailable,
  effect: (_action, api) => {
    api.dispatch(toastAdded({ type: 'error', message: errorMessages.AUTH_UNAVAILABLE }));
  },
});

export function restoreSession(store: AppStore) {
  const { dispatch, getState } = store;
  const existing = getBootstrapPromise();
  if (existing) return existing;

  const controller = new AbortController();
  const api: BaseQueryApi = {
    dispatch,
    getState,
    signal: controller.signal,
    abort: () => controller.abort(),
    extra: undefined,
    endpoint: 'restoreSession',
    type: 'query',
  };

  const promise = (async () => {
    try {
      // 1. Pre-fetch CSRF token if not already stored
      if (!getCsrfToken()) {
        const csrfRes = await rawBaseQuery(
          { url: '/auth/csrf-token', cache: 'no-store' },
          api,
          {},
        );
        const token = (csrfRes.data as ApiResponse<{ csrfToken?: string }> | undefined)?.data
          ?.csrfToken;
        if (token) setCsrfToken(token);
      }

      // 2. Attempt token refresh with the HttpOnly refresh cookie
      const refreshRes = await rawBaseQuery(
        { url: '/auth/refresh-token', method: 'POST' },
        api,
        {},
      );

      if (refreshRes.data) {
        const payload = (
          refreshRes.data as ApiResponse<{ accessToken: string; deviceId?: string }>
        ).data;
        if (payload?.deviceId) setDeviceId(payload.deviceId);
        if (payload?.accessToken) {
          // 3. Load user profile with newly acquired token
          const profileRes = await rawBaseQuery(
            {
              url: '/auth/profile',
              headers: { Authorization: `Bearer ${payload.accessToken}` },
            },
            api,
            {},
          );
          if (profileRes.data) {
            const user = (profileRes.data as ApiResponse<{ user: User }>).data?.user;
            if (user) {
              dispatch(credentialsReceived({ user, accessToken: payload.accessToken }));
              return true;
            }
          }
        }
      }

      // Refresh rejected with 401/403: valid anonymous visitor
      if (
        refreshRes.error &&
        (refreshRes.error.status === 401 || refreshRes.error.status === 403)
      ) {
        dispatch(sessionEnded());
        return false;
      }

      // Server offline, 503, or network outage
      if (
        refreshRes.error &&
        (refreshRes.error.status === 'FETCH_ERROR' ||
          (typeof refreshRes.error.status === 'number' && refreshRes.error.status >= 500))
      ) {
        dispatch(sessionUnavailable());
        return false;
      }

      dispatch(sessionEnded());
      return false;
    } catch {
      dispatch(sessionUnavailable());
      return false;
    }
  })();

  setBootstrapPromise(promise);
  return promise;
}
