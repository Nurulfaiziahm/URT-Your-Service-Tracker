import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import styles from './OwnerPortalQrDialog.module.css';

export interface OwnerPortalLink {
  title: string;
  path: string;
}

export function OwnerPortalQrDialog({ portal, onClose }: { portal: OwnerPortalLink; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = `${window.location.origin}${portal.path}`;
  const downloadName = `urt-${portal.title === 'Portal Teknisi' ? 'teknisi' : 'pelanggan'}-${window.location.hostname}.png`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: { dark: '#111827', light: '#ffffff' },
    }).then((dataUrl) => {
      if (!cancelled) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (!cancelled) setError('QR tidak dapat dibuat. Coba tutup lalu buka kembali.');
    });

    return () => { cancelled = true; };
  }, [url]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="portal-qr-title"
      aria-label={`QR ${portal.title}`}
      onClose={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
    >
      <div className={styles.content}>
        <button type="button" className={styles.close} aria-label="Tutup QR" onClick={() => dialogRef.current?.close()}>
          ×
        </button>
        <header className={styles.heading}>
          <span className="eyebrow">Bagikan akses portal</span>
          <h2 id="portal-qr-title">QR {portal.title}</h2>
          <p>Pindai QR ini untuk membuka tautan portal berikut.</p>
        </header>
        <div className={styles.printArea}>
          <strong className={styles.printTitle}>{portal.title} · URT</strong>
          <div className={styles.qrFrame} aria-live="polite">
            {qrDataUrl ? <img src={qrDataUrl} alt={`Kode QR untuk ${portal.title}`} /> : error ? <p role="alert">{error}</p> : <p>Membuat QR…</p>}
          </div>
          <p className={styles.url}>{url}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => window.print()} disabled={!qrDataUrl}>
            Cetak QR
          </button>
          <a className={styles.primary} href={qrDataUrl || undefined} download={downloadName} aria-disabled={!qrDataUrl}>
            Unduh PNG
          </a>
        </div>
      </div>
    </dialog>
  );
}
