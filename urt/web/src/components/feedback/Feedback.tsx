import type { ReactNode } from 'react';
import styles from './Feedback.module.css';

export function InlineNotice({
  children,
  type = 'info',
}: {
  children: ReactNode;
  type?: 'info' | 'error' | 'success';
}) {
  const typeClass =
    type === 'error'
      ? styles.noticeError
      : type === 'success'
        ? styles.noticeSuccess
        : styles.notice;

  return (
    <div className={typeClass} role="status">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  symbol = '—',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  symbol?: string;
}) {
  return (
    <section className={styles.state}>
      <span className={styles.symbol} aria-hidden="true">
        {symbol}
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </section>
  );
}

export function PageLoader() {
  return (
    <div className={styles.loader} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Memuat halaman…</span>
    </div>
  );
}
