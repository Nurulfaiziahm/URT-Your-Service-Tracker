import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './SummaryCard.module.css';

export function SummaryCard({
  label,
  value,
  detail,
  icon = 'ticket',
  tone = 'blue',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: IconName;
  tone?: 'blue' | 'green' | 'orange';
}) {
  return (
    <article className={styles.card} data-tone={tone}>
      <div className={styles.head}>
        <span>{label}</span>
        <span className={styles.icon}>
          <Icon name={icon} />
        </span>
      </div>
      <div className={styles.value}>
        <span className={styles.accent} />
        {value}
      </div>
      {detail && <p>{detail}</p>}
    </article>
  );
}
