import { Icon } from '../../components/ui/Icon';
import { Modal } from '../../components/ui/Modal';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetBusinessByIdQuery } from '../business/businessApi';
import {
  useGetTicketByIdQuery,
  useTransitionTicketMutation,
  useIssueTrackingAccessMutation,
  useDeleteAnonymousTicketMutation,
} from '../tickets/ticketsApi';
import { useIssueInvoiceMutation } from '../invoices/invoicesApi';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { DeviceSummary } from '../tickets/DeviceSummary';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TicketTimeline } from '../tickets/TicketTimeline';
import { AssignmentModal } from '../tickets/AssignmentModal';
import { HandoverModal } from '../tickets/HandoverModal';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { QCActionModal, type QCOperation } from '../tickets/QCActionModal';
import { TicketAttachments } from '../tickets/TicketAttachments';
import { PrintableTicketReceipt } from '../tickets/PrintableTicketReceipt';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState, InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export default function OwnerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const businessId = useAppSelector(selectSelectedBusinessId);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeQCModal, setActiveQCModal] = useState<QCOperation | null>(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [issuedTrackingSecret, setIssuedTrackingSecret] = useState<string | null>(null);

  const { data: businessRes } = useGetBusinessByIdQuery(businessId || '', {
    skip: !businessId,
  });
  const currentBusiness = businessRes?.data?.business;

  const { data, isLoading, error, refetch } = useGetTicketByIdQuery(
    { businessId: businessId || '', ticketId: id || '' },
    { skip: !businessId || !id },
  );

  const [transition, { isLoading: isTransitioning }] = useTransitionTicketMutation();
  const [deleteTicket, { isLoading: isDeleting }] = useDeleteAnonymousTicketMutation();
  const [issueTracking, { isLoading: isIssuingTracking }] = useIssueTrackingAccessMutation();
  const [issueInvoice, { isLoading: isIssuingInvoice }] = useIssueInvoiceMutation();
  const [issuedInvoiceId, setIssuedInvoiceId] = useState<string | null>(null);

  const ticket = data?.data?.ticket;

  if (isLoading || !businessId) {
    return <PageLoader />;
  }

  if (error || !ticket) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tiket Tidak Ditemukan"
          description="Tiket servis ini tidak tersedia atau Anda tidak memiliki akses ke tempat servis ini."
          symbol="404"
          action={<ButtonLink to="/owner/tickets">Kembali ke Daftar Tiket</ButtonLink>}
        />
      </main>
    );
  }

  const canAssign =
    ticket.allowedActions.includes('assign_technician') ||
    ticket.allowedActions.includes('reassign_technician');

  const canAcceptIntake =
    ticket.allowedActions.includes('accept_intake') && ticket.status === 'submitted';

  const canHandover =
    ticket.allowedActions.includes('handover') &&
    ticket.status === 'completed' &&
    !ticket.handover?.handedOverAt;

  const handleAcceptIntake = async () => {
    setActionError(null);
    try {
      await transition({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          targetStatus: 'waiting_diagnosis',
          reason: 'Unit fisik diterima di bengkel servis',
        },
      }).unwrap();
      refetch();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setActionError(apiErr.data?.error || apiErr.data?.message || 'Gagal menerima intake fisik.');
    }
  };

  const handleDeleteTicket = async () => {
    setActionError(null);
    try {
      await deleteTicket({ businessId, ticketId: ticket.id, expectedRevision: ticket.revision }).unwrap();
      navigate('/owner/tickets', { replace: true, state: { notice: 'Tiket anonim berhasil dihapus.' } });
    } catch (err) {
      const body = (err as { data?: ApiErrorBody }).data;
      setShowDeleteDialog(false);
      setActionError(body?.error || body?.message || 'Tiket belum dapat dihapus. Muat ulang dan coba lagi.');
      void refetch();
    }
  };

  const handleCancelTicket = async () => {
    const reason = window.prompt('Masukkan alasan pembatalan tiket:');
    if (!reason || !reason.trim()) return;

    setActionError(null);
    try {
      await transition({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          targetStatus: 'cancelled',
          reason: reason.trim(),
        },
      }).unwrap();
      refetch();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setActionError(apiErr.data?.error || apiErr.data?.message || 'Gagal membatalkan tiket.');
    }
  };

  const handleIssueTracking = async () => {
    setActionError(null);
    try {
      const res = await issueTracking({
        businessId,
        ticketId: ticket.id,
        expectedRevision: ticket.revision,
      }).unwrap();

      setIssuedTrackingSecret(res.data?.trackingSecret || null);
      refetch();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setActionError(
        apiErr.data?.error || apiErr.data?.message || 'Gagal menerbitkan kode akses pelacakan.',
      );
    }
  };

  const handleIssueInvoice = async () => {
    setActionError(null);
    try {
      const res = await issueInvoice({
        businessId,
        ticketId: ticket.id,
      }).unwrap();

      const inv = res.data?.invoice;
      if (inv) {
        setIssuedInvoiceId(inv.id);
      }
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setActionError(
        apiErr.data?.error || apiErr.data?.message || 'Gagal menerbitkan invoice servis.',
      );
    }
  };

  const latestRevision =
    ticket.approvedEstimate ||
    (ticket.estimateRevisions && ticket.estimateRevisions.length > 0
      ? ticket.estimateRevisions[ticket.estimateRevisions.length - 1]
      : undefined);

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Detail Tiket Servis</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span className={styles.ticketCode}>{ticket.ticketCode}</span>
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ticket.allowedActions.includes('delete_ticket') && <Button type="button" variant="danger" onClick={() => setShowDeleteDialog(true)}>Hapus Tiket Anonim</Button>}
          <Button type="button" variant="secondary" onClick={() => setShowPrintReceipt(true)}>
            <Icon name="print" /> Cetak Tanda Terima
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleIssueTracking}
            disabled={isIssuingTracking}
          >
            {isIssuingTracking ? 'Membuat...' : 'Buat Kode Lacak'}
          </Button>
          <ButtonLink to="/owner/tickets" variant="secondary">
           Kembali ke Daftar Tiket
          </ButtonLink>
        </div>
      </header>

      {actionError && <InlineNotice type="error">{actionError}</InlineNotice>}

      {/* Secret notice if issued */}
      {issuedTrackingSecret && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            padding: 16,
            borderRadius: 'var(--radius-md)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ color: '#065f46', fontSize: '1rem' }}>
              ✓ Kode Akses Pelacakan Publik Berhasil Diterbitkan:
            </strong>
            <button
              type="button"
              onClick={() => setIssuedTrackingSecret(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#047857' }}>
            Berikan kode akses berikut kepada pelanggan untuk melacak status servis unit secara
            mandiri. Kode ini dibuat acak dan aman.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#064e3b',
                background: '#ffffff',
                padding: '6px 14px',
                borderRadius: 4,
                border: '1px solid #6ee7b7',
              }}
            >
              {issuedTrackingSecret}
            </div>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(issuedTrackingSecret);
                  setCopyNotice('Kode akses berhasil disalin.');
                } catch {
                  setCopyNotice('Kode tidak dapat disalin. Silakan salin secara manual.');
                }
              }}
            >
              Salin Kode
            </Button>
            {copyNotice && <span role="status">{copyNotice}</span>}
          </div>
        </div>
      )}

      {/* Invoice alert if issued */}
      {issuedInvoiceId && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span style={{ color: '#1e40af', fontWeight: 600 }}>
            ✓ Invoice tagihan servis telah siap!
          </span>
          <ButtonLink
            to={`/owner/transactions/${issuedInvoiceId}`}
            variant="primary"
            style={{ fontSize: '0.85rem' }}
          >
            Buka Dokumen Invoice Tagihan ↗
          </ButtonLink>
        </div>
      )}

      {/* Stepper */}
      <div className={styles.ticketCard}>
        <ServiceStepper status={ticket.status} />
      </div>

      <div className="reference-columns">
        <div className="reference-stack">
          {/* Device Info */}
          <div className={styles.ticketCard}>
            <h2>Data Perangkat</h2>
            <DeviceSummary device={ticket.device} />

            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                Keluhan Kerusakan:
              </strong>
              <p style={{ marginTop: 4, color: 'var(--navy-950)' }}>{ticket.complaint}</p>
            </div>

            {ticket.service && (
              <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Paket Layanan: </span>
                <strong>
                  {ticket.service.name} ({ticket.service.category})
                </strong>
              </div>
            )}
          </div>

          {/* Diagnosis Details */}
          {ticket.diagnosis && (
            <div className={styles.ticketCard}>
              <h2>Hasil Diagnosis & Pemeriksaan</h2>
              {ticket.diagnosis.staffFindings && (
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                    Temuan Internal Staf:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--navy-950)' }}>
                    {ticket.diagnosis.staffFindings}
                  </p>
                </div>
              )}
              {ticket.diagnosis.customerExplanation && (
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                    Penjelasan untuk Pelanggan:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--navy-950)' }}>
                    {ticket.diagnosis.customerExplanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Estimates Display */}
          {latestRevision && (
            <div className={styles.ticketCard}>
              <h2>Estimasi Biaya Pengerjaan</h2>
              <EstimateBreakdown revision={latestRevision} />
            </div>
          )}

          {/* QC & Warranty Info */}
          {ticket.status === 'completed' && (
            <div className={styles.ticketCard}>
              <h2>Hasil QC & Garansi Toko</h2>
              {ticket.workSummary && (
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                    Ringkasan Pengerjaan:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--navy-950)' }}>{ticket.workSummary}</p>
                </div>
              )}

              {ticket.qualityCheck && (
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                    Pemeriksaan Mutu:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--success, #059669)', fontWeight: 600 }}>
                    ✓ Lolos Pengujian QC
                  </p>
                  {ticket.qualityCheck.notes && (
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--slate-600)' }}>
                      Catatan: {ticket.qualityCheck.notes}
                    </p>
                  )}
                </div>
              )}

              {ticket.warranty && (
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                    Ketentuan Garansi:
                  </strong>
                  <p style={{ margin: 0, color: 'var(--navy-950)' }}>
                    {ticket.warranty.days} Hari
                    {ticket.warranty.expiresAt &&
                      ` (Berlaku s/d ${new Date(ticket.warranty.expiresAt).toLocaleDateString('id-ID')})`}
                  </p>
                  {ticket.warranty.terms && (
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--slate-600)' }}>
                      {ticket.warranty.terms}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Attachments */}
          <TicketAttachments
            businessId={businessId}
            ticket={ticket}
            userRole="owner"
            onSuccess={refetch}
          />
        </div>
        <div className="reference-stack">
          {/* Action Bar for Owner */}
          {(canAcceptIntake || canHandover || ticket.status === 'rejected') && (
            <div className={styles.ticketCard} style={{ background: '#f8fafc' }}>
              <h2>Tindakan Pemilik Servis</h2>
              <div className={styles.actionBar}>
                {canAcceptIntake && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAcceptIntake}
                    disabled={isTransitioning}
                  >
                    {isTransitioning ? 'Memproses...' : 'Konfirmasi Penerimaan Unit Fisik di Toko'}
                  </Button>
                )}

                {canHandover && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setShowHandoverModal(true)}
                  >
                    Serahkan Unit ke Pelanggan
                  </Button>
                )}

                {ticket.status === 'completed' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleIssueInvoice}
                    disabled={isIssuingInvoice}
                  >
                    {isIssuingInvoice ? 'Membuat Invoice...' : 'Terbitkan / Buka Invoice Tagihan'}
                  </Button>
                )}

                {ticket.status === 'rejected' && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setActiveQCModal('reopen_diagnosis')}
                    >
                      ↺ Buka Ulang Diagnosis
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelTicket}
                      style={{ color: '#dc2626' }}
                    >
                      ✕ Tutup / Batalkan Tiket
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Customer & Technician Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            <div className={styles.ticketCard}>
              <h2>Informasi Pelanggan</h2>
              <div style={{ display: 'grid', gap: 6, fontSize: '0.92rem' }}>
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Nama: </span>
                  <strong>{ticket.customer?.name || 'Walk-in Customer'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Telepon: </span>
                  <span>{ticket.customer?.phone || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Email: </span>
                  <span>{ticket.customer?.email || '-'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Metode Penerimaan: </span>
                  <strong>
                    {ticket.intakeMethod === 'online' ? 'Pengajuan Online' : 'Walk-in Toko'}
                  </strong>
                </div>
              </div>
            </div>

            <div className={styles.ticketCard}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2>Teknisi Ditugaskan</h2>
                {canAssign && (
                  <Button
                    variant="secondary"
                    style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                    onClick={() => setShowAssignModal(true)}
                  >
                    {ticket.technician ? 'Ganti Teknisi' : 'Tugaskan Teknisi'}
                  </Button>
                )}
              </div>

              {ticket.technician ? (
                <div style={{ display: 'grid', gap: 6, fontSize: '0.92rem' }}>
                  <div>
                    <span style={{ color: 'var(--slate-500)' }}>Nama: </span>
                    <strong>{ticket.technician.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)' }}>Email: </span>
                    <span>{ticket.technician.email}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--slate-500)' }}>Spesialisasi: </span>
                    <span>
                      {ticket.technician.specializations.length > 0
                        ? ticket.technician.specializations.join(', ')
                        : 'Umum'}
                    </span>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    color: 'var(--slate-500)',
                    fontStyle: 'italic',
                    fontSize: '0.9rem',
                  }}
                >
                  Tiket ini belum ditugaskan kepada teknisi manapun.
                </p>
              )}
            </div>
          </div>

          {/* Handover Status */}
          {ticket.handover?.handedOverAt && (
            <div
              className={styles.ticketCard}
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <strong style={{ color: '#166534', fontSize: '1.05rem' }}>
                ✓ Unit Telah Diserahkan ke Pelanggan
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#14532d' }}>
                Diserahkan kepada <strong>{ticket.handover.handedOverTo}</strong> pada{' '}
                {new Date(ticket.handover.handedOverAt).toLocaleString('id-ID')}.
              </p>
              {ticket.handover.notes && (
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#166534' }}>
                  Catatan: {ticket.handover.notes}
                </p>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className={styles.ticketCard}>
            <h2>Riwayat & Aktivitas Tiket</h2>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>
      {showAssignModal && (
        <AssignmentModal
          businessId={businessId}
          ticketId={ticket.id}
          expectedRevision={ticket.revision}
          currentTechnicianId={ticket.assignedTechnicianId}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            refetch();
          }}
        />
      )}

      {showDeleteDialog && <ConfirmDialog title="Hapus Tiket Anonim?" description={`Hapus ${ticket.ticketCode} dari portal dan antrean teknisi? Hanya tiket pelanggan tanpa akun yang dapat dihapus.`} pending={isDeleting} onConfirm={() => void handleDeleteTicket()} onClose={() => setShowDeleteDialog(false)} />}

      {showHandoverModal && (
        <HandoverModal
          businessId={businessId}
          ticket={ticket}
          onClose={() => setShowHandoverModal(false)}
          onSuccess={() => {
            setShowHandoverModal(false);
            refetch();
          }}
        />
      )}

      {activeQCModal && (
        <QCActionModal
          businessId={businessId}
          ticket={ticket}
          operation={activeQCModal}
          onClose={() => setActiveQCModal(null)}
          onSuccess={() => {
            setActiveQCModal(null);
            refetch();
          }}
        />
      )}

      {showPrintReceipt && (
        <Modal onClose={() => setShowPrintReceipt(false)}>
          <div className={styles.modalDialog} style={{ maxWidth: 760, padding: 16 }}>
            <PrintableTicketReceipt
              businessName={currentBusiness?.name || 'Bengkel Servis'}
              businessPhone={currentBusiness?.phone}
              ticket={ticket}
              onClose={() => setShowPrintReceipt(false)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
