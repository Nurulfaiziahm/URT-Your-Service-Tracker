import mongoose from 'mongoose';
import { Service } from '../../models/Service.model.js';
import type { IEstimateLine } from '../../models/ServiceTicket.model.js';
import { AppError } from '../../middleware/error-handler.js';

type PriceInput = { catalogItemId?: string | mongoose.Types.ObjectId; description: string; type: 'part' | 'labor'; quantity: number; unitPrice: number };

export async function resolveEstimatePricing(businessId: mongoose.Types.ObjectId, input: PriceInput[]) {
  const ids = input.flatMap((line) => line.catalogItemId ? [String(line.catalogItemId)] : []);
  if (new Set(ids).size !== ids.length) throw new AppError('Item katalog yang sama cukup ditambahkan satu kali. Ubah jumlahnya bila perlu.', 400, 'DUPLICATE_CATALOG_ITEM');
  const catalog = ids.length ? await Service.find({ businessId, status: 'active', deletedAt: { $exists: false }, _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }) : [];
  const byId = new Map(catalog.map((item) => [String(item._id), item]));
  let difficultyCount = 0;
  const lines: IEstimateLine[] = input.map((line) => {
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1 || !Number.isSafeInteger(line.unitPrice) || line.unitPrice < 0) throw new AppError('Jumlah atau harga tidak valid.', 400, 'INVALID_AMOUNT');
    const item = line.catalogItemId ? byId.get(String(line.catalogItemId)) : undefined;
    if (line.catalogItemId && !item) throw new AppError('Item katalog tidak tersedia atau sudah diarsipkan. Pilih ulang dari katalog owner.', 400, 'CATALOG_ITEM_UNAVAILABLE');
    if (!item) return { description: line.description, type: line.type, quantity: line.quantity, unitPrice: line.unitPrice, total: line.quantity * line.unitPrice };
    if (item.basePrice !== line.unitPrice || item.name !== line.description || line.type !== (item.entryType === 'part' ? 'part' : 'labor')) throw new AppError('Harga atau informasi katalog telah berubah. Pilih ulang item dari katalog owner.', 409, 'CATALOG_PRICE_CHANGED');
    if (item.entryType === 'difficulty') {
      difficultyCount += 1;
      if (difficultyCount > 1 || line.quantity !== 1 || !item.difficultyLevel) throw new AppError('Pilih satu tingkat kesulitan dengan jumlah satu.', 400, 'INVALID_DIFFICULTY');
    }
    return { catalogItemId: item._id, catalogEntryType: item.entryType || 'service', difficultyLevel: item.difficultyLevel,
      description: item.name, type: item.entryType === 'part' ? 'part' : 'labor', quantity: line.quantity, unitPrice: item.basePrice, total: line.quantity * item.basePrice };
  });
  if (difficultyCount !== 1) throw new AppError('Pilih tingkat kesulitan servis sebelum menyimpan atau mengajukan estimasi.', 400, 'DIFFICULTY_REQUIRED');
  const totalAmount = lines.reduce((sum, line) => sum + line.total, 0);
  if (!Number.isSafeInteger(totalAmount)) throw new AppError('Calculated total exceeds safe integer amount', 400, 'INVALID_AMOUNT');
  return { lines, totalAmount };
}
