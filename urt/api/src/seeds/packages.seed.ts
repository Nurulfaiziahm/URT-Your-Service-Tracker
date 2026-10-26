import { connectDatabase, disconnectDatabase } from '../core/config/database.js';
import { Package } from '../models/Package.model.js';

// Matches the two pricing cards in web/src/features/public/LandingPage.tsx.
const packages = [
  {
    code: 'monthly',
    name: 'Bulanan',
    description:
      'Cocok untuk tempat servis independen yang ingin mulai merapikan operasional tanpa komitmen panjang.',
    price: 99000,
    currency: 'IDR',
    billingInterval: 'month',
    features: [
      'Manajemen Tiket & Servis Tak Terbatas',
      'Portal Lacak Mandiri untuk Pelanggan',
      'Akses hingga 3 Akun Teknisi',
      'Input Diagnosis & Estimasi Real-time',
      'Laporan Ringkasan Transaksi Bulanan',
      'Penyimpanan Riwayat Servis Digital',
    ],
    maxTechnicians: 3,
    includesInventory: false,
    includesPrioritySupport: false,
    includesFinancialExport: false,
    includesBrandedReceipts: false,
    isPopular: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'annual',
    name: 'Tahunan (Hemat 17%)',
    description:
      'Solusi ideal untuk workshop dan tempat servis yang berkomitmen pada standar layanan jangka panjang.',
    price: 999000,
    currency: 'IDR',
    billingInterval: 'year',
    features: [
      'Semua fitur Paket Bulanan',
      'Akses Teknisi Tanpa Batas (Unlimited)',
      'Katalog Suku Cadang & Stok Spare Part',
      'Prioritas Dukungan Teknis Pelanggan',
      'Ekspor Laporan Finansial ke Excel / CSV',
      'Struk Servis Digital dengan Branding Tempat Servis',
    ],
    maxTechnicians: null,
    includesInventory: true,
    includesPrioritySupport: true,
    includesFinancialExport: true,
    includesBrandedReceipts: true,
    isPopular: true,
    isActive: true,
    sortOrder: 2,
  },
] as const;

try {
  await connectDatabase();
  await Package.init();
  for (const data of packages) {
    await Package.findOneAndUpdate(
      { code: data.code },
      { $set: data },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }
  console.log('Seeded monthly and annual packages.');
} catch (error) {
  console.error('Package seed failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
