import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, User } from './types';

const initialState: AuthState = { user: null, accessToken: null, status: 'loading' };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRestoring(state) {
      state.status = 'loading';
    },
    credentialsReceived(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    profileUpdated(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    tokenRefreshed(state, action: PayloadAction<{ accessToken: string }>) {
      state.accessToken = action.payload.accessToken;
      state.status = 'authenticated';
    },
    sessionUnavailable(state) {
      state.status = 'unavailable';
    },
    sessionEnded(state) {
      state.user = null;
      state.accessToken = null;
      state.status = 'anonymous';
    },
  },
});

export const {
  sessionRestoring,
  credentialsReceived,
  profileUpdated,
  tokenRefreshed,
  sessionUnavailable,
  sessionEnded,
} = authSlice.actions;

export default authSlice.reducer;

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectSessionStatus = (state: { auth: AuthState }) => state.auth.status;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.status === 'authenticated' && Boolean(state.auth.user);
