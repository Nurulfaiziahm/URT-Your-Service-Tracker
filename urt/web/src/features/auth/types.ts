/** Browser representation of the current safe API profile; dates arrive as ISO strings. */
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  isEmailVerified: boolean;
  hasPassword: boolean;
  canChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'unavailable';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: SessionStatus;
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  lastSeen: string;
  isCurrent: boolean;
}

export interface LoginRequest {
  portal: 'owner' | 'customer' | 'technician';
  email: string;
  password: string;
  invitationToken?: string;
}

export interface RegisterRequest {
  portal: 'owner' | 'customer';
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface GoogleLoginRequest {
  portal?: 'owner' | 'customer' | 'technician';
  idToken: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  portal: 'owner' | 'customer' | 'technician';
  email: string;
}

export interface VerifyResetOtpRequest {
  portal: 'owner' | 'customer' | 'technician';
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  portal: 'owner' | 'customer' | 'technician';
  resetToken: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface AuthSuccessData {
  user: User;
  accessToken: string;
  deviceId?: string;
  csrfToken?: string;
  isNewUser?: boolean;
}
