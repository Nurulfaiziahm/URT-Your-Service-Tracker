import { Icon } from '../../components/ui/Icon';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ServiceTicket, SerializedAttachment } from './types';
import {
  useUploadFileMutation,
  useAddAttachmentMutation,
  useDetachAttachmentMutation,
} from './ticketsApi';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Tickets.module.css';

interface TicketAttachmentsProps {
  businessId: string;
  ticket: ServiceTicket;
  userRole: 'owner' | 'technician' | 'customer';
  onSuccess?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function TicketAttachments({
  businessId,
  ticket,
  userRole,
  onSuccess,
}: TicketAttachmentsProps) {
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visibility, setVisibility] = useState<'customer' | 'staff'>('customer');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();
  const [addAttachment, { isLoading: isAttaching }] = useAddAttachmentMutation();
  const [detachAttachment, { isLoading: isDetaching }] = useDetachAttachmentMutation();

  const isBusy = isUploading || isAttaching || isDetaching;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // 1. Upload to storage
      const uploadRes = await uploadFile(formData).unwrap();
      const fileKey = uploadRes.data?.key;

      if (!fileKey) {
        throw new Error('Gagal mendapatkan kunci file dari server penyimpanan.');
      }

      // 2. Associate with ticket
      await addAttachment({
        businessId,
        ticketId: ticket.id,
        body: {
          key: fileKey,
          visibility: userRole === 'customer' ? 'customer' : visibility,
          expectedRevision: ticket.revision,
        },
      }).unwrap();

      setSelectedFile(null);
      setSuccessMsg('Berkas lampiran berhasil diunggah.');
      onSuccess?.();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody; message?: string };
      setErrorMsg(
        apiErr.data?.error ||
          apiErr.data?.message ||
          apiErr.message ||
          'Gagal mengunggah lampiran berkas.',
      );
    }
  };

  const handleDetach = async (key: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await detachAttachment({
        businessId,
        ticketId: ticket.id,
        key,
        expectedRevision: ticket.revision,
      }).unwrap();

      setDeleteKey(null);
      setSuccessMsg('Lampiran berhasil dihapus.');
      onSuccess?.();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMsg(apiErr.data?.error || apiErr.data?.message || 'Gagal menghapus lampiran berkas.');
    }
  };

  const attachments: SerializedAttachment[] = ticket.attachments || [];

  return (
    <div className={styles.ticketCard}>
      {deleteKey && (
        <ConfirmDialog
          title="Hapus Lampiran"
          description="Lampiran ini akan dihapus dari tiket servis."
          pending={isDetaching}
          onClose={() => setDeleteKey(null)}
          onConfirm={() => {
            const key = deleteKey;
            setDeleteKey(null);
            void handleDetach(key);
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Lampiran Berkas & Foto Unit</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
          {attachments.length} Berkas
        </span>
      </div>

      {errorMsg && <InlineNotice type="error">{errorMsg}</InlineNotice>}
      {successMsg && <InlineNotice type="success">{successMsg}</InlineNotice>}

      {attachments.length === 0 ? (
        <p
          style={{ margin: 0, fontSize: '0.9rem', color: 'var(--slate-500)', fontStyle: 'italic' }}
        >
          Belum ada foto atau dokumen yang dilampirkan pada tiket servis ini.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {attachments.map((att) => (
            <div
              key={att.key}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--canvas)',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>
                  <Icon name={att.mimeType.startsWith('image/') ? 'image' : 'file'} />
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy-950)' }}>
                    {att.originalName}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)' }}>
                    {formatBytes(att.size)} • Diunggah oleh {att.uploadedByName} •{' '}
                    {new Date(att.uploadedAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {userRole !== 'customer' && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: att.visibility === 'customer' ? '#eff6ff' : '#f1f5f9',
                      color: att.visibility === 'customer' ? '#1d4ed8' : '#475569',
                      fontWeight: 600,
                    }}
                  >
                    {att.visibility === 'customer' ? 'Pelanggan & Staf' : 'Hanya Staf'}
                  </span>
                )}

                {userRole === 'owner' && (
                  <button
                    type="button"
                    onClick={() => setDeleteKey(att.key)}
                    disabled={isBusy}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form */}
      <form
        onSubmit={handleUploadSubmit}
        style={{
          marginTop: 8,
          paddingTop: 12,
          borderTop: '1px solid var(--border)',
          display: 'grid',
          gap: 10,
        }}
      >
        <strong style={{ fontSize: '0.9rem', color: 'var(--navy-950)' }}>
          + Unggah Lampiran Baru (Foto / Dokumen PDF):
        </strong>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={isBusy}
            style={{ fontSize: '0.88rem' }}
            required
          />

          {userRole !== 'customer' && (
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'customer' | 'staff')}
              disabled={isBusy}
              style={{
                padding: '6px 10px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                fontSize: '0.85rem',
              }}
            >
              <option value="customer">Terlihat oleh Pelanggan & Staf</option>
              <option value="staff">Hanya Internal Staf & Pemilik</option>
            </select>
          )}

          <Button
            type="submit"
            variant="secondary"
            disabled={!selectedFile || isBusy}
            style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          >
            {isBusy ? 'Mengunggah...' : 'Unggah Berkas'}
          </Button>
        </div>
      </form>
    </div>
  );
}
