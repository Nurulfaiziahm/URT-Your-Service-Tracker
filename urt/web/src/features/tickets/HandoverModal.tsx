import { Modal } from '../../components/ui/Modal';
import { useState, type FormEvent } from 'react';
import type { ServiceTicket } from './types';
import { useHandoverTicketMutation } from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

interface HandoverModalProps {
  businessId: string;
  ticket: ServiceTicket;
  onClose: () => void;
  onSuccess: () => void;
}

export function HandoverModal({ businessId, ticket, onClose, onSuccess }: HandoverModalProps) {
  const [recipient, setRecipient] = useState(ticket.customer?.name || '');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [handover, { isLoading }] = useHandoverTicketMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recipient.trim()) {
      setErrorMsg('Nama pihak yang mengambil perangkat wajib diisi.');
      return;
    }

    try {
      await handover({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          handedOverTo: recipient.trim(),
          notes: notes.trim() || undefined,
        },
      }).unwrap();

      onSuccess();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(
        apiErr.data?.error || apiErr.data?.message || 'Gagal mencatat penyerahan perangkat.',
      );
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3>Serah Terima Perangkat ke Pelanggan</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

          <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)', margin: 0 }}>
            Pastikan perangkat telah diuji coba bersama pelanggan dan biaya pengerjaan telah
            diselesaikan sebelum menyerahkan unit.
          </p>

          <TextInput
            id="recipient"
            label="Nama Pengambil / Penerima Perangkat *"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Contoh: Budi Santoso (Pemilik)"
            required
          />

          <div style={{ display: 'grid', gap: 4 }}>
            <label htmlFor="notes" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
              Catatan Penyerahan (Opsional):
            </label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Unit dicek menyala normal, kelengkapan charger diserahkan lengkap."
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : '✓ Konfirmasi Penyerahan Unit'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
