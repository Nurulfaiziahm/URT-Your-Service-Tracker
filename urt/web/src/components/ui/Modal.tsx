import { useEffect, useRef, useId, type ReactNode } from 'react';
import styles from './Modal.module.css';
export function Modal({
  children,
  onClose,
  label = 'Dialog',
}: {
  children: ReactNode;
  onClose: () => void;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const labelId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      const heading = dialog.querySelector('h2,h3');
      if (heading) {
        heading.id ||= `${labelId}-heading`;
        dialog.setAttribute('aria-labelledby', heading.id);
      }
      dialog.showModal();
    }
    return () => dialog?.close();
  }, [labelId]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={labelId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      {children}
    </dialog>
  );
}
