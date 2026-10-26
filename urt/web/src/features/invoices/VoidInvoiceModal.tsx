import { Modal } from '../../components/ui/Modal';
import { useState, type FormEvent } from 'react';
import type { ServiceInvoice } from './types';
import { useVoidInvoiceMutation } from './invoicesApi';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';

interface VoidInvoiceModalProps {
  businessId: string;
  invoice: ServiceInvoice;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidInvoiceModal({
  businessId,
  invoice,
  onClose,
  onSuccess,
}: VoidInvoiceModalProps) {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [voidInvoice, { isLoading }] = useVoidInvoiceMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reason.trim()) {
      setErrorMsg('Alasan pembatalan invoice wajib diisi.');
      return;
    }

    try {
      await voidInvoice({
        businessId,
        invoiceId: invoice.id,
        body: {
          expectedRevision: invoice.revision,
          reason: reason.trim(),
        },
      }).unwrap();

      onSuccess();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(apiErr.data?.error || apiErr.data?.message || 'Gagal membatalkan invoice.');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3>Batalkan Invoice (VOID)</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

          <p
            style={{
              margin: 0,
              fontSize: '0.9rem',
              color: '#7f1d1d',
              background: '#fef2f2',
              padding: 12,
              borderRadius: 6,
            }}
          >
            Perhatian: Pembatalan hanya dapat dilakukan untuk invoice yang belum menerima
            pembayaran. Tindakan ini bersifat permanen dan akan dicatat pada riwayat audit.
          </p>

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="voidReason" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Alasan Pembatalan Invoice *
            </label>
            <textarea
              id="voidReason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Kesalahan rincian item, akan diterbitkan invoice pengganti..."
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
              }}
              required
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Kembali
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              style={{ backgroundColor: '#dc2626' }}
            >
              {isLoading ? 'Membatalkan...' : 'Ya, Batalkan Invoice'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
