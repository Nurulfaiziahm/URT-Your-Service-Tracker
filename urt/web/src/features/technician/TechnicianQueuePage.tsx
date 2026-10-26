import { useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketsQuery } from '../tickets/ticketsApi';
import { useGetTechnicianDashboardQuery } from '../dashboard/dashboardApi';
import { ticketStatuses, type TicketStatus } from '../tickets/status';
import { TicketTable } from '../tickets/TicketTable';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Pagination } from '../../components/navigation/Pagination';
import { Button } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';

export default function TechnicianQueuePage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = (params.get('status') as TicketStatus) || undefined;
  const q = params.get('q') || undefined;
  const { data: dashboard } = useGetTechnicianDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId },
  );
  const { data, isLoading, isError, refetch } = useGetTicketsQuery(
    { businessId: businessId || '', params: { page, status, q } },
    { skip: !businessId },
  );
  const stats = dashboard?.data?.stats;
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  if (isLoading) return <PageLoader />;
  if (isError)
    return (
      <EmptyState
        title="Antrean belum dapat dimuat"
        description="Coba muat kembali tiket penugasan Anda."
        action={<Button onClick={() => refetch()}>Coba lagi</Button>}
      />
    );
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <h1>Antrian Pengerjaan</h1>
          <p>Pantau dan kelola seluruh tiket yang ditugaskan kepada Anda.</p>
        </div>
      </header>
      <section aria-label="Statistik Tiket Aktif" className="reference-stats reference-stats-three">
        <SummaryCard label="Tiket Aktif" value={stats?.myActiveTickets ?? '—'} />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats?.awaitingApproval ?? '—'}
          icon="clock"
          tone="orange"
        />
        <SummaryCard label="Selesai" value={stats?.completed ?? '—'} icon="check" tone="green" />
      </section>
      <section className="reference-panel">
        <h2>Semua Tiket Aktif</h2>
        <div className="reference-toolbar">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              filter('q', String(new FormData(event.currentTarget).get('q') || ''));
            }}
          >
            <input
              key={q}
              name="q"
              defaultValue={q}
              placeholder="Cari nomor tiket atau perangkat…"
              aria-label="Cari tiket"
            />
            <Button type="submit" size="small" variant="secondary">
              Cari
            </Button>
          </form>
          <select
            aria-label="Status tiket"
            value={status || ''}
            onChange={(event) => filter('status', event.target.value)}
          >
            <option value="">Semua Status</option>
            {Object.entries(ticketStatuses).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>
        <TicketTable tickets={data?.data || []} role="technician" />
        <Pagination
          pagination={data?.pagination}
          onPageChange={(next) => {
            const updated = new URLSearchParams(params);
            updated.set('page', String(next));
            setParams(updated);
          }}
        />
      </section>
    </div>
  );
}
