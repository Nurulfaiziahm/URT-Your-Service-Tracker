import { UserResponse } from '../../types/common.js';

export interface TokenPayload {
  sub: string;
  deviceId: string;
  sid: string;
  jti: string;
  type: 'access' | 'refresh';
  iss: string;
  aud: string;
  sv: string;
  iat: number;
  exp: number;
}

// Refresh credentials are internal service results, never JSON response fields.
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  expiresAt: number;
}

export interface AuthResponse extends TokenRefreshResult {
  user: UserResponse;
}

export interface GoogleAuthResponse extends AuthResponse {
  isNewUser: boolean;
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  lastSeen: Date;
  isCurrent: boolean;
}
