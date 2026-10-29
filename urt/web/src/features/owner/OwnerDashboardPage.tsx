import { Link } from 'react-router';
import { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { customerPortalPath } from '../customer/customer-portal';
import { useGetOwnerDashboardQuery } from '../dashboard/dashboardApi';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Icon } from '../../components/ui/Icon';
import { TicketTable } from '../tickets/TicketTable';
import { OwnerOnboardingChecklist } from './OwnerOnboardingChecklist';
import { PageLoader, EmptyState, InlineNotice } from '../../components/feedback/Feedback';
import styles from './OwnerDashboardPage.module.css';

export default function OwnerDashboardPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading, error, refetch } = useGetOwnerDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId },
  );
  const [copyStatus, setCopyStatus] = useState('');
  const [now] = useState(() => Date.now());
  if (isLoading || !businessId) return <PageLoader />;
  if (error || !data?.data)
    return (
      <EmptyState
        title="Gagal memuat dashboard"
        description="Informasi operasional belum dapat dimuat."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );

  const { business, stats, subscription, recentTickets, financial } = data.data;
  const isActive = subscription?.status === 'active';
  const end = subscription?.currentPeriodEnd;
  const start = subscription?.currentPeriodStart;
  const duration = start && end ? new Date(end).getTime() - new Date(start).getTime() : 0;
  const remaining = end ? new Date(end).getTime() - now : 0;
  const remainingPercent = isActive && duration > 0
    ? Math.min(100, Math.max(0, (remaining / duration) * 100)) : 0;
  const sla = financial?.slaPercentage;

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopyStatus('Tautan berhasil disalin.');
    } catch {
      setCopyStatus('Tautan tidak dapat disalin. Pilih dan salin alamat yang ditampilkan.');
    }
  }

  return (
    <div className={styles.dashboard} data-dashboard="owner">
      <header className={styles.heading}>
        <span className="eyebrow">Portal Pemilik</span>
        <h1>Dashboard Pemilik</h1>
        <p>Pantau performa usaha servis, tim teknisi, pelanggan, dan langganan URT.</p>
      </header>

      <OwnerOnboardingChecklist data={data.data} />

      <section className={styles.stats} aria-label="Ringkasan operasional">
        <SummaryCard label="Tiket Aktif" value={stats.activeTickets} detail="Tiket servis berjalan" />
        <SummaryCard label="Pelanggan" value={stats.totalCustomers} detail="Pelanggan terdaftar" icon="people" tone="green" />
        <SummaryCard label="Teknisi Aktif" value={stats.activeTechnicians} detail="Tim teknisi tempat servis" icon="team" tone="orange" />
        <SummaryCard label="Langganan" value={isActive ? `${subscription.daysRemaining} hari` : '—'} detail={isActive ? `${subscription.planName} aktif` : 'Belum ada langganan aktif'} icon="shield" />
      </section>

      <section className={styles.grid}>
        <article className={styles.activity}>
          <header className={styles.panelHeading}>
            <div>
              <h2>Tiket Terbaru</h2>
              <p>Aktivitas servis terbaru di {business.name}</p>
            </div>
            <Link to="/owner/tickets" className={styles.tableAction}>Lihat semua tiket →</Link>
          </header>
          <div className={styles.tickets}>
            <TicketTable tickets={recentTickets.slice(0, 3)} role="owner" />
          </div>

          <section className={styles.subscription} aria-labelledby="subscription-title">
            <div className={styles.subscriptionHeading}>
              <h3 id="subscription-title">{subscription?.planName || 'Langganan'}</h3>
              <span className={styles.status} data-active={isActive}>
                {isActive ? 'AKTIF' : subscription?.status === 'expired' ? 'BERAKHIR' : 'BELUM AKTIF'}
              </span>
            </div>
            <p>
              {end ? `Berakhir ${new Date(end).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: business.timezone })}` : 'Pilih paket untuk mengaktifkan layanan tempat servis.'}
            </p>
            <div className={styles.progress} role="progressbar" aria-label="Sisa masa langganan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(remainingPercent)}>
              <span style={{ width: `${remainingPercent}%` }} />
            </div>
            <div className={styles.subscriptionFooter}>
              <small>{isActive ? `${subscription.daysRemaining} hari tersisa` : 'Belum ada masa aktif'}</small>
              <Link to="/owner/subscription">Kelola langganan →</Link>
            </div>
          </section>
        </article>

        <div className={styles.portals}>
          {[
            { title: 'Portal Teknisi', path: '/technician', description: 'Bagikan tautan agar teknisi dapat menerima dan mengelola tiket servis.' },
            { title: 'Portal Pelanggan', path: `${customerPortalPath(business.slug)}/services/new`, description: 'Bagikan tautan atau jadikan QR. Pelanggan mengisi formulir, mendapat nomor tiket, lalu melacak servis tanpa membuat akun.' },
          ].map((portal) => (
            <article key={portal.title} className={styles.portalCard}>
              <span className={styles.portalIcon}><Icon name="external" width="22" height="22" /></span>
              <h2>{portal.title}</h2>
              <p>{portal.description}</p>
              <div className={styles.portalLink}>
                <span title={`${window.location.origin}${portal.path}`}>{window.location.host}{portal.path}</span>
                <div className={styles.portalActions}>
                  <button type="button" aria-label={`Salin tautan ${portal.title}`} onClick={() => copy(portal.path)}><Icon name="copy" /></button>
                  <Link to={portal.path} aria-label={`Buka ${portal.title}`}><Icon name="external" /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sla} aria-label="Status SLA">
        <div className={styles.slaCopy}>
          <Icon name="circleCheck" width="22" height="22" />
          <div>
            <strong>{sla == null ? 'Pantau ketepatan waktu servis' : sla >= 80 ? 'Operasional berjalan baik' : 'Perhatikan target waktu servis'}</strong>
            <p>{sla == null ? 'Ringkasan SLA akan tersedia setelah tiket dengan target waktu selesai diproses.' : `${sla}% tiket bulan ini selesai tepat waktu. Pantau performa tim Anda.`}</p>
          </div>
        </div>
        <Link to="/owner/reports" className={styles.slaScore}><strong>{sla == null ? '—' : `${sla}%`}</strong> <span>SLA terpenuhi</span></Link>
      </section>
      {copyStatus && <div role="status"><InlineNotice>{copyStatus}</InlineNotice></div>}
    </div>
  );
}
