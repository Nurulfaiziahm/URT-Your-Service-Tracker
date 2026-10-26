export interface RepairService {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  estimatedDuration?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  category: string;
  basePrice: number;
  description?: string;
  estimatedDuration?: string;
}

export interface UpdateServiceInput {
  name?: string;
  category?: string;
  basePrice?: number;
  description?: string;
  estimatedDuration?: string;
  status?: 'active' | 'archived';
}
