import { serviceProgressState, serviceWorkflowStages, type TicketStatus } from './status';
import styles from './Tickets.module.css';

export function ServiceStepper({ status, className, statusNote }: { status: TicketStatus; className?: string; statusNote?: string }) {
  const stopped = status === 'cancelled' || status === 'rejected';
  return (
    <div className={[styles.serviceStatus, className].filter(Boolean).join(' ')}>
      <ol className={styles.stepper} aria-label="Tahapan pengerjaan servis">
        {serviceWorkflowStages.map((stage, index) => {
          const state = serviceProgressState(status, index);
          return (
            <li
              key={stage.label}
              className={styles.step}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <span className={styles.stepDot} aria-hidden="true">
                {state === 'completed' ? '\u2713' : state === 'rejected' ? '!' : index + 1}
              </span>
              <span className={styles.stepLabel}>
                {stage.label}{state === 'rejected' ? ' \u00b7 Ditolak' : ''}
              </span>
            </li>
          );
        })}
      </ol>
      {(statusNote || stopped) && (
        <p className={`${styles.stepNotice} ${status === 'rejected' || status === 'cancelled' ? styles.stepNoticeDanger : ''}`} role="status">
          {statusNote || (status === 'rejected' ? 'Estimasi ditolak. Menunggu tindak lanjut tempat servis.' : 'Pengajuan servis dibatalkan.')}
        </p>
      )}
    </div>
  );
}
