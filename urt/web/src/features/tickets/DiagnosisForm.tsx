import { useState, type FormEvent } from 'react';
import type { ServiceTicket } from './types';
import { useSaveDiagnosisMutation } from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

interface DiagnosisFormProps {
  businessId: string;
  ticket: ServiceTicket;
  onSuccess?: () => void;
}

export function DiagnosisForm({ businessId, ticket, onSuccess }: DiagnosisFormProps) {
  const [staffFindings, setStaffFindings] = useState(ticket.diagnosis?.staffFindings || '');
  const [customerExplanation, setCustomerExplanation] = useState(
    ticket.diagnosis?.customerExplanation || '',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [saveDiagnosis, { isLoading }] = useSaveDiagnosisMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!customerExplanation || customerExplanation.trim().length < 3) {
      setErrorMsg('Penjelasan untuk pelanggan wajib diisi (minimal 3 karakter).');
      return;
    }

    try {
      await saveDiagnosis({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          staffFindings: staffFindings.trim() || undefined,
          customerExplanation: customerExplanation.trim(),
        },
      }).unwrap();

      setSuccessMsg('Hasil diagnosis berhasil disimpan.');
      onSuccess?.();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(
        apiErr.data?.error || apiErr.data?.message || 'Gagal menyimpan hasil diagnosis.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.ticketCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Hasil Diagnosis & Pemeriksaan Perangkat</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          Revisi Tiket #{ticket.revision}
        </span>
      </div>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}
      {successMsg && <InlineNotice type="success">{successMsg}</InlineNotice>}

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="staffFindings" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Temuan Teknis Internal (Hanya dilihat oleh staf & pemilik):
        </label>
        <textarea
          id="staffFindings"
          rows={3}
          value={staffFindings}
          onChange={(e) => setStaffFindings(e.target.value)}
          placeholder="Catatan hasil pengukuran tegangan, jalur korsleting, IC rusak, atau kondisi internal..."
          style={{
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
          }}
        />
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor="customerExplanation" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
          Penjelasan untuk Pelanggan (Wajib, akan dilihat pelanggan):
        </label>
        <textarea
          id="customerExplanation"
          rows={3}
          value={customerExplanation}
          onChange={(e) => setCustomerExplanation(e.target.value)}
          placeholder="Jelaskan komponen yang bermasalah dan rekomendasi penanganan dengan bahasa yang ramah..."
          style={{
            padding: '10px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
          }}
          required
        />
      </div>

      <div className={styles.actionBar} style={{ justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" disabled={isLoading}>
          {isLoading ? 'Menyimpan...' : 'Simpan Hasil Diagnosis'}
        </Button>
      </div>
    </form>
  );
}
