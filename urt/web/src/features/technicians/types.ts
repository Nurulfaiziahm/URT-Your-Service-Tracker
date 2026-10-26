export interface Technician {
  id: string;
  businessId: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  specializations: string[];
  status: 'pending' | 'active' | 'inactive';
  invitationToken?: string;
  invitationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InviteTechnicianInput {
  name: string;
  email: string;
  phone?: string;
  specializations?: string[];
}

export interface UpdateTechnicianInput {
  name?: string;
  phone?: string;
  specializations?: string[];
  status?: 'active' | 'inactive';
}
