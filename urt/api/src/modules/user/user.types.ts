export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: Date;
}
