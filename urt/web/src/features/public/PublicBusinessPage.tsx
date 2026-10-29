import { useParams } from 'react-router';
import { useGetPublicBusinessQuery } from '../business/businessApi';
import { ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from './InfoPages.module.css';
import { customerPortalPath } from '../customer/customer-portal';

export default function PublicBusinessPage() {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const { data, isLoading, error } = useGetPublicBusinessQuery(businessSlug || '', {
    skip: !businessSlug,
  });

  const business = data?.data?.business;
  const services = data?.data?.services ?? [];


  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !business) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tempat Servis Tidak Ditemukan"
          description="Alamat tempat servis yang Anda tuju belum terdaftar atau tautan tidak valid."
          symbol="404"
          action={<ButtonLink to="/">Kembali ke Beranda</ButtonLink>}
        />
      </main>
    );
  }

  return (
    <div className="container page-content stack">
      <header className={styles.heading}>
        <span className="eyebrow">Profil Tempat Servis</span>
        <h1>{business.name}</h1>
        <p>
          {business.address || 'Alamat tidak dicantumkan'} • Jam Buka:{' '}
          {business.businessHours || 'Setiap Hari'}
        </p>
      </header>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {business.phone && (
          <span style={{ fontSize: '0.95rem' }}>
            📞 Hubungi: <strong>{business.phone}</strong>
          </span>
        )}
      </div>

      <section className="stack">
        <h2>Layanan & Estimasi Tarif Perbaikan</h2>
        {services.length === 0 ? (
          <p>Belum ada daftar layanan yang ditampilkan secara publik.</p>
        ) : (
          <div className={styles.grid}>
            {services.map((srv) => (
              <article key={srv.id} className={styles.card}>
                <span className="eyebrow">{srv.category}</span>
                <h2>{srv.name}</h2>
                {srv.description && <p>{srv.description}</p>}
                <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy-950)' }}>
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: business.currency || 'IDR',
                      maximumFractionDigits: 0,
                    }).format(srv.basePrice)}
                  </span>
                  {srv.estimatedDuration && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                      Estimasi pengerjaan: {srv.estimatedDuration}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div style={{ paddingTop: 24, textAlign: 'center' }}>
        <ButtonLink to={customerPortalPath(business.slug)}>Buka Portal Pelanggan & Ajukan Servis</ButtonLink>
      </div>
    </div>
  );
}
