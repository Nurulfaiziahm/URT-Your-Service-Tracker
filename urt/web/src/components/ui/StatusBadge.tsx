import type { ReactNode } from 'react';
import styles from './StatusBadge.module.css';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export function StatusBadge({ label, tone = 'neutral' }: { label: ReactNode; tone?: StatusTone }) {
  return <span className={`${styles.badge} ${styles[tone]}`} data-status-badge><span className={styles.label}>{label}</span></span>;
}
