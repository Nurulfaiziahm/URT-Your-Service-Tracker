import { ticketStatuses, type TicketStatus } from './status';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const { label, tone } = ticketStatuses[status];
  return <StatusBadge label={label} tone={tone} />;
}
