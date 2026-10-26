import { Modal } from '../../components/ui/Modal';
import { useState, type FormEvent } from 'react';
import { useGetTechniciansQuery } from '../technicians/techniciansApi';
import { useAssignTechnicianMutation } from './ticketsApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';

interface AssignmentModalProps {
  businessId: string;
  ticketId: string;
  expectedRevision: number;
  currentTechnicianId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignmentModal({
  businessId,
  ticketId,
  expectedRevision,
  currentTechnicianId,
  onClose,
  onSuccess,
}: AssignmentModalProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(currentTechnicianId || '');
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: techData, isLoading: isLoadingTechs } = useGetTechniciansQuery({
    businessId,
    status: 'active',
  });

  const [assignTechnician, { isLoading: isAssigning }] = useAssignTechnicianMutation();

  const technicians = techData?.data || [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedTechnicianId) {
      setErrorMessage('Pilih teknisi yang akan ditugaskan.');
      return;
    }

    try {
      await assignTechnician({
        businessId,
        ticketId,
        body: {
          expectedRevision,
          assignedTechnicianId: selectedTechnicianId,
          reason: reason.trim() || undefined,
        },
      }).unwrap();

      onSuccess();
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal menugaskan teknisi. Tiket mungkin telah diperbarui di sesi lain.',
      );
    }
  }

  return (
    <Modal onClose={onClose}>
      <div
        style={{
          background: 'var(--card)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          maxWidth: 480,
          width: '100%',
          display: 'grid',
          gap: 16,
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--navy-950)' }}>
            {currentTechnicianId ? 'Ganti Penugasan Teknisi' : 'Tugaskan Teknisi'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>

        {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }} noValidate>
          <div>
            <label
              htmlFor="tech-select"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, marginBottom: 4 }}
            >
              Pilih Teknisi
            </label>
            {isLoadingTechs ? (
              <p style={{ fontSize: '0.85rem' }}>Memuat daftar teknisi aktif...</p>
            ) : (
              <select
                id="tech-select"
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  color: 'var(--navy-950)',
                }}
              >
                <option value="">-- Pilih Teknisi --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{' '}
                    {t.specializations.length > 0 ? `(${t.specializations.join(', ')})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <TextInput
            label="Alasan / Catatan Penugasan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Spesialis perbaikan hardware"
          />

          <div className="actions" style={{ justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" pending={isAssigning}>
              Konfirmasi Penugasan
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
