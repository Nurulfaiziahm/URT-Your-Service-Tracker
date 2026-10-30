import { useEffect, useState } from 'react';
import { durationLabel, ticketDeadline } from './service-timing';
import type { ServiceTicket } from './types';
import styles from './TicketTiming.module.css';
import { StatusBadge } from '../../components/ui/StatusBadge';

export function DeadlineBadge({ ticket }: { ticket: ServiceTicket }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const deadline = ticketDeadline(ticket, now);
  const tone = deadline.level === 'overdue' || deadline.level === 'high' ? 'danger' : deadline.level === 'soon' ? 'warning' : 'neutral';
  return <div className={styles.deadlineBadge}>
    <StatusBadge label={deadline.label} tone={tone} />
    {deadline.dueAt && <><span>{deadline.remaining}</span><time dateTime={deadline.dueAt}>{new Date(deadline.dueAt).toLocaleString('id-ID')}</time></>}
  </div>;
}

export function TicketTiming({ ticket }: { ticket: ServiceTicket }) {
  const estimate = ticket.status === 'awaiting_approval' ? ticket.estimateRevisions?.at(-1) : ticket.approvedEstimate || ticket.estimateRevisions?.at(-1);
  if (!estimate && !ticket.repairDueAt && !ticket.qcDueAt) return null;
  return <section className="reference-panel"><h2>Jadwal Pengerjaan & QC</h2>
    <dl className="reference-dl"><div><dt>Estimasi pengerjaan</dt><dd>{durationLabel(estimate?.repairDurationMinutes)}</dd></div>
      <div><dt>Estimasi QC</dt><dd>{durationLabel(estimate?.qcDurationMinutes)}</dd></div>
      {estimate?.targetCompletionDate && <div><dt>Target siap diambil</dt><dd>{new Date(estimate.targetCompletionDate).toLocaleString('id-ID')}</dd></div>}
      {ticket.repairDueAt && <div><dt>Target pengerjaan selesai</dt><dd>{new Date(ticket.repairDueAt).toLocaleString('id-ID')}</dd></div>}
      {ticket.qcDueAt && <div><dt>Target QC selesai</dt><dd>{new Date(ticket.qcDueAt).toLocaleString('id-ID')}</dd></div>}
    </dl><p className={styles.note}>Jadwal adalah estimasi. Teknisi mengonfirmasi pengerjaan selesai dan hasil QC secara terpisah.</p>
  </section>;
}
