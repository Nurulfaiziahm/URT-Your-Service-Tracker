import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { toastDismissed, type ToastMessage } from './toastSlice';
import styles from './Toaster.module.css';

function Toast({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (hovered || focused) return;
    const timeout = window.setTimeout(() => dispatch(toastDismissed(toast.id)), toast.type === 'error' ? 8000 : 5000);
    return () => window.clearTimeout(timeout);
  }, [dispatch, toast.id, toast.type, hovered, focused]);

  return (
    <article
      className={styles.toast}
      data-type={toast.type}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <span className={styles.icon} aria-hidden="true">{toast.type === 'error' ? '!' : toast.type === 'success' ? '✓' : 'i'}</span>
      <div className={styles.copy}>
        <strong>{toast.type === 'error' ? 'Terjadi kendala' : toast.type === 'success' ? 'Berhasil' : 'Informasi'}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" className={styles.close} aria-label="Tutup pemberitahuan" onClick={() => dispatch(toastDismissed(toast.id))}>
        <span aria-hidden="true">×</span>
      </button>
    </article>
  );
}

export function Toaster() {
  const toasts = useAppSelector((state) => state.toasts);
  return (
    <section className={styles.toaster} aria-label="Pemberitahuan aplikasi">
      {toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}
    </section>
  );
}
