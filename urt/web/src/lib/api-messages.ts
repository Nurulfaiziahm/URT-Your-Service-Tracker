import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ApiErrorBody } from './api.types';

// Public codes emitted by the backend. Keep UI wording here rather than in forms.
export const errorMessages: Record<string, string> = {
  ACCESS_TOKEN_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  ACCOUNT_CHANGED: 'Data akun telah berubah. Muat ulang halaman lalu coba lagi.',
  ACCOUNT_DISABLED: 'Akun Anda tidak aktif. Hubungi pengelola untuk bantuan.',
  ACCOUNT_LINK_REQUIRED: 'Email ini sudah memiliki akun. Masuk dengan metode yang sebelumnya digunakan.',
  ACTIVE_PACKAGE_CHANGE: 'Paket aktif hanya dapat diperpanjang. Pilih paket lain setelah masa aktif berakhir.',
  ALREADY_ACTIVE: 'Akun Anda sudah menjadi teknisi aktif di tempat servis ini.',
  ALREADY_ATTACHED: 'Berkas ini sudah dilampirkan pada tiket.',
  ALREADY_LINKED: 'Data pelanggan ini sudah terhubung dengan akun.',
  ALREADY_VOIDED: 'Invoice ini sudah dibatalkan.',
  ATTACHMENT_FORBIDDEN: 'Anda tidak memiliki akses ke lampiran ini.',
  ATTACHMENT_NOT_FOUND: 'Lampiran tidak ditemukan atau sudah dihapus.',
  AUTH_UNAVAILABLE: 'Layanan masuk sedang tidak tersedia. Silakan coba lagi nanti.',
  BUSINESS_ALREADY_EXISTS: 'Akun Anda sudah memiliki tempat servis terdaftar.',
  BUSINESS_FORBIDDEN: 'Anda tidak memiliki izin untuk tindakan ini atau tempat servis sedang tidak aktif.',
  CANNOT_VOID_PAID_INVOICE: 'Invoice yang sudah menerima pembayaran tidak dapat dibatalkan.',
  CSRF_INVALID: 'Sesi keamanan tidak valid. Muat ulang halaman lalu coba lagi.',
  CSRF_MISSING: 'Sesi keamanan belum tersedia. Muat ulang halaman lalu coba lagi.',
  CUSTOMER_HAS_ACTIVE_TICKETS: 'Pelanggan masih memiliki tiket aktif. Selesaikan tiket sebelum menonaktifkannya.',
  CUSTOMER_NOT_FOUND: 'Data pelanggan tidak ditemukan di tempat servis ini.',
  CUSTOMER_REQUIRED: 'Pilih pelanggan terlebih dahulu untuk membuat tiket.',
  DATE_RANGE_TOO_LARGE: 'Rentang laporan maksimal 366 hari. Pilih rentang yang lebih pendek.',
  DUPLICATE_PAYMENT_OPERATION: 'Pembayaran ini sudah tercatat. Periksa riwayat sebelum mencatat kembali.',
  EMAIL_MISMATCH: 'Masuk menggunakan alamat email yang menerima undangan ini.',
  EMAIL_NOT_VERIFIED: 'Verifikasi email Anda sebelum melanjutkan.',
  EMAIL_REQUIRED: 'Masukkan alamat email untuk melanjutkan.',
  ESTIMATE_CHANGED: 'Estimasi telah diperbarui. Muat ulang dan periksa rincian terbaru.',
  ESTIMATE_LINES_REQUIRED: 'Tambahkan setidaknya satu rincian biaya pada estimasi.',
  ESTIMATE_NOT_APPROVABLE: 'Estimasi ini belum dapat disetujui atau sudah diproses.',
  EXPLANATION_REQUIRED: 'Isi penjelasan untuk pelanggan sebelum melanjutkan.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
  GOOGLE_AUTH_DISABLED: 'Masuk dengan Google belum tersedia. Gunakan email dan kata sandi.',
  GOOGLE_TOKEN_INVALID: 'Verifikasi Google gagal. Coba masuk dengan Google kembali.',
  INVALID_AMOUNT: 'Masukkan jumlah pembayaran yang valid.',
  INVALID_DATE_RANGE: 'Tanggal mulai tidak boleh melewati tanggal selesai.',
  INVALID_DEVICE_ID: 'Identitas perangkat tidak valid. Muat ulang halaman lalu masuk kembali.',
  INVALID_FILE_TYPE: 'Jenis berkas tidak didukung. Pilih format yang diizinkan.',
  INVALID_INVOICE_STATUS: 'Tindakan ini tidak tersedia untuk status invoice saat ini.',
  INVALID_SERVICE: 'Layanan yang dipilih tidak tersedia di tempat servis ini.',
  INVALID_STATUS: 'Status yang dipilih tidak valid.',
  INVALID_STATUS_TRANSITION: 'Status tiket tidak dapat diubah ke tahap tersebut. Periksa tahapan yang tersedia.',
  INVALID_TECHNICIAN: 'Pilih teknisi yang aktif di tempat servis ini.',
  INVALID_TOKEN: 'Token atau tautan tidak valid atau kedaluwarsa. Masuk kembali atau minta tautan baru.',
  INVALID_UPLOAD: 'Berkas tidak valid atau kosong. Pilih berkas lain.',
  INVITATION_PENDING: 'Undangan masih menunggu penerimaan. Gunakan kirim ulang undangan jika diperlukan.',
  INVITATION_REQUIRED: 'Teknisi harus menerima undangan dengan email terverifikasi sebelum diaktifkan.',
  INVOICE_CHANGED: 'Invoice telah berubah. Muat ulang sebelum melanjutkan.',
  NOT_PENDING: 'Undangan ini sudah diproses atau tidak lagi menunggu penerimaan.',
  NO_APPROVED_ESTIMATE: 'Belum ada estimasi yang disetujui untuk tiket ini.',
  ORIGIN_NOT_ALLOWED: 'Alamat aplikasi ini tidak diizinkan mengakses layanan. Hubungi pengelola.',
  OVERPAYMENT_NOT_ALLOWED: 'Jumlah pembayaran melebihi sisa tagihan.',
  PACKAGE_NOT_FOUND: 'Paket langganan tidak ditemukan atau sudah tidak tersedia.',
  PASSWORD_NOT_SET: 'Akun ini belum memiliki kata sandi. Gunakan metode masuk yang terhubung dengan akun.',
  DEMO_PAYMENT_DISABLED: 'Konfirmasi demo tidak tersedia pada lingkungan produksi.',
  PAYMENT_NOT_FOUND: 'Invoice langganan tidak ditemukan di tempat servis ini.',
  PAYMENT_NOT_CONFIGURED: 'Pembayaran langganan belum tersedia. Hubungi pengelola layanan.',
  PAYMENT_PENDING: 'Masih ada pembayaran langganan yang menunggu konfirmasi. Periksa riwayat pembayaran.',
  PAYMENT_MISMATCH: 'Referensi, jumlah, atau mata uang pembayaran tidak sesuai dengan tagihan.',
  PAYMENT_NOT_PENDING: 'Pembayaran sudah diproses atau kedaluwarsa dan tidak dapat dikonfirmasi.',
  PAYMENT_ALREADY_PAID: 'Pembayaran sudah lunas dan tidak dapat dibatalkan melalui tindakan ini.',
  QC_NOTES_REQUIRED: 'Isi catatan pemeriksaan kualitas sebelum melanjutkan.',
  QC_REQUIRED: 'Selesaikan pemeriksaan kualitas sebelum menandai perbaikan selesai.',
  RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu beberapa saat sebelum mencoba lagi.',
  REASON_REQUIRED: 'Isi alasan untuk melanjutkan tindakan ini.',
  REFRESH_TOKEN_REUSED: 'Sesi Anda tidak lagi valid. Silakan masuk kembali.',
  REQUEST_FAILED: 'Permintaan belum dapat diproses. Periksa data Anda lalu coba lagi.',
  SCOPE_FORBIDDEN: 'Data ini tidak dapat digunakan pada tempat servis atau tiket yang dipilih.',
  SESSION_REVOKED: 'Sesi Anda telah diakhiri. Silakan masuk kembali.',
  SLUG_IN_USE: 'Alamat tempat servis sudah digunakan. Pilih alamat lain.',
  STATUS_CHANGE_FORBIDDEN: 'Hanya pemilik tempat servis yang dapat mengubah status teknisi.',
  STORAGE_UNAVAILABLE: 'Penyimpanan berkas sedang tidak tersedia. Coba lagi nanti.',
  SUBSCRIPTION_REQUIRED: 'Langganan belum aktif atau sudah berakhir. Pemilik perlu mengaktifkan paket terlebih dahulu.',
  TECHNICIAN_EXISTS: 'Teknisi dengan email ini sudah aktif di tempat servis Anda.',
  TECHNICIAN_HAS_ACTIVE_TICKETS: 'Teknisi masih memiliki tiket aktif. Alihkan penugasan sebelum menonaktifkannya.',
  TECHNICIAN_LIMIT_REACHED: 'Batas teknisi paket telah tercapai, termasuk undangan yang belum kedaluwarsa. Kurangi jumlah teknisi atau pilih paket lain.',
  TICKET_CHANGED: 'Tiket telah diperbarui oleh pengguna lain. Muat ulang sebelum melanjutkan.',
  TICKET_NOT_COMPLETED: 'Selesaikan perbaikan terlebih dahulu sebelum melakukan tindakan ini.',
  TRACKING_NOT_FOUND: 'Tiket pelacakan tidak ditemukan. Periksa nomor tiket dan kode akses Anda.',
  UPLOAD_DELETING: 'Berkas sedang dihapus. Tunggu atau pilih berkas lain.',
  UPLOAD_FORBIDDEN: 'Anda tidak memiliki izin untuk menggunakan berkas ini.',
  UPLOAD_IN_USE: 'Berkas masih digunakan pada tiket. Lepaskan lampiran sebelum menghapusnya.',
  UPLOAD_MIGRATION_REQUIRED: 'Berkas lama belum tersedia untuk diunduh. Hubungi pengelola.',
  UPLOAD_NOT_FOUND: 'Berkas tidak ditemukan atau sudah dihapus.',
  UPLOAD_TOO_LARGE: 'Ukuran berkas melebihi batas yang diizinkan. Pilih berkas yang lebih kecil.',
  VALIDATION_ERROR: 'Periksa kembali isian formulir Anda.',
  WORK_SUMMARY_REQUIRED: 'Isi ringkasan pekerjaan sebelum menyelesaikan perbaikan.',
};

// Older endpoints share REQUEST_FAILED; preserve their useful distinctions.
const legacyMessages: Record<string, string> = {
  'Invalid email or password': 'Email atau kata sandi tidak cocok. Silakan coba lagi.',
  'User already exists with this email': 'Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.',
  'Email already in use': 'Email ini sudah digunakan oleh akun lain.',
  'Current password is incorrect': 'Kata sandi saat ini tidak cocok.',
  'New password must be different from current password': 'Kata sandi baru harus berbeda dari kata sandi saat ini.',
  'Invalid or expired reset code': 'Kode pemulihan tidak valid atau kedaluwarsa. Minta kode baru.',
  'OTP has expired or does not exist': 'Kode verifikasi sudah kedaluwarsa. Minta kode baru.',
  'Invalid OTP': 'Kode verifikasi tidak cocok. Periksa kode yang Anda terima.',
  'Invalid or expired reset token': 'Sesi pemulihan kedaluwarsa. Ulangi proses lupa kata sandi.',
  'Email is already verified': 'Alamat email Anda sudah terverifikasi.',
  'No account found with that email': 'Tidak ada akun dengan alamat email tersebut.',
  'User not found': 'Akun tidak ditemukan.',
  'User not authenticated': 'Silakan masuk untuk melanjutkan.',
  'Business not found': 'Tempat servis tidak ditemukan.',
  'Business not found or inactive': 'Tempat servis tidak ditemukan atau sedang tidak aktif.',
  'Active business not found': 'Tempat servis tidak ditemukan atau sedang tidak aktif.',
  'Technician not found': 'Data teknisi tidak ditemukan.',
  'Customer not found': 'Data pelanggan tidak ditemukan.',
  'Customer record not found': 'Data pelanggan tidak ditemukan.',
  'Service not found': 'Layanan tidak ditemukan.',
  'Ticket not found': 'Tiket tidak ditemukan atau Anda tidak memiliki akses.',
  'Invoice not found': 'Invoice tidak ditemukan.',
  'Resource not found': 'Data tidak ditemukan.',
  'Duplicate field value entered': 'Data ini sudah digunakan. Periksa isian yang harus unik.',
  'Cannot revoke current device. Use logout instead.': 'Gunakan tombol keluar untuk mengakhiri sesi pada perangkat ini.',
};

const fieldLabels: Record<string, string> = {
  email: 'Email', password: 'Kata sandi', currentPassword: 'Kata sandi saat ini',
  newPassword: 'Kata sandi baru', firstName: 'Nama depan', lastName: 'Nama belakang',
  name: 'Nama', phone: 'Nomor telepon', address: 'Alamat', otp: 'Kode verifikasi',
  token: 'Token', resetToken: 'Token pemulihan', slug: 'Alamat tempat servis',
  amount: 'Jumlah pembayaran', paymentMethod: 'Metode pembayaran', packageCode: 'Paket',
  startDate: 'Tanggal mulai', endDate: 'Tanggal selesai', complaint: 'Keluhan',
  category: 'Kategori', model: 'Model perangkat', brand: 'Merek perangkat',
  customerId: 'Pelanggan', assignedTechnicianId: 'Teknisi', basePrice: 'Harga',
  notes: 'Catatan', reason: 'Alasan', status: 'Status',
};

export function getApiErrorMessage(error: FetchBaseQueryError): string {
  if (error.status === 'FETCH_ERROR') return 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.';
  if (error.status === 'TIMEOUT_ERROR') return 'Server terlalu lama merespons. Silakan coba lagi.';
  if (error.status === 'PARSING_ERROR') return 'Respons server tidak dapat dibaca. Muat ulang halaman atau coba lagi nanti.';
  const body = typeof error.data === 'object' && error.data !== null ? error.data as Partial<ApiErrorBody> : undefined;
  const code = body?.code;
  if (code === 'VALIDATION_ERROR' && body && Array.isArray(body.details)) {
    const fields = [...new Set(body.details.map((detail) => {
      const field = detail.field?.split('.').filter((part) => !['body', 'query', 'params'].includes(part)).at(-1);
      return field ? fieldLabels[field] : undefined;
    }).filter(Boolean))];
    return fields.length ? `Periksa isian berikut: ${fields.join(', ')}.` : errorMessages.VALIDATION_ERROR;
  }
  if (code && code !== 'REQUEST_FAILED' && Object.hasOwn(errorMessages, code)) return errorMessages[code];
  // Never surface raw infrastructure errors or backend stack details.
  if (typeof error.status === 'number' && error.status >= 500) return 'Layanan sedang mengalami kendala. Silakan coba lagi nanti.';
  if (body?.error && Object.hasOwn(legacyMessages, body.error)) return legacyMessages[body.error];
  if (error.status === 401) return 'Sesi Anda tidak valid. Silakan masuk kembali.';
  if (error.status === 403) return errorMessages.FORBIDDEN;
  if (error.status === 404) return 'Data tidak ditemukan atau sudah tidak tersedia.';
  if (error.status === 409) return 'Data telah berubah atau tindakan ini sudah diproses. Muat ulang lalu coba lagi.';
  if (error.status === 413) return errorMessages.UPLOAD_TOO_LARGE;
  if (error.status === 429) return errorMessages.RATE_LIMITED;
  return errorMessages.REQUEST_FAILED;
}

export const successMessages: Record<string, string> = {
  login: 'Berhasil masuk. Selamat datang kembali!',
  googleLogin: 'Berhasil masuk dengan Google.',
  register: 'Akun berhasil dibuat.',
  logout: 'Anda berhasil keluar.',
  logoutAll: 'Semua sesi berhasil diakhiri.',
  updateProfile: 'Profil berhasil diperbarui.',
  changePassword: 'Kata sandi berhasil diperbarui.',
  forgotPassword: 'Jika email terdaftar, petunjuk pemulihan akan dikirimkan.',
  verifyResetOtp: 'Kode terverifikasi. Silakan buat kata sandi baru.',
  resetPassword: 'Kata sandi berhasil diatur ulang. Silakan masuk.',
  verifyEmail: 'Email berhasil diverifikasi.',
  resendVerification: 'Kode verifikasi baru berhasil dikirim.',
  revokeDevice: 'Sesi perangkat berhasil diakhiri.',
  createBusiness: 'Tempat servis berhasil didaftarkan.',
  updateBusiness: 'Informasi tempat servis berhasil diperbarui.',
  createCustomer: 'Pelanggan berhasil ditambahkan.',
  updateCustomer: 'Data pelanggan berhasil diperbarui.',
  sendCustomerInvitation: 'Undangan pelanggan berhasil dibuat.',
  acceptCustomerInvitation: 'Akun berhasil terhubung sebagai pelanggan.',
  inviteTechnician: 'Undangan teknisi berhasil dibuat.',
  resendTechnicianInvitation: 'Undangan teknisi berhasil diperbarui.',
  updateTechnician: 'Data teknisi berhasil diperbarui.',
  acceptTechnicianInvitation: 'Undangan diterima. Anda dapat membuka portal teknisi.',
  createService: 'Layanan berhasil ditambahkan.',
  updateService: 'Layanan berhasil diperbarui.',
  createTicket: 'Tiket servis berhasil dibuat.',
  assignTechnician: 'Penugasan teknisi berhasil diperbarui.',
  updateIntake: 'Data penerimaan perangkat berhasil diperbarui.',
  saveDiagnosis: 'Diagnosis berhasil disimpan.',
  saveEstimateDraft: 'Draf estimasi berhasil disimpan.',
  submitEstimate: 'Estimasi berhasil diajukan untuk persetujuan pelanggan.',
  respondToEstimate: 'Tanggapan estimasi berhasil disimpan.',
  transitionTicket: 'Status tiket berhasil diperbarui.',
  handoverTicket: 'Penyerahan perangkat berhasil dicatat.',
  issueTrackingAccess: 'Kode akses pelacakan berhasil diperbarui.',
  uploadFile: 'Berkas berhasil diunggah.',
  addAttachment: 'Lampiran berhasil ditambahkan.',
  detachAttachment: 'Lampiran berhasil dilepaskan.',
  issueInvoice: 'Invoice berhasil diterbitkan.',
  recordPayment: 'Pembayaran berhasil dicatat.',
  voidInvoice: 'Invoice berhasil dibatalkan.',
  confirmDemoSubscriptionPayment: 'Pembayaran demo berhasil dikonfirmasi. Paket langganan Anda telah diperbarui.',
  checkoutSubscription: 'Permintaan pembayaran langganan berhasil dibuat. Ikuti petunjuk pembayaran.',
};
