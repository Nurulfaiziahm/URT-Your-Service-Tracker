import { useId, useState, type InputHTMLAttributes } from 'react';
import styles from './TextInput.module.css';

export function TextInput({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const fieldId = id || generatedId;
  const description = [
    hint ? `${fieldId}-hint` : '',
    error ? `${fieldId}-error` : '',
    props['aria-describedby'],
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId} className={styles.label}>
        {label}
      </label>
      <div className={props.type === 'password' ? styles.passwordWrap : undefined}>
        <input
          {...props}
          type={props.type === 'password' && visible ? 'text' : props.type}
          id={fieldId}
          className={`${styles.input} ${props.type === 'password' ? styles.passwordInput : ''}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={description || undefined}
        />
        {props.type === 'password' && (
          <button className={styles.passwordToggle} type="button" aria-controls={fieldId}
            aria-label={visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
            {visible ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A11 11 0 0112 5c7 0 10 7 10 7a15 15 0 01-3 4.2M6.2 6.2C3.5 8 2 12 2 12s3 7 10 7a10 10 0 004-.8" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>}
          </button>
        )}
      </div>
      {hint && (
        <span id={`${fieldId}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${fieldId}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
