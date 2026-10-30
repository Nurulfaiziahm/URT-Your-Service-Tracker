import { Icon } from '../../components/ui/Icon';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useCustomerPortal } from './customer-portal';
import { useGetTicketByIdQuery, useTransitionTicketMutation } from '../tickets/ticketsApi';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { DeviceSummary } from '../tickets/DeviceSummary';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TicketTiming } from '../tickets/TicketTiming';
import { TicketTimeline } from '../tickets/TicketTimeline';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { TicketAttachments } from '../tickets/TicketAttachments';
import { Button, ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState, InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../tickets/Tickets.module.css';

export default function CustomerTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { businessId, basePath } = useCustomerPortal();

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { currentData: data, isLoading, error, refetch } = useGetTicketByIdQuery(
    { businessId: businessId || '', ticketId: id || '' },
    { skip: !businessId || !id, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const [transition, { isLoading: isSubmittingCancel }] = useTransitionTicketMutation();

  const ticket = data?.data?.ticket;

  if (isLoading || !businessId) {
    return <PageLoader />;
  }

  if (error || !ticket) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tiket Tidak Ditemukan"
          description="Tiket servis ini tidak tersedia atau Anda tidak memiliki akses ke tiket ini."
          symbol="404"
          action={<ButtonLink to={basePath}>Kembali ke Beranda</ButtonLink>}
        />
      </main>
    );
  }

  const canCancel =
    ticket.allowedActions.includes('cancel') &&
    (ticket.status === 'submitted' || ticket.status === 'waiting_diagnosis');

  const handleCancelTicket = async () => {
    setCancelError(null);
    if (!cancelReason.trim()) {
      setCancelError('Mohon cantumkan alasan pembatalan.');
      return;
    }

    try {
      await transition({
        businessId,
        ticketId: ticket.id,
        body: {
          expectedRevision: ticket.revision,
          targetStatus: 'cancelled',
          reason: cancelReason.trim(),
        },
      }).unwrap();

      setIsCancelling(false);
      refetch();
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setCancelError(
        apiErr.data?.error || apiErr.data?.message || 'Gagal membatalkan pengajuan servis.',
      );
    }
  };

  const approvedEstimate =
    ticket.approvedEstimate ||
    (ticket.estimateRevisions && ticket.status !== 'awaiting_approval'
      ? ticket.estimateRevisions.find((r) => r.status === 'approved')
      : undefined);

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Status Perbaikan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span className={styles.ticketCode}>{ticket.ticketCode}</span>
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {canCancel && !isCancelling && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCancelling(true)}
              style={{ color: '#dc2626' }}
            >
              Batalkan Pengajuan
            </Button>
          )}
          <ButtonLink to={basePath} variant="secondary">
           Kembali ke Daftar Servis
          </ButtonLink>
        </div>
      </header>

      {/* Cancellation prompt */}
      {isCancelling && (
        <div
          className={styles.ticketCard}
          style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          <strong style={{ color: '#991b1b' }}>Konfirmasi Pembatalan Pengajuan</strong>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
            Apakah Anda yakin ingin membatalkan pengajuan servis ini?
          </p>

          {cancelError && <InlineNotice type="error">{cancelError}</InlineNotice>}

          <div style={{ display: 'grid', gap: 4 }}>
            <label
              htmlFor="cancelReason"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b' }}
            >
              Alasan Pembatalan:
            </label>
            <input
              id="cancelReason"
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Perangkat sudah normal kembali / ingin ganti jadwal"
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
              onClick={() => setIsCancelling(false)}
              disabled={isSubmittingCancel}
            >
              Kembali
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleCancelTicket}
              disabled={isSubmittingCancel}
              style={{ backgroundColor: '#dc2626' }}
            >
              {isSubmittingCancel ? 'Membatalkan...' : 'Ya, Batalkan'}
            </Button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className={styles.ticketCard}>
        <ServiceStepper status={ticket.status} />
        <TicketTiming ticket={ticket} />
      </div>

      <div className="reference-columns">
        <div className="reference-stack">
          {/* Active Approval Card for customer */}
          {ticket.status === 'awaiting_approval' && (
            <section className="reference-callout">
              <h2>Estimasi Memerlukan Persetujuan Anda</h2>
              <p>
                Teknisi telah mengirim rincian biaya. Tinjau estimasi sebelum pengerjaan
                dilanjutkan.
              </p>
              <ButtonLink to={`${basePath}/services/${ticket.id}/approval`}>
                Tinjau & Setujui Biaya
              </ButtonLink>
            </section>
          )}

          {/* Ready for Pickup Banner */}
          {ticket.status === 'completed' && !ticket.handover?.handedOverAt && (
            <div
              className={styles.ticketCard}
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.8rem' }}>
                  <Icon name="check" width={28} height={28} />
                </span>
                <div>
                  <strong style={{ color: '#166534', fontSize: '1.05rem' }}>
                    Perbaikan Selesai & Perangkat Siap Diambil!
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#14532d' }}>
                    Perangkat Anda telah lolos uji kendali mutu teknisi dan siap diambil di toko.
                    Mohon siapkan kode tiket servis ini saat serah terima.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Handover Completed Notice */}
          {ticket.handover?.handedOverAt && (
            <div
              className={styles.ticketCard}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}
            >
              <strong style={{ color: 'var(--navy-950)' }}>Unit Telah Diterima</strong>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--slate-600)' }}>
                Perangkat telah diserahkan kepada <strong>{ticket.handover.handedOverTo}</strong>{' '}
                pada {new Date(ticket.handover.handedOverAt).toLocaleString('id-ID')}.
              </p>
              {ticket.handover.notes && (
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                  Catatan: {ticket.handover.notes}
                </p>
              )}
            </div>
          )}

          {/* Approved Estimate Snapshot */}
          {approvedEstimate && ticket.status !== 'awaiting_approval' && (
            <div className={styles.ticketCard}>
              <h2>Estimasi Biaya yang Disetujui</h2>
              <EstimateBreakdown revision={approvedEstimate} customerView />
            </div>
          )}

          {/* Diagnosis Explanation from Technician */}
          {ticket.diagnosis?.customerExplanation && (
            <div className={styles.ticketCard}>
              <h2>Hasil Pemeriksaan Teknisi</h2>
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--canvas)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '4px solid var(--blue)',
                }}
              >
                <p style={{ margin: 0, color: 'var(--navy-950)', fontSize: '0.92rem' }}>
                  {ticket.diagnosis.customerExplanation}
                </p>
              </div>
            </div>
          )}

          {/* Device & Complaint */}
          <div className={styles.ticketCard}>
            <h2>Data Perangkat Anda</h2>
            <DeviceSummary device={ticket.device} />

            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                Keluhan yang Diajukan:
              </strong>
              <p style={{ marginTop: 4, color: 'var(--navy-950)' }}>{ticket.complaint}</p>
            </div>

            {ticket.service && (
              <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Layanan: </span>
                <strong>
                  {ticket.service.name} ({ticket.service.category})
                </strong>
              </div>
            )}
          </div>

          {/* File Attachments */}
          <TicketAttachments
            businessId={businessId}
            ticket={ticket}
            userRole="customer"
            onSuccess={refetch}
          />
        </div>
        <div className="reference-stack">
          {/* Warranty Info if completed */}
          {ticket.warranty && (
            <div className={styles.ticketCard}>
              <h2>Garansi Perbaikan Toko</h2>
              <div style={{ display: 'grid', gap: 4, fontSize: '0.92rem' }}>
                <div>
                  <span style={{ color: 'var(--slate-500)' }}>Masa Garansi: </span>
                  <strong>{ticket.warranty.days} Hari</strong>
                  {ticket.warranty.expiresAt && (
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                      {' '}
                      (Berlaku hingga{' '}
                      {new Date(ticket.warranty.expiresAt).toLocaleDateString('id-ID')})
                    </span>
                  )}
                </div>
                {ticket.warranty.terms && (
                  <p style={{ margin: '4px 0 0', color: 'var(--slate-600)', fontSize: '0.88rem' }}>
                    {ticket.warranty.terms}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className={styles.ticketCard}>
            <h2>Perjalanan Perbaikan Perangkat</h2>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
