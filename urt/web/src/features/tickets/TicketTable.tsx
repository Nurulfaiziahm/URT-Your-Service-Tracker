import { Link } from 'react-router';
import type { ServiceTicket } from './types';
import type { PortalRole } from '../../layouts/portal-navigation';
import { TicketStatusBadge } from './TicketStatusBadge';
import { DeadlineBadge } from './TicketTiming';
import { formatRupiah } from './currency';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import styles from './Tickets.module.css';

export function TicketTable({
  tickets,
  role,
  history = false,
  customerBasePath = '/customer',
}: {
  tickets: ServiceTicket[];
  role: PortalRole;
  history?: boolean;
  customerBasePath?: string;
}) {
  const path = role === 'customer' ? `${customerBasePath}/services` : `/${role}/tickets`;
  return (
    <>
      <ResponsiveTable role={history && role === 'customer' ? 'region' : undefined} className={[styles.tableWrapper, styles.desktopTicketTable, history && role === 'customer' ? styles.customerHistoryWrapper : ''].filter(Boolean).join(' ')} aria-label={history && role === 'customer' ? 'Riwayat servis' : undefined} tabIndex={history && role === 'customer' ? 0 : undefined} rowHeading={tickets.length ? 'Tiket' : undefined}>
      <table className={[styles.table, history ? styles.centeredTable : '', history && role === 'customer' ? styles.customerHistoryTable : ''].filter(Boolean).join(' ')}>
        <thead>
          <tr>
            <th>{history ? 'Nomor Tiket & Perangkat' : 'Nomor Tiket'}</th>
            {!history && <th>Perangkat</th>}
            {role !== 'customer' && <th>Pelanggan</th>}
            {role === 'owner' && <th>Teknisi</th>}
            {role !== 'customer' && !history && <th>Keluhan</th>}
            {role === 'customer' && <th>Jenis Servis</th>}
            {(role !== 'owner' || history) && <th>Tanggal Masuk</th>}
            {history && <th>Total Biaya</th>}
            <th>Status</th>
            {role === 'technician' && !history && <th>Prioritas & Tenggat</th>}
            {role !== 'owner' && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.length ? (
            tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`${path}/${ticket.id}`} className="text-link" style={{ fontWeight: 700, color: 'var(--blue, #2563eb)' }}>
                    {ticket.ticketCode}
                  </Link>
                  {history && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: 2 }}>
                      {ticket.device.brand} {ticket.device.model}
                    </div>
                  )}
                </td>
                {!history && (
                  <td>
                    {ticket.device.brand} {ticket.device.model}
                  </td>
                )}
                {role !== 'customer' && <td>{ticket.customer?.name || '—'}</td>}
                {role === 'owner' && <td>{ticket.technician?.name || 'Belum ditugaskan'}</td>}
                {role !== 'customer' && !history && <td>{ticket.complaint}</td>}
                {role === 'customer' && <td>{ticket.service?.name || ticket.device.category}</td>}
                {(role !== 'owner' || history) && (
                  <td>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</td>
                )}
                {history && (
                  <td>
                    {ticket.approvedEstimate
                      ? formatRupiah(ticket.approvedEstimate.totalAmount)
                      : '—'}
                  </td>
                )}
                <td>
                  <TicketStatusBadge
                    status={ticket.status}
                    rejectedFlow={ticket.timeline.some((event) => event.action === 'estimate_rejected')}
                  />
                </td>
                {role === 'technician' && !history && <td><DeadlineBadge ticket={ticket} /></td>}
                {role !== 'owner' && (
                  <td>
                    <Link to={`${path}/${ticket.id}`} className="text-link" style={{ fontWeight: 600 }}>
                      Lihat Detail &rarr;
                    </Link>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center' }}>Belum ada tiket servis.</td>
            </tr>
          )}
        </tbody>
      </table>
      </ResponsiveTable>
      <div className={styles.mobileTicketList} aria-label={history ? 'Riwayat servis' : 'Daftar tiket'}>
        {tickets.length ? tickets.map((ticket) => (
          <article className={styles.mobileTicketCard} key={ticket.id}>
            <header className={styles.mobileTicketHeader}>
              <Link to={`${path}/${ticket.id}`} className={styles.mobileTicketCode}>{ticket.ticketCode}</Link>
              <TicketStatusBadge
                status={ticket.status}
                rejectedFlow={ticket.timeline.some((event) => event.action === 'estimate_rejected')}
              />
            </header>
            <dl className={styles.mobileTicketDetails}>
              <div><dt>Perangkat</dt><dd>{ticket.device.brand} {ticket.device.model}</dd></div>
              {role === 'customer' ? (
                <div><dt>{history ? 'Jenis servis' : 'Layanan'}</dt><dd>{ticket.service?.name || ticket.device.category}</dd></div>
              ) : (
                <div><dt>Pelanggan</dt><dd>{ticket.customer?.name || '—'}</dd></div>
              )}
              {role === 'owner' && <div><dt>Teknisi</dt><dd>{ticket.technician?.name || 'Belum ditugaskan'}</dd></div>}
              {(role !== 'owner' || history) && <div><dt>Tanggal masuk</dt><dd>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</dd></div>}
              {history && <div><dt>Total biaya</dt><dd>{ticket.approvedEstimate ? formatRupiah(ticket.approvedEstimate.totalAmount) : '—'}</dd></div>}
              {role !== 'customer' && !history && <div className={styles.mobileTicketComplaint}><dt>Keluhan</dt><dd>{ticket.complaint}</dd></div>}
              {role === 'technician' && !history && <div><dt>Prioritas & tenggat</dt><dd><DeadlineBadge ticket={ticket} /></dd></div>}
            </dl>
            <Link to={`${path}/${ticket.id}`} className={styles.mobileTicketAction}>Lihat detail</Link>
          </article>
        )) : <p className={styles.mobileTicketEmpty}>Belum ada tiket servis.</p>}
      </div>
    </>
  );
}
