import { SummaryCard } from '../../components/ui/SummaryCard';
import { Pagination } from '../../components/navigation/Pagination';
import { useGetOwnerDashboardQuery } from '../dashboard/dashboardApi';
import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketsQuery } from '../tickets/ticketsApi';
import type { TicketStatus } from '../tickets/status';
import { ticketStatuses } from '../tickets/status';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState, InlineNotice } from '../../components/feedback/Feedback';
import styles from '../tickets/Tickets.module.css';
import pageStyles from './OwnerTicketsPage.module.css';

export default function OwnerTicketsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useLocation();

  const search = searchParams.get('q') || '';
  const statusFilter = (searchParams.get('status') as TicketStatus) || '';

  const [searchInput, setSearchInput] = useState(search);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const updateViewport = () => setIsMobile(mobileQuery.matches);
    updateViewport();
    mobileQuery.addEventListener('change', updateViewport);
    return () => mobileQuery.removeEventListener('change', updateViewport);
  }, []);

  const { data, isLoading, isError } = useGetTicketsQuery(
    {
      businessId: businessId || '',
      params: {
        q: search || undefined,
        page: Math.max(1, Number(searchParams.get('page')) || 1),
        limit: isMobile ? 5 : 20,
        customerId: searchParams.get('customerId') || undefined,
        technicianId: searchParams.get('technicianId') || undefined,
        status: statusFilter || undefined,
      },
    },
    { skip: !businessId },
  );

  const { data: dashboard } = useGetOwnerDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId },
  );
  const stats = dashboard?.data.stats;
  const tickets = data?.data || [];

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      next.set('q', searchInput.trim());
    } else {
      next.delete('q');
    }
    next.delete('page');
    setSearchParams(next);
  }

  function handleStatusChange(status: string) {
    const next = new URLSearchParams(searchParams);
    if (status) {
      next.set('status', status);
    } else {
      next.delete('status');
    }
    next.delete('page');
    setSearchParams(next);
  }

  if (isLoading && !search && !statusFilter) {
    return <PageLoader />;
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={`${styles.heading} ${pageStyles.heading}`}>
        <div>
          <span className="eyebrow">Operasional Servis</span>
          <h1>Daftar Tiket Servis</h1>
          <p>Pantau semua tiket perbaikan perangkat yang masuk ke tempat servis Anda.</p>
        </div>
        <ButtonLink to="/owner/tickets/new">+ Buat Tiket Servis</ButtonLink>
      </header>

      <div className={`reference-stats ${pageStyles.ticketStats}`}>
        <SummaryCard label="Tiket Aktif" value={stats?.activeTickets ?? '—'} icon="ticket" compactMobile />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats?.awaitingApproval ?? '—'}
          icon="clock"
          tone="orange"
          compactMobile
        />
        <SummaryCard label="Dalam Perbaikan" value={stats?.inRepair ?? '—'} icon="tool" compactMobile />
        <SummaryCard
          label="Servis Selesai"
          value={stats?.readyForPickup ?? '—'}
          icon="check"
          tone="green"
          compactMobile
        />
      </div>
      {isError && <InlineNotice>Daftar tiket gagal dimuat. Silakan coba lagi.</InlineNotice>}
      {state?.notice && <InlineNotice type="success">{state.notice}</InlineNotice>}
      <div className={`${styles.filters} ${pageStyles.filters}`}>
        <form onSubmit={handleSearchSubmit} className={pageStyles.searchForm}>
          <div className={pageStyles.searchInput}>
            <TextInput
              label="Cari tiket"
              placeholder="Kode, pelanggan, atau keluhan"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" size="small" className={pageStyles.searchButton}>
            Cari
          </Button>
        </form>

        <div className={pageStyles.statusFilter}>
          <label htmlFor="filter-status" className={pageStyles.statusLabel}>Filter Status</label>
          <select
            id="filter-status"
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Semua Status</option>
            {Object.entries(ticketStatuses).map(([val, { label }]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tiket Ditemukan"
          description={
            search || statusFilter
              ? 'Tidak ada tiket yang sesuai dengan filter pencarian Anda.'
              : 'Belum ada tiket servis yang tercatat pada tempat servis ini.'
          }
          action={
            !search && !statusFilter ? (
              <ButtonLink to="/owner/tickets/new">+ Catat Tiket Pertama</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <ResponsiveTable className={`${styles.tableWrapper} ${pageStyles.desktopTickets}`} rowHeading="Tiket">
            <table className={styles.table}>
            <thead>
              <tr style={{ background: 'var(--canvas)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Kode Tiket</th>
                <th style={{ padding: '12px 16px' }}>Tanggal Masuk</th>
                <th style={{ padding: '12px 16px' }}>Pelanggan</th>
                <th style={{ padding: '12px 16px' }}>Perangkat</th>
                <th style={{ padding: '12px 16px' }}>Teknisi</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700 }}>
                    <Link to={`/owner/tickets/${t.id}`} className="text-link">
                      {t.ticketCode}
                    </Link>
                  </td>
                  <td
                    style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--slate-500)' }}
                  >
                    {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{t.customer?.name || 'Pelanggan langsung'}</strong>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {t.device.category} • {t.device.model}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {t.technician ? (
                      t.technician.name
                    ) : (
                      <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>
                        Belum ditugaskan
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <TicketStatusBadge
                      status={t.status}
                      rejectedFlow={t.timeline.some((event) => event.action === 'estimate_rejected')}
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <ButtonLink
                      to={`/owner/tickets/${t.id}`}
                      variant="secondary"
                      size="small"
                      style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                    >
                      Detail
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </ResponsiveTable>
          <div className={pageStyles.ticketCards} aria-label="Daftar tiket servis">
            {tickets.map((ticket) => (
              <article className={pageStyles.ticketCard} key={ticket.id}>
                <header className={pageStyles.ticketCardHeader}>
                  <Link to={`/owner/tickets/${ticket.id}`} className={pageStyles.ticketCode}>
                    {ticket.ticketCode}
                  </Link>
                  <TicketStatusBadge
                    status={ticket.status}
                    rejectedFlow={ticket.timeline.some((event) => event.action === 'estimate_rejected')}
                  />
                </header>
                <dl className={pageStyles.ticketDetails}>
                  <div><dt>Pelanggan</dt><dd>{ticket.customer?.name || 'Pelanggan langsung'}</dd></div>
                  <div><dt>Perangkat</dt><dd>{ticket.device.category} · {ticket.device.model}</dd></div>
                  <div><dt>Tanggal masuk</dt><dd>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</dd></div>
                  <div><dt>Teknisi</dt><dd>{ticket.technician?.name || 'Belum ditugaskan'}</dd></div>
                </dl>
                <ButtonLink to={`/owner/tickets/${ticket.id}`} variant="secondary" size="small" className={pageStyles.detailButton}>
                  Lihat detail
                </ButtonLink>
              </article>
            ))}
          </div>
        </>
      )}
      <div className={pageStyles.desktopPagination}>
        <Pagination
          pagination={data?.pagination}
          onPageChange={(page) => {
            const next = new URLSearchParams(searchParams);
            next.set('page', String(page));
            setSearchParams(next);
          }}
        />
      </div>
      {isMobile && data?.pagination && (
        <nav className={pageStyles.mobilePagination} aria-label="Halaman daftar tiket">
          <span>
            Halaman {data.pagination.page} dari {data.pagination.totalPages} · {data.pagination.total} tiket
          </span>
          <div>
            <Button
              size="small"
              variant="secondary"
              disabled={data.pagination.page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(data.pagination.page - 1));
                setSearchParams(next);
              }}
            >
              Kembali
            </Button>
            <Button
              size="small"
              disabled={data.pagination.page >= data.pagination.totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', String(data.pagination.page + 1));
                setSearchParams(next);
              }}
            >
              Berikutnya
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
