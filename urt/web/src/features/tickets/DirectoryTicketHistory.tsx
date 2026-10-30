import { useState } from 'react';
import { useGetTicketsQuery } from './ticketsApi';
import { TicketTable } from './TicketTable';
import { Pagination } from '../../components/navigation/Pagination';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
export function DirectoryTicketHistory({
  businessId,
  customerId,
  technicianId,
}: {
  businessId: string;
  customerId?: string;
  technicianId?: string;
}) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetTicketsQuery({
    businessId,
    params: { customerId, technicianId, page },
  }, { pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true });
  return (
    <section className="reference-panel">
      <div className="reference-panel-header">
        <h2>Riwayat Tiket Servis</h2>
        <span>{data?.pagination?.total ?? '—'} tiket</span>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <InlineNotice>Riwayat tiket tidak dapat dimuat.</InlineNotice>
      ) : (
        <>
          <TicketTable tickets={data?.data || []} role="owner" />
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
