import { useState } from 'react';
import type { ServiceTicket } from './types';
import { useTransitionTicketMutation } from './ticketsApi';
import { QCActionModal, type QCOperation } from './QCActionModal';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

interface TechnicianWorkflowActionsProps {
  businessId: string;
  ticket: ServiceTicket;
  onSuccess: () => void;
  onToggleEstimateEditor?: () => void;
}

export function TechnicianWorkflowActions({
  businessId,
  ticket,
  onSuccess,
  onToggleEstimateEditor,
}: TechnicianWorkflowActionsProps) {
  const [activeModal, setActiveModal] = useState<QCOperation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [transition, { isLoading }] = useTransitionTicketMutation();

  const handleSimpleTransition = async (targetStatus: 'waiting_diagnosis' | 'diagnosing' | 'repairing') => {
    setErrorMsg(null);
    try {
      await transition({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          targetStatus,
        },
      }).unwrap();
      onSuccess();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(
        apiErr.data?.error || apiErr.data?.message || 'Gagal mengubah status pengerjaan.',
      );
    }
  };

  const allowed = ticket.allowedActions || [];

  return (
    <div className={styles.ticketCard}>
      <h2>Tindakan Pengerjaan Servis</h2>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}

      <div className={styles.actionBar}>
        {allowed.includes('accept_intake') && <Button disabled={isLoading} onClick={() => void handleSimpleTransition('waiting_diagnosis')}>Terima Perangkat</Button>}
        {allowed.includes('start_diagnosis') && (
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSimpleTransition('diagnosing')}
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : '▶ Mulai Proses Diagnosis'}
          </Button>
        )}

        {allowed.includes('start_repair') && (
          <Button
            type="button"
            variant="primary"
            onClick={() => handleSimpleTransition('repairing')}
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Mulai Proses Perbaikan'}
          </Button>
        )}

        {allowed.includes('revise_estimate') && onToggleEstimateEditor && (
          <Button
            type="button"
            variant="secondary"
            onClick={onToggleEstimateEditor}
            disabled={isLoading}
          >
            Buat Revisi Estimasi Biaya
          </Button>
        )}

        {allowed.includes('submit_qc') && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setActiveModal('submit_qc')}
            disabled={isLoading}
          >
            Pengerjaan Selesai, Mulai QC
          </Button>
        )}

        {allowed.includes('pass_qc') && (
          <Button
            type="button"
            variant="primary"
            onClick={() => setActiveModal('pass_qc')}
            disabled={isLoading}
          >
            QC Lulus, Siap Diambil
          </Button>
        )}

        {allowed.includes('fail_qc') && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveModal('fail_qc')}
            disabled={isLoading}
            style={{ color: '#dc2626' }}
          >
            ✕ QC Gagal (Perlu Perbaikan Ulang)
          </Button>
        )}

        {allowed.includes('reopen_diagnosis') && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setActiveModal('reopen_diagnosis')}
            disabled={isLoading}
          >
            ↺ Buka Ulang Diagnosis
          </Button>
        )}
      </div>

      {activeModal && (
        <QCActionModal
          businessId={businessId}
          ticket={ticket}
          operation={activeModal}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}
