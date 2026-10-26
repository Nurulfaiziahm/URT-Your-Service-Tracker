import { EmptyState } from '../../components/feedback/Feedback';
import { ButtonLink } from '../../components/ui/Button';

export default function UnavailablePage({ kind = 'missing' }: { kind?: 'missing' | 'forbidden' | 'business' }) {
  const content = {
    missing: ['404', 'Halaman tidak ditemukan', 'Alamat yang Anda buka belum tersedia. Kembali ke beranda untuk melanjutkan.'],
    forbidden: ['403', 'Akses tidak tersedia', 'Halaman ini membutuhkan akses yang sesuai. Hubungi pemilik tempat servis jika Anda membutuhkan bantuan.'],
    business: ['—', 'Halaman tempat servis sedang disiapkan', 'Informasi tempat servis dan pengajuan servis belum terhubung pada versi ini.'],
  }[kind];
  return <div className="container page-content"><EmptyState symbol={content[0]} title={content[1]} description={content[2]} action={<ButtonLink to="/">Kembali ke beranda</ButtonLink>} /></div>;
}
