import { Modal } from '../../components/ui/Modal';
import { useState, type FormEvent } from 'react';
import type { ServiceInvoice, PaymentMethod } from './types';
import { useRecordPaymentMutation } from './invoicesApi';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import { formatRupiah } from '../tickets/currency';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';

interface RecordPaymentModalProps {
  businessId: string;
  invoice: ServiceInvoice;
  onClose: () => void;
  onSuccess: () => void;
}

export function RecordPaymentModal({
  businessId,
  invoice,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amountStr, setAmountStr] = useState(String(invoice.balance));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [recordPayment, { isLoading }] = useRecordPaymentMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Jumlah pembayaran harus lebih besar dari Rp 0.');
      return;
    }

    if (amount > invoice.balance) {
      setErrorMsg(
        `Jumlah pembayaran tidak boleh melebihi sisa tagihan (${formatRupiah(invoice.balance)}).`,
      );
      return;
    }

    try {
      await recordPayment({
        businessId,
        invoiceId: invoice.id,
        body: {
          expectedRevision: invoice.revision,
          amount,
          paymentMethod,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      }).unwrap();

      onSuccess();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(apiErr.data?.error || apiErr.data?.message || 'Gagal mencatat pembayaran.');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3>Catat Pembayaran Invoice Servis</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

          <div
            style={{
              padding: '10px 14px',
              background: 'var(--canvas)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Sisa Tagihan Saat Ini:</span>
            <strong style={{ color: '#dc2626' }}>{formatRupiah(invoice.balance)}</strong>
          </div>

          <TextInput
            id="amount"
            label="Jumlah Pembayaran (Rp) *"
            type="number"
            min="1000"
            max={invoice.balance}
            step="1000"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="method" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Metode Pembayaran *
            </label>
            <select
              id="method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                background: 'var(--card)',
              }}
            >
              <option value="cash">Tunai (Cash)</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="card">Kartu Debit / Kredit</option>
              <option value="other">Metode Lain</option>
            </select>
          </div>

          <TextInput
            id="ref"
            label="Nomor Referensi / Bukti Transfer (Opsional)"
            placeholder="Contoh: REF-8891283"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="paymentNotes" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Catatan Pembayaran (Opsional):
            </label>
            <input
              id="paymentNotes"
              type="text"
              placeholder="Contoh: Pembayaran lunas saat pengambilan unit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : '✓ Simpan Pembayaran'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
