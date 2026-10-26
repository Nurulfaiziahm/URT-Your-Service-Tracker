import { Modal } from '../../components/ui/Modal';
import { useState, type FormEvent } from 'react';
import type { ServiceTicket } from './types';
import { useTransitionTicketMutation } from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

export type QCOperation = 'submit_qc' | 'pass_qc' | 'fail_qc' | 'reopen_diagnosis';

interface QCActionModalProps {
  businessId: string;
  ticket: ServiceTicket;
  operation: QCOperation;
  onClose: () => void;
  onSuccess: () => void;
}

export function QCActionModal({
  businessId,
  ticket,
  operation,
  onClose,
  onSuccess,
}: QCActionModalProps) {
  const [workSummary, setWorkSummary] = useState(ticket.workSummary || '');
  const [qcNotes, setQcNotes] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('30');
  const [warrantyTerms, setWarrantyTerms] = useState(
    'Garansi perbaikan meliputi kerusakan komponen yang sama. Segel tidak boleh rusak.',
  );
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [transition, { isLoading }] = useTransitionTicketMutation();

  const getTitle = () => {
    switch (operation) {
      case 'submit_qc':
        return 'Selesaikan Perbaikan & Ajukan QC';
      case 'pass_qc':
        return 'Persetujuan QC (Lolos Uji & Selesai)';
      case 'fail_qc':
        return 'Pengujian QC Gagal (Perlu Perbaikan Ulang)';
      case 'reopen_diagnosis':
        return 'Buka Kembali Diagnosis Tiket';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (operation === 'submit_qc') {
        if (!workSummary.trim() || workSummary.trim().length < 3) {
          setErrorMsg('Ringkasan pengerjaan wajib diisi minimal 3 karakter.');
          return;
        }
        await transition({
          businessId,
          ticketId: ticket.id,
          body: {
            expectedRevision: ticket.revision,
            targetStatus: 'quality_check',
            workSummary: workSummary.trim(),
          },
        }).unwrap();
      } else if (operation === 'pass_qc') {
        const parsedDays = parseInt(warrantyDays, 10);
        await transition({
          businessId,
          ticketId: ticket.id,
          body: {
            expectedRevision: ticket.revision,
            targetStatus: 'completed',
            qcPassed: true,
            qcNotes: qcNotes.trim() || undefined,
            warrantyDays: isNaN(parsedDays) ? undefined : parsedDays,
            warrantyTerms: warrantyTerms.trim() || undefined,
          },
        }).unwrap();
      } else if (operation === 'fail_qc') {
        if (!qcNotes.trim()) {
          setErrorMsg('Catatan kendala pengujian wajib diisi untuk perbaikan ulang.');
          return;
        }
        await transition({
          businessId,
          ticketId: ticket.id,
          body: {
            expectedRevision: ticket.revision,
            targetStatus: 'repairing',
            qcPassed: false,
            qcNotes: qcNotes.trim(),
          },
        }).unwrap();
      } else if (operation === 'reopen_diagnosis') {
        if (!reason.trim()) {
          setErrorMsg('Alasan pembukaan kembali diagnosis wajib diisi.');
          return;
        }
        await transition({
          businessId,
          ticketId: ticket.id,
          body: {
            expectedRevision: ticket.revision,
            targetStatus: 'diagnosing',
            reason: reason.trim(),
          },
        }).unwrap();
      }

      onSuccess();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(apiErr.data?.error || apiErr.data?.message || 'Gagal memperbarui status tiket.');
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className={styles.modalDialog}>
        <div className={styles.modalHeader}>
          <h3>{getTitle()}</h3>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
          {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

          {operation === 'submit_qc' && (
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="workSummary" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Ringkasan Pengerjaan Perbaikan (Wajib):
              </label>
              <textarea
                id="workSummary"
                rows={3}
                value={workSummary}
                onChange={(e) => setWorkSummary(e.target.value)}
                placeholder="Contoh: Penggantian modul display LCD original dan pembersihan konektor flex..."
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
                required
              />
            </div>
          )}

          {operation === 'pass_qc' && (
            <>
              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="qcNotes" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Catatan Pengujian QC (Opsional):
                </label>
                <textarea
                  id="qcNotes"
                  rows={2}
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Contoh: Layar sentuh responsif, audio jernih, baterai mengisi daya normal."
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <TextInput
                id="warrantyDays"
                label="Masa Garansi Toko (Hari)"
                type="number"
                min="0"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
              />

              <div style={{ display: 'grid', gap: 6 }}>
                <label htmlFor="warrantyTerms" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  Ketentuan Garansi:
                </label>
                <textarea
                  id="warrantyTerms"
                  rows={2}
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </>
          )}

          {operation === 'fail_qc' && (
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="qcFailNotes" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Kendala / Poin yang Tidak Lolos Uji (Wajib):
              </label>
              <textarea
                id="qcFailNotes"
                rows={3}
                value={qcNotes}
                onChange={(e) => setQcNotes(e.target.value)}
                placeholder="Contoh: Suara speaker masih kresek-kresek, perlu dicek ulang modul speaker..."
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
                required
              />
            </div>
          )}

          {operation === 'reopen_diagnosis' && (
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="reopenReason" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Alasan Pembukaan Kembali (Wajib):
              </label>
              <textarea
                id="reopenReason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Pelanggan meminta penyesuaian suku cadang alternatif yang lebih terjangkau..."
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                }}
                required
              />
            </div>
          )}

          <div className={styles.modalFooter}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              style={{
                backgroundColor: operation === 'fail_qc' ? '#dc2626' : undefined,
              }}
            >
              {isLoading ? 'Menyimpan...' : 'Konfirmasi'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
