import type { RepairService } from './types';
import type { EstimateLine } from '../tickets/types';

export const difficultyLabels = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', complex: 'Rumit' } as const;
export const catalogTypeLabels = { service: 'Layanan', part: 'Suku Cadang', difficulty: 'Tarif Tingkat Kesulitan' } as const;

export function catalogEstimateLine(item: RepairService): EstimateLine {
  return { catalogItemId: item.id, catalogEntryType: item.entryType || 'service', difficultyLevel: item.difficultyLevel,
    description: item.name, type: item.entryType === 'part' ? 'part' : 'labor', quantity: 1, unitPrice: item.basePrice };
}
