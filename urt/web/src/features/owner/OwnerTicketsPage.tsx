import { SummaryCard } from '../../components/ui/SummaryCard';
import { Pagination } from '../../components/navigation/Pagination';
import { useGetOwnerDashboardQuery } from '../dashboard/dashboardApi';
import { useState } from 'react';
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

export default function OwnerTicketsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useLocation();

  const search = searchParams.get('q') || '';
  const statusFilter = (searchParams.get('status') as TicketStatus) || '';

  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading, isError } = useGetTicketsQuery(
    {
      businessId: businessId || '',
      params: {
        q: search || undefined,
        page: Math.max(1, Number(searchParams.get('page')) || 1),
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
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Operasional Servis</span>
          <h1>Daftar Tiket Servis</h1>
          <p>Pantau semua tiket perbaikan perangkat yang masuk ke tempat servis Anda.</p>
        </div>
        <ButtonLink to="/owner/tickets/new">+ Catat Tiket Walk-in</ButtonLink>
      </header>

      <div className="reference-stats">
        <SummaryCard label="Tiket Aktif" value={stats?.activeTickets ?? '—'} icon="ticket" />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats?.awaitingApproval ?? '—'}
          icon="clock"
          tone="orange"
        />
        <SummaryCard label="Dalam Perbaikan" value={stats?.inRepair ?? '—'} icon="tool" />
        <SummaryCard
          label="Siap Diambil"
          value={stats?.readyForPickup ?? '—'}
          icon="check"
          tone="green"
        />
      </div>
      {isError && <InlineNotice>Daftar tiket gagal dimuat. Silakan coba lagi.</InlineNotice>}
      {state?.notice && <InlineNotice type="success">{state.notice}</InlineNotice>}
      <div className={styles.filters}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <TextInput
            label="Cari Tiket"
            placeholder="Cari kode tiket, nama pelanggan, atau keluhan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" style={{ alignSelf: 'end' }}>
            Cari
          </Button>
        </form>

        <div>
          <label
            htmlFor="filter-status"
            style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}
          >
            Filter Status
          </label>
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
        <ResponsiveTable className={styles.tableWrapper} rowHeading="Tiket">
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
                    <strong>{t.customer?.name || 'Walk-in'}</strong>
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
                    <TicketStatusBadge status={t.status} />
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
      )}
      <Pagination
        pagination={data?.pagination}
        onPageChange={(page) => {
          const next = new URLSearchParams(searchParams);
          next.set('page', String(page));
          setSearchParams(next);
        }}
      />
    </div>
  );
}
