import { Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useCustomerPortal } from './customer-portal';
import { useGetCustomerDashboardQuery } from '../dashboard/dashboardApi';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TicketTiming } from '../tickets/TicketTiming';
import { TicketTable } from '../tickets/TicketTable';

export default function CustomerDashboardPage() {
  const { businessId, business, basePath, hasMembership, isAuthenticated } = useCustomerPortal();
  const user = useAppSelector(selectUser);
  const { currentData: data, isLoading, isError, refetch } = useGetCustomerDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId || !hasMembership || !isAuthenticated, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );
  if (isLoading) return <PageLoader />;
  if (hasMembership && isAuthenticated && (isError || !data?.data))
    return (
      <EmptyState
        title="Servis belum dapat dimuat"
        description="Coba muat kembali informasi perangkat Anda."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );
  const { stats, recentTickets } = hasMembership && isAuthenticated && data?.data ? data.data : {
    stats: { activeTickets: 0, completedTickets: 0, awaitingApproval: 0 },
    recentTickets: [],
  };
  const ticket = recentTickets.find((item) => !['completed', 'cancelled'].includes(item.status));
  const completed = recentTickets.filter((item) =>
    ['completed', 'cancelled'].includes(item.status),
  );
  return (
    <div className="reference-stack" data-dashboard="customer">
      <header className="reference-heading">
        <div>
          <h1>
            {user ? `Halo, ${user.firstName} ${user.lastName}` : 'Selamat Datang di Portal Pelanggan'}
          </h1>
          <p>{business?.name || 'Pantau perkembangan perangkat Anda dengan mudah.'}</p>
        </div>
        <div className="actions">{!isAuthenticated && <ButtonLink to="/customer/login" variant="secondary" state={{ from: { pathname: basePath } }}>Login Pelanggan</ButtonLink>}
          <ButtonLink to={`${basePath}/services/new`}>+ Ajukan Servis</ButtonLink></div>
      </header>
      <section className="reference-stats reference-stats-three">
        <SummaryCard
          label="Servis Aktif"
          value={stats.activeTickets}
          detail="Perangkat dalam penanganan"
        />
        <SummaryCard
          label="Servis Selesai"
          value={stats.completedTickets}
          detail="Riwayat perbaikan Anda"
          tone="green"
          icon="check"
        />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats.awaitingApproval}
          detail="Estimasi membutuhkan keputusan"
          tone="orange"
          icon="clock"
        />
      </section>
      {ticket ? (
        <div className="reference-columns">
          <section className="reference-panel">
            <div className="reference-panel-header">
              <h2>{ticket.ticketCode}</h2>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <h3>
              {ticket.device.brand} {ticket.device.model}
            </h3>
            <p style={{ marginBlock: 16 }}>{ticket.complaint}</p>
            <dl className="reference-dl">
              <div>
                <dt>Teknisi</dt>
                <dd>{ticket.technician?.name || 'Menunggu penugasan'}</dd>
              </div>
              <div>
                <dt>Tempat Servis</dt>
                <dd>{business?.name || data?.data.business.name}</dd>
              </div>
            </dl>
            <div className="actions" style={{ marginTop: 24 }}>
              <ButtonLink to={`${basePath}/services/${ticket.id}`}>Lihat Detail Servis</ButtonLink>
              {ticket.status === 'awaiting_approval' && (
                <ButtonLink to={`${basePath}/services/${ticket.id}/approval`} variant="secondary">
                  Tinjau Estimasi
                </ButtonLink>
              )}
            </div>
          </section>
          <section className="reference-panel customer-service-journey">
            <h2>Perjalanan Servis</h2>
            <ServiceStepper status={ticket.status} className="customer-service-steps" />
            <TicketTiming ticket={ticket} />
            <p>Setiap perubahan status dicatat oleh tempat servis.</p>
          </section>
        </div>
      ) : (
        <EmptyState
          title="Belum ada servis aktif"
          description={isAuthenticated
            ? 'Ajukan servis di tempat ini. Nomor tiket akan muncul setelah pengajuan berhasil.'
            : 'Ajukan servis tanpa membuat akun. Anda akan mendapat nomor tiket dan tautan pelacakan pribadi.'}
          action={<div className="actions">
            <ButtonLink to={`${basePath}/services/new`}>Ajukan Servis</ButtonLink>
          </div>}
        />
      )}
      <section className="reference-panel">
        <div className="reference-panel-header">
          <h2>Servis Sebelumnya</h2>
          <Link to={`${basePath}/history`} className="text-link">
            Lihat semua
          </Link>
        </div>
        <TicketTable tickets={completed} role="customer" customerBasePath={basePath} history />
      </section>
    </div>
  );
}
