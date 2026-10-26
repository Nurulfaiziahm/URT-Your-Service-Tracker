import { useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketsQuery } from './ticketsApi';
import { TicketTable } from './TicketTable';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Pagination } from '../../components/navigation/Pagination';
import { Button } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';

export default function ServiceHistoryPage({ role }: { role: 'technician' | 'customer' }) {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const status = params.get('status') === 'cancelled' ? 'cancelled' : 'completed';
  const { data, isLoading, isError, refetch } = useGetTicketsQuery(
    { businessId: businessId || '', params: { page, status } },
    { skip: !businessId },
  );
  const { data: completedCount } = useGetTicketsQuery(
    { businessId: businessId || '', params: { status: 'completed', limit: 1 } },
    { skip: !businessId },
  );
  const { data: cancelledCount } = useGetTicketsQuery(
    { businessId: businessId || '', params: { status: 'cancelled', limit: 1 } },
    { skip: !businessId },
  );
  if (isLoading) return <PageLoader />;
  if (isError)
    return (
      <EmptyState
        title="Riwayat belum dapat dimuat"
        description="Coba kembali untuk melihat pekerjaan yang tersimpan."
        action={<Button onClick={() => refetch()}>Coba lagi</Button>}
      />
    );
  const tickets = data?.data || [];
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <span className="eyebrow">
            {role === 'technician' ? 'Arsip pekerjaan teknisi' : 'Arsip perbaikan perangkat'}
          </span>
          <h1>{role === 'technician' ? 'Riwayat Teknisi' : 'Riwayat Servis'}</h1>
          <p>Catatan servis yang telah selesai dan pengajuan yang dibatalkan.</p>
        </div>
      </header>
      <section className="reference-stats reference-stats-three">
        <SummaryCard
          label="Total Riwayat"
          value={
            completedCount && cancelledCount
              ? (completedCount.pagination?.total || 0) + (cancelledCount.pagination?.total || 0)
              : '—'
          }
          icon="ticket"
        />
        <SummaryCard
          label="Servis Selesai"
          value={completedCount?.pagination?.total ?? '—'}
          icon="check"
          tone="green"
        />
        <SummaryCard
          label="Servis Dibatalkan"
          value={cancelledCount?.pagination?.total ?? '—'}
          icon="clock"
          tone="orange"
        />
      </section>
      <section className="reference-panel">
        <div className="reference-panel-header">
          <h2>{role === 'technician' ? 'Tiket Selesai' : 'Daftar Riwayat Servis'}</h2>
          <label>
            Status{' '}
            <select value={status} onChange={(event) => setParams({ status: event.target.value })}>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </label>
        </div>
        <TicketTable tickets={tickets} role={role} history />
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
