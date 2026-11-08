import { ticketStatuses, type TicketStatus } from './status';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function TicketStatusBadge({
  status,
  rejectedFlow = false,
}: {
  status: TicketStatus;
  rejectedFlow?: boolean;
}) {
  const displayStatus = status === 'completed' && rejectedFlow ? 'rejected' : status;
  const { label, tone } = ticketStatuses[displayStatus];
  return <StatusBadge label={label} tone={tone} />;
}
