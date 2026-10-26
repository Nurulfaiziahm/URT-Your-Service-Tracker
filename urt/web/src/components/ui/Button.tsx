import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type StyleProps = { variant?: Variant; full?: boolean; size?: 'small' | 'medium' | 'large' };
function classes(variant: Variant, full: boolean, extra = '') {
  return `${styles.button} ${styles[variant]} ${full ? styles.full : ''} ${extra}`;
}

export function Button({
  variant = 'primary',
  full = false,
  size = 'medium',
  className,
  pending = false,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { pending?: boolean }) {
  return (
    <button
      type="button"
      translate="no"
      {...props}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${classes(variant, full, className)} ${styles[size]}`}
    >
      <span aria-hidden={pending || undefined} style={pending ? { visibility: 'hidden' } : undefined}>
        {children}
      </span>
      {pending && (
        <span
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          aria-live="polite"
        >
          Memproses…
        </span>
      )}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  full = false,
  size = 'medium',
  className,
  ...props
}: LinkProps & StyleProps) {
  return <Link {...props} className={`${classes(variant, full, className)} ${styles[size]}`} />;
}
