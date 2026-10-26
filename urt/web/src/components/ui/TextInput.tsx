import { useId, type InputHTMLAttributes } from 'react';
import styles from './TextInput.module.css';

export function TextInput({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
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
      <input
        {...props}
        id={fieldId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={description || undefined}
      />
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
