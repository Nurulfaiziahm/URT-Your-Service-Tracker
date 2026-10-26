import { Link } from 'react-router';
import type { ServiceTicket } from './types';
import type { PortalRole } from '../../layouts/portal-navigation';
import { TicketStatusBadge } from './TicketStatusBadge';
import { formatRupiah } from './currency';
import styles from './Tickets.module.css';

export function TicketTable({
  tickets,
  role,
  history = false,
}: {
  tickets: ServiceTicket[];
  role: PortalRole;
  history?: boolean;
}) {
  const path = role === 'customer' ? '/customer/services' : `/${role}/tickets`;
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{history ? 'Nomor Tiket & Perangkat' : 'Nomor Tiket'}</th>
            {!history && <th>Perangkat</th>}
            {role !== 'customer' && <th>Pelanggan</th>}
            {role === 'owner' && <th>Teknisi</th>}
            {role === 'technician' && !history && <th>Keluhan</th>}
            {role === 'customer' && <th>Jenis Servis</th>}
            {(role !== 'owner' || history) && <th>Tanggal Masuk</th>}
            {history && <th>Total Biaya</th>}
            <th>Status</th>
            {role !== 'owner' && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {tickets.length ? (
            tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link to={`${path}/${ticket.id}`} className="text-link">
                    {ticket.ticketCode}
                  </Link>
                  {history && (
                    <div>
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
                {role === 'technician' && !history && <td>{ticket.complaint}</td>}
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
                  <TicketStatusBadge status={ticket.status} />
                </td>
                {role !== 'owner' && (
                  <td>
                    <Link to={`${path}/${ticket.id}`} className="text-link">
                      Lihat Detail →
                    </Link>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={9}>Belum ada tiket servis.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
