import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import logoUrl from '../../assets/logo-urt.svg';
import styles from './OwnerPortalQrDialog.module.css';

export interface OwnerPortalLink {
  title: string;
  path: string;
}

export function OwnerPortalQrDialog({ portal, onClose }: { portal: OwnerPortalLink; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
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
      width: 520,
      color: { dark: '#111827', light: '#ffffff' },
    }).then((dataUrl) => new Promise<{ qr: string; poster: string }>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 960;
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Canvas unavailable'));

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#e2e8f0';
        context.lineWidth = 2;
        context.strokeRect(24, 24, 672, 912);
        context.fillStyle = '#2563eb';
        context.font = '700 20px Arial, sans-serif';
        context.textAlign = 'center';
        context.fillText('URT  ·  YOUR SERVICE TRACKER', 360, 82);
        context.strokeStyle = '#e2e8f0';
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(92, 112);
        context.lineTo(628, 112);
        context.stroke();
        context.fillStyle = '#0f172a';
        context.font = '700 30px Arial, sans-serif';
        context.fillText(portal.title === 'Portal Teknisi' ? 'Pindai untuk masuk ke Portal Teknisi' : 'Pindai untuk masuk ke Portal Pelanggan', 360, 198, 640);
        context.fillStyle = '#64748b';
        context.font = '18px Arial, sans-serif';
        context.fillText('Arahkan kamera ponsel Anda ke kode QR ini', 360, 238);
        context.fillText('untuk membuka portal.', 360, 262);

        context.fillStyle = '#ffffff';
        context.fillRect(78, 310, 564, 564);
        context.strokeStyle = '#cbd5e1';
        context.lineWidth = 2;
        context.strokeRect(78, 310, 564, 564);
        context.drawImage(image, 100, 330, 520, 520);
        context.fillStyle = '#64748b';
        context.font = '16px Arial, sans-serif';
        context.fillText(url, 360, 922, 620);
        const logo = new Image();
        logo.onload = () => {
          context.fillStyle = '#ffffff';
          context.fillRect(28, 28, 664, 112);
          context.drawImage(logo, 272, 48, 176, 79);
          context.strokeStyle = '#e2e8f0';
          context.lineWidth = 2;
          context.strokeRect(24, 24, 672, 912);
          resolve({ qr: dataUrl, poster: canvas.toDataURL('image/png') });
        };
        logo.onerror = () => reject(new Error('Logo unavailable'));
        logo.src = logoUrl;
      };
      image.onerror = () => reject(new Error('QR image unavailable'));
      image.src = dataUrl;
    })).then(({ qr, poster }) => {
      if (!cancelled) {
        setQrDataUrl(qr);
        setPosterDataUrl(poster);
      }
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
        {posterDataUrl && <img className={styles.printPoster} src={posterDataUrl} alt={`Poster QR ${portal.title}`} />}
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => window.print()} disabled={!qrDataUrl}>
            Cetak QR
          </button>
          <a className={styles.primary} href={posterDataUrl || undefined} download={downloadName} aria-disabled={!posterDataUrl}>
            Unduh PNG
          </a>
        </div>
      </div>
    </dialog>
  );
}
