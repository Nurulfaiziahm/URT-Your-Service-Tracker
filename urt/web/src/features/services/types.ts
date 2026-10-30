export interface RepairService {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number;
  entryType: 'service' | 'part' | 'difficulty';
  difficultyLevel?: 'low' | 'medium' | 'high' | 'complex';
  estimatedDuration?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  entryType?: RepairService['entryType'];
  difficultyLevel?: RepairService['difficultyLevel'];
  name: string;
  category: string;
  basePrice: number;
  description?: string;
  estimatedDuration?: string;
}

export interface UpdateServiceInput {
  entryType?: RepairService['entryType'];
  difficultyLevel?: RepairService['difficultyLevel'];
  name?: string;
  category?: string;
  basePrice?: number;
  description?: string;
  estimatedDuration?: string;
  status?: 'active' | 'archived';
}
