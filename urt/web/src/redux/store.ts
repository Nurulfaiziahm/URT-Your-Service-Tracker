import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from '../features/auth/authSlice';
import businessReducer from '../features/business/businessSlice';
import { baseApi } from './baseApi';
import { sessionListener } from './sessionLifecycle';
import toastReducer from '../components/feedback/toastSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    business: businessReducer,
    toasts: toastReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware()
    .prepend(sessionListener.middleware)
    .concat(baseApi.middleware),
  // Credential-bearing auth/API actions should not enter debug history.
  devTools: import.meta.env.DEV ? {
    actionsDenylist: ['auth/credentialsReceived', 'baseApi/.*'],
    stateSanitizer: <S>(state: S): S => {
      if (!state || typeof state !== 'object') return state;
      const s = state as Record<string, unknown>;
      return {
        ...s,
        auth: s.auth && typeof s.auth === 'object'
          ? { ...s.auth, accessToken: (s.auth as { accessToken?: unknown }).accessToken ? '[redacted]' : null }
          : s.auth,
        baseApi: '[API state hidden]',
      } as S;
    },
  } : false,
});

setupListeners(store.dispatch);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;
