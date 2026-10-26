import { Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetCustomerDashboardQuery } from '../dashboard/dashboardApi';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TicketTable } from '../tickets/TicketTable';

export default function CustomerDashboardPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const user = useAppSelector(selectUser);
  const { data, isLoading, isError, refetch } = useGetCustomerDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId },
  );
  if (isLoading) return <PageLoader />;
  if (isError || !data?.data)
    return (
      <EmptyState
        title="Servis belum dapat dimuat"
        description="Coba muat kembali informasi perangkat Anda."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );
  const { stats, recentTickets } = data.data;
  const ticket = recentTickets.find((item) => !['completed', 'cancelled'].includes(item.status));
  const completed = recentTickets.filter((item) =>
    ['completed', 'cancelled'].includes(item.status),
  );
  return (
    <div className="reference-stack" data-dashboard="customer">
      <header className="reference-heading">
        <div>
          <h1>
            Halo, {user?.firstName} {user?.lastName}
          </h1>
          <p>Pantau perkembangan perangkat Anda dengan mudah.</p>
        </div>
        <ButtonLink to="/customer/services/new">+ Ajukan Servis</ButtonLink>
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
                <dd>{data.data.business.name}</dd>
              </div>
            </dl>
            <div className="actions" style={{ marginTop: 24 }}>
              <ButtonLink to={`/customer/services/${ticket.id}`}>Lihat Detail Servis →</ButtonLink>
              {ticket.status === 'awaiting_approval' && (
                <ButtonLink to={`/customer/services/${ticket.id}/approval`} variant="secondary">
                  Tinjau Estimasi
                </ButtonLink>
              )}
            </div>
          </section>
          <section className="reference-panel">
            <h2>Perjalanan Servis</h2>
            <ServiceStepper status={ticket.status} />
            <p>Setiap perubahan status dicatat oleh tempat servis.</p>
          </section>
        </div>
      ) : (
        <EmptyState
          title="Belum ada servis aktif"
          description="Ajukan perbaikan perangkat untuk mulai mengikuti perkembangannya."
          action={<ButtonLink to="/customer/services/new">Ajukan Servis</ButtonLink>}
        />
      )}
      <section className="reference-panel">
        <div className="reference-panel-header">
          <h2>Servis Sebelumnya</h2>
          <Link to="/customer/history" className="text-link">
            Lihat semua →
          </Link>
        </div>
        <TicketTable tickets={completed} role="customer" history />
      </section>
    </div>
  );
}
