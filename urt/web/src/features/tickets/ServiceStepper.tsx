import type { TicketStatus } from './status';
import styles from './Tickets.module.css';

const stages: { label: string; statuses: TicketStatus[] }[] = [
  { label: 'Pengajuan', statuses: ['submitted', 'waiting_diagnosis'] },
  { label: 'Diagnosis', statuses: ['diagnosing'] },
  { label: 'Persetujuan', statuses: ['awaiting_approval', 'approved', 'rejected'] },
  { label: 'Pengerjaan & QC', statuses: ['repairing', 'quality_check'] },
  { label: 'Siap Diambil', statuses: ['completed'] },
];
export function ServiceStepper({ status }: { status: TicketStatus }) {
  const index = stages.findIndex((stage) => stage.statuses.includes(status));
  const stopped = status === 'cancelled' || status === 'rejected';
  return (
    <div>
      <ol className={styles.stepper} aria-label="Tahapan pengerjaan servis">
        {stages.map((stage, i) => (
          <li
            key={stage.label}
            className={`${styles.step} ${!stopped && (i < index || status === 'completed') ? styles.stepPassed : ''} ${i === index ? styles.stepActive : ''}`}
            aria-current={i === index ? 'step' : undefined}
          >
            <span className={styles.stepDot}>
              {!stopped && (i < index || status === 'completed') ? '✓' : i + 1}
            </span>
            <span className={styles.stepLabel}>{stage.label}</span>
          </li>
        ))}
      </ol>
      {stopped && (
        <p className="reference-callout" role="status">
          {status === 'rejected'
            ? 'Estimasi ditolak. Menunggu tindak lanjut tempat servis.'
            : 'Pengajuan servis dibatalkan.'}
        </p>
      )}
    </div>
  );
}
