import { useParams, useNavigate } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketByIdQuery } from '../tickets/ticketsApi';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { DeviceSummary } from '../tickets/DeviceSummary';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TicketTimeline } from '../tickets/TicketTimeline';
import { DiagnosisForm } from '../tickets/DiagnosisForm';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { TechnicianWorkflowActions } from '../tickets/TechnicianWorkflowActions';
import { TicketAttachments } from '../tickets/TicketAttachments';
import { ButtonLink } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from '../tickets/Tickets.module.css';

export default function TechnicianTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const businessId = useAppSelector(selectSelectedBusinessId);
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useGetTicketByIdQuery(
    { businessId: businessId || '', ticketId: id || '' },
    { skip: !businessId || !id },
  );

  const ticket = data?.data?.ticket;

  if (isLoading || !businessId) {
    return <PageLoader />;
  }

  if (error || !ticket) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Tiket Tidak Ditemukan"
          description="Tiket ini tidak tersedia atau Anda tidak memiliki akses ke penugasan tiket ini."
          symbol="404"
          action={<ButtonLink to="/technician/queue">Kembali ke Antrean</ButtonLink>}
        />
      </main>
    );
  }

  const latestRevision =
    ticket.approvedEstimate ||
    (ticket.estimateRevisions && ticket.estimateRevisions.length > 0
      ? ticket.estimateRevisions[ticket.estimateRevisions.length - 1]
      : undefined);

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <div>
          <span className="eyebrow">Pengerjaan Teknisi</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <span className={styles.ticketCode}>{ticket.ticketCode}</span>
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
        <ButtonLink to="/technician/queue" variant="secondary">
          ← Kembali ke Antrean
        </ButtonLink>
      </header>

      {/* Stepper */}
      <div className={styles.ticketCard}>
        <ServiceStepper status={ticket.status} />
      </div>

      <div className="reference-columns">
        <div className="reference-stack">
          {/* Device & Complaint */}
          <div className={styles.ticketCard}>
            <h2>Data Perangkat & Keluhan Masuk</h2>
            <DeviceSummary device={ticket.device} />

            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>
                Keluhan Kerusakan:
              </strong>
              <p style={{ marginTop: 4, color: 'var(--navy-950)' }}>{ticket.complaint}</p>
            </div>

            {ticket.service && (
              <div style={{ marginTop: 8, fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Permintaan Paket: </span>
                <strong>
                  {ticket.service.name} ({ticket.service.category})
                </strong>
              </div>
            )}
          </div>

          {/* Diagnosis Section */}
          {ticket.status === 'diagnosing' ? (
            <>
              <DiagnosisForm businessId={businessId} ticket={ticket} onSuccess={() => refetch()} />
              <section className="reference-callout">
                <h2>Susun Estimasi Biaya</h2>
                <p>
                  Setelah menyimpan hasil diagnosis, rincikan biaya perbaikan untuk persetujuan
                  pelanggan.
                </p>
                <ButtonLink to={`/technician/tickets/${id}/estimate`}>
                  Buat Estimasi Biaya →
                </ButtonLink>
              </section>
            </>
          ) : (
            ticket.diagnosis && (
              <div className={styles.ticketCard}>
                <h2>Hasil Diagnosis Terakhir</h2>
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
            )
          )}

          {/* Estimates Display */}
          {latestRevision && ticket.status !== 'diagnosing' && (
            <div className={styles.ticketCard}>
              <h2>Estimasi Biaya Perbaikan</h2>
              <EstimateBreakdown revision={latestRevision} />
            </div>
          )}

          {/* Completion & Warranty Info */}
          {ticket.status === 'completed' && (
            <div className={styles.ticketCard}>
              <h2>Penyelesaian Perbaikan & Garansi</h2>
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
                    Pengujian Kualitas (QC):
                  </strong>
                  <p style={{ margin: 0, color: 'var(--success, #059669)', fontWeight: 600 }}>
                    ✓ Lolos Pengujian
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
                    Ketentuan Garansi Toko:
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
            userRole="technician"
            onSuccess={refetch}
          />
        </div>
        <div className="reference-stack">
          {/* Workflow Action Buttons */}
          <TechnicianWorkflowActions
            businessId={businessId}
            ticket={ticket}
            onSuccess={() => {
              refetch();
            }}
            onToggleEstimateEditor={() => navigate(`/technician/tickets/${id}/estimate`)}
          />

          {/* Customer Info */}
          <div className={styles.ticketCard}>
            <h2>Data Pelanggan</h2>
            <div style={{ display: 'grid', gap: 4, fontSize: '0.92rem' }}>
              <div>
                <span style={{ color: 'var(--slate-500)' }}>Nama Pelanggan: </span>
                <strong>{ticket.customer?.name || 'Walk-in'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--slate-500)' }}>Kontak Telepon: </span>
                <span>{ticket.customer?.phone || '-'}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className={styles.ticketCard}>
            <h2>Aktivitas Tiket Servis</h2>
            <TicketTimeline timeline={ticket.timeline} />
          </div>
        </div>
      </div>
    </div>
  );
}
