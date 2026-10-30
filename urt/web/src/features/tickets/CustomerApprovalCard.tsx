import { useState } from 'react';
import type { EstimateRevision, ServiceTicket } from './types';
import { useRespondToEstimateMutation } from './ticketsApi';
import { EstimateBreakdown } from './EstimateBreakdown';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

interface CustomerApprovalCardProps {
  businessId: string;
  ticket: ServiceTicket;
  onSuccess?: (decision: 'approved' | 'rejected') => void;
}

export function CustomerApprovalCard({ businessId, ticket, onSuccess }: CustomerApprovalCardProps) {
  const pendingRevision: EstimateRevision | undefined =
    ticket.estimateRevisions?.find((r) => r.status === 'pending') ||
    (ticket.estimateRevisions && ticket.estimateRevisions.length > 0
      ? ticket.estimateRevisions[ticket.estimateRevisions.length - 1]
      : undefined);

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [respond, { isLoading }] = useRespondToEstimateMutation();

  if (!pendingRevision) {
    return null;
  }

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await respond({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          estimateVersion: pendingRevision.version,
          decision,
          reason: decision === 'rejected' ? rejectReason.trim() || undefined : undefined,
        },
      }).unwrap();

      setSuccessMsg(
        decision === 'approved'
          ? 'Estimasi berhasil disetujui! Teknisi akan segera memulai perbaikan perangkat Anda.'
          : 'Estimasi telah ditolak. Pihak tempat servis akan menghubungi Anda terkait langkah selanjutnya.',
      );
      setIsRejecting(false);
      onSuccess?.(decision);
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(
        apiErr.data?.error || apiErr.data?.message || 'Gagal memproses persetujuan estimasi.',
      );
    }
  };

  return (
    <div className={styles.ticketCard} style={{ border: '2px solid var(--blue)' }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <h2 style={{ color: 'var(--navy-950)' }}>Persetujuan Estimasi Biaya Perbaikan</h2>
        <p style={{ fontSize: '0.92rem', color: 'var(--slate-600)' }}>
          Teknisi telah menyelesaikan pemeriksaan dan mengajukan estimasi biaya di bawah. Mohon
          tinjau rincian pengerjaan dan biaya berikut untuk memberikan persetujuan pengerjaan.
        </p>
      </div>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}
      {successMsg && <InlineNotice type="success">{successMsg}</InlineNotice>}

      <EstimateBreakdown revision={pendingRevision} customerView />

      {!isRejecting ? (
        <div
          className={styles.actionBar}
          style={{
            justifyContent: 'flex-end',
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsRejecting(true)}
            disabled={isLoading}
            style={{ color: '#dc2626' }}
          >
            Tolak Estimasi Biaya
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleDecision('approved')}
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : '✓ Setujui Estimasi & Mulai Perbaikan'}
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 12,
            padding: 16,
            background: '#fef2f2',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #fecaca',
          }}
        >
          <strong style={{ color: '#991b1b', fontSize: '0.95rem' }}>
            Konfirmasi Penolakan Estimasi
          </strong>
          <p style={{ fontSize: '0.88rem', color: '#7f1d1d' }}>
            Apakah Anda yakin ingin menolak estimasi ini? Perangkat tidak akan diperbaiki sebelum
            ada kesepakatan baru.
          </p>

          <div style={{ display: 'grid', gap: 4 }}>
            <label
              htmlFor="rejectReason"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b' }}
            >
              Alasan Penolakan (Opsional):
            </label>
            <input
              id="rejectReason"
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Biaya melebihi anggaran yang disiapkan"
              style={{
                padding: '8px 12px',
                border: '1px solid #fca5a5',
                borderRadius: 4,
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRejecting(false)}
              disabled={isLoading}
            >
              Kembali
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleDecision('rejected')}
              disabled={isLoading}
              style={{ backgroundColor: '#dc2626' }}
            >
              {isLoading ? 'Memproses...' : 'Ya, Tolak Estimasi'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
