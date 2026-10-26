import { ticketStatuses, type TicketStatus } from './status';
import styles from './TicketStatusBadge.module.css';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { label, tone } = ticketStatuses[status];
  return <span className={`${styles.badge} ${styles[tone]}`}>{label}</span>;
}
