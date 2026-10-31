import { useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketsQuery } from '../tickets/ticketsApi';
import { useGetTechnicianDashboardQuery } from '../dashboard/dashboardApi';
import { ticketStatuses, type TicketStatus } from '../tickets/status';
import { TicketTable } from '../tickets/TicketTable';
import { DeadlineReminders } from '../tickets/DeadlineReminders';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Pagination } from '../../components/navigation/Pagination';
import { Button } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from './TechnicianQueue.module.css';

export default function TechnicianQueuePage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = (params.get('status') as TicketStatus) || undefined;
  const q = params.get('q') || undefined;

  const { data: dashboard } = useGetTechnicianDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const { data, isLoading, isError, refetch } = useGetTicketsQuery(
    { businessId: businessId || '', params: { page, status, q } },
    { skip: !businessId, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const stats = dashboard?.data?.stats;
  const deadlineTickets = dashboard?.data?.deadlineTickets || [];

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
    <div className={`reference-stack ${styles.container}`}>
      {/* 1. Header */}
      <header className={styles.queueHeader}>
        <div>
          <h1>Antrian Pengerjaan</h1>
          <p>Pantau dan kelola seluruh tiket pekerjaan yang ditugaskan kepada Anda.</p>
        </div>
      </header>

      {/* 2. Stats Grid */}
      <section aria-label="Statistik Tiket Aktif" className={styles.statsGrid}>
        <SummaryCard
          label="Tiket Aktif"
          value={stats?.myActiveTickets ?? '-'}
          detail="Pekerjaan dalam penugasan"
          icon="ticket"
          tone="blue"
        />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats?.awaitingApproval ?? '-'}
          detail="Estimasi menunggu pelanggan"
          icon="clock"
          tone="orange"
        />
        <SummaryCard
          label="Servis Selesai"
          value={stats?.completed ?? '-'}
          detail="Pekerjaan telah selesai"
          icon="check"
          tone="green"
        />
      </section>

      {/* 3. Pengingat Tenggat (Hanya jika ada tiket mendesak/mendekati deadline) */}
      {deadlineTickets.length > 0 && (
        <DeadlineReminders tickets={deadlineTickets} total={stats?.urgentCount || deadlineTickets.length} />
      )}

      {/* 4. Daftar Tiket Antrean & Toolbar */}
      <section className={styles.tablePanel}>
        <div className={styles.panelHeader}>
          <h2>Semua Tiket Aktif</h2>
          <div className={styles.toolbar}>
            <form
              className={styles.searchForm}
              onSubmit={(event) => {
                event.preventDefault();
                filter('q', String(new FormData(event.currentTarget).get('q') || ''));
              }}
            >
              <div className={styles.searchInputWrapper}>
                <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  key={q}
                  name="q"
                  defaultValue={q}
                  className={styles.searchInput}
                  placeholder="Cari nomor tiket atau perangkat..."
                  aria-label="Cari tiket"
                />
              </div>
              <Button type="submit" size="small" variant="secondary">
                Cari
              </Button>
            </form>
            <select
              className={styles.statusSelect}
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
