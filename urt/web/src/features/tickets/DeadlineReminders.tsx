import { Link } from 'react-router';
import type { ServiceTicket } from './types';
import { DeadlineBadge } from './TicketTiming';
import styles from './TicketTiming.module.css';

export function DeadlineReminders({ tickets, total }: { tickets: ServiceTicket[]; total: number }) {
  return <section className="reference-panel" aria-label="Pengingat tenggat servis"><h2>Pengingat Tenggat ({total})</h2>
    <p>Tiket dengan sisa waktu 1 hari atau kurang menjadi prioritas tinggi. Konfirmasikan penyelesaian pengerjaan dan QC melalui detail tiket.</p>
    {tickets.length ? <ul className={styles.deadlines}>{tickets.map((ticket) => <li key={ticket.id}><Link className="text-link" to={`/technician/tickets/${ticket.id}`}>{ticket.ticketCode} · {ticket.customer?.name || ticket.device.model}</Link><DeadlineBadge ticket={ticket} /></li>)}</ul> : <p>Belum ada tiket yang mendekati tenggat.</p>}
    {total > tickets.length && <Link className="text-link" to="/technician/queue">Lihat semua antrean prioritas</Link>}
  </section>;
}
