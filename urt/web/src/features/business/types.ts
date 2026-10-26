export type BusinessRole = 'owner' | 'technician' | 'customer';

export interface UserBusinessContextItem {
  businessId: string;
  slug: string;
  name: string;
  roles: BusinessRole[];
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  businessHours?: string;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicBusiness {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  businessHours?: string;
  timezone: string;
  currency: string;
  contactEmail?: string;
}

export interface PublicBusinessResponse {
  business: PublicBusiness;
  services: {
    id: string;
    name: string;
    category: string;
    basePrice: number;
    estimatedDuration?: string;
    description?: string;
  }[];
}

export interface CreateBusinessInput {
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  businessHours?: string;
  timezone?: string;
  currency?: string;
}

export interface UpdateBusinessInput {
  name?: string;
  address?: string;
  phone?: string;
  contactEmail?: string;
  businessHours?: string;
  timezone?: string;
  currency?: string;
}

export interface BusinessState {
  selectedBusinessId: string | null;
  selectedPortal: BusinessRole | null;
}
