import { Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTechnicianDashboardQuery } from '../dashboard/dashboardApi';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { ButtonLink } from '../../components/ui/Button';
import { TicketTable } from '../tickets/TicketTable';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { DeadlineReminders } from '../tickets/DeadlineReminders';

export default function TechnicianDashboardPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading, isError, refetch } = useGetTechnicianDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );
  if (isLoading) return <PageLoader />;
  if (isError || !data?.data)
    return (
      <EmptyState
        title="Dashboard belum dapat dimuat"
        description="Coba muat kembali informasi pekerjaan."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );
  const { stats, recentTickets } = data.data;
  const active = recentTickets.filter(
    (ticket) => !['completed', 'cancelled'].includes(ticket.status),
  );
  const ticket = active[0];
  return (
    <div className="reference-stack" data-dashboard="technician">
      <header className="reference-heading">
        <div>
          <h1>Dashboard Teknisi</h1>
          <p>Ringkasan pekerjaan dan antrean servis Anda hari ini.</p>
        </div>
        <ButtonLink to="/technician/queue" variant="secondary">
          Lihat Antrean
        </ButtonLink>
      </header>
      <section className="reference-stats reference-stats-three">
        <SummaryCard
          label="Tiket Aktif"
          value={stats.myActiveTickets}
          detail="Pekerjaan yang ditugaskan"
        />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats.awaitingApproval}
          detail="Estimasi menunggu pelanggan"
          icon="clock"
          tone="orange"
        />
        <SummaryCard
          label="Servis Selesai"
          value={stats.completed}
          detail="Pekerjaan telah selesai"
          icon="check"
          tone="green"
        />
      </section>
      <DeadlineReminders tickets={data.data.deadlineTickets || []} total={stats.urgentCount || 0} />
      <div className="reference-columns">
        <section className="reference-panel">
          {ticket ? (
            <>
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
                  <dt>Pelanggan</dt>
                  <dd>{ticket.customer?.name || '—'}</dd>
                </div>
                <div>
                  <dt>Tanggal Masuk</dt>
                  <dd>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</dd>
                </div>
              </dl>
              <div style={{ marginTop: 24 }}>
                <ButtonLink to={`/technician/tickets/${ticket.id}`}>
                  Buka Detail & Diagnosis
                </ButtonLink>
              </div>
            </>
          ) : (
            <p>Belum ada tiket aktif yang ditugaskan.</p>
          )}
        </section>
        <section className="reference-panel">
          <h2>Status Tiket</h2>
          {ticket ? (
            <ServiceStepper status={ticket.status} />
          ) : (
            <p>Status pekerjaan akan tampil setelah ada penugasan.</p>
          )}
          <Link className="text-link" to="/technician/history">
            Lihat riwayat pekerjaan
          </Link>
        </section>
      </div>
      <section className="reference-panel">
        <div className="reference-panel-header">
          <h2>Antrean Servis Mendesak</h2>
          <Link to="/technician/queue" className="text-link">
            Semua antrean
          </Link>
        </div>
        <TicketTable role="technician" tickets={data.data.deadlineTickets || []} />
      </section>
    </div>
  );
}
