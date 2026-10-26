export interface Customer {
  id: string;
  businessId: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'archived';
  invitationStatus?: 'none' | 'pending' | 'accepted' | 'expired';
  invitationToken?: string;
  invitationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'archived';
}
