import { useParams, useLocation, useNavigate } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTicketByIdQuery } from '../tickets/ticketsApi';
import { EstimateEditor } from '../tickets/EstimateEditor';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { CustomerWhatsAppUpdate } from '../tickets/CustomerWhatsAppUpdate';
import { DeviceSummary } from '../tickets/DeviceSummary';
import { ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { Icon } from '../../components/ui/Icon';
export default function TechnicianEstimatePage() {
  const { id = '' } = useParams();
  const businessId = useAppSelector(selectSelectedBusinessId) || '';
  const navigate = useNavigate();
  const sent = useLocation().pathname.endsWith('/estimate/sent');
  const { data, isLoading, isError, refetch } = useGetTicketByIdQuery(
    { businessId, ticketId: id },
    { skip: !businessId || !id },
  );
  const ticket = data?.data.ticket;
  if (isLoading) return <PageLoader />;
  if (isError || !ticket) return <InlineNotice>Tiket tidak dapat dimuat.</InlineNotice>;
  const revision = ticket.estimateRevisions?.at(-1);
  const canEdit =
    ticket.status === 'diagnosing' || ticket.allowedActions.includes('revise_estimate');
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <ButtonLink to={`/technician/tickets/${id}`} variant="ghost" size="small">
           Detail Tiket
          </ButtonLink>
          <h1>{sent ? 'Ringkasan Estimasi' : 'Estimasi Biaya Servis'}</h1>
          <p>
            {ticket.ticketCode} · {ticket.customer?.name || 'Pelanggan'}
          </p>
        </div>
      </header>
      {sent && revision ? (
        <>
          <section className="reference-panel approval-result">
            <span className="approval-result-icon">
              <Icon name="check" width={32} height={32} />
            </span>
            <h2>Estimasi Berhasil Dikirim</h2>
            <p>
              Rincian biaya telah dikirim. Status estimasi:{' '}
              {revision.status === 'pending'
                ? 'menunggu persetujuan pelanggan'
                : revision.status === 'approved'
                  ? 'disetujui'
                  : revision.status === 'rejected'
                    ? 'ditolak'
                    : 'digantikan revisi baru'}
              .
            </p>
            <div className="actions">
              <ButtonLink to={`/technician/tickets/${id}`}>Kembali ke Tiket</ButtonLink>
              <ButtonLink to="/technician/queue" variant="secondary">
                Lihat Antrean
              </ButtonLink>
            </div>
          </section>
          <section className="reference-panel">
            <EstimateBreakdown revision={revision} />
          </section>
          <CustomerWhatsAppUpdate key={`${ticket.id}:${revision.version}`} ticket={ticket} />
        </>
      ) : canEdit ? (
        <>
          <EstimateEditor
            businessId={businessId}
            ticket={ticket}
            onSuccess={() => void refetch()}
            onSubmitted={() => navigate(`/technician/tickets/${id}/estimate/sent`)}
          />
          <details className="reference-panel">
            <summary>Ringkasan Perangkat dan Diagnosis</summary>
            <DeviceSummary device={ticket.device} />
            <h3>Keluhan Pelanggan</h3>
            <p>{ticket.complaint}</p>
            <h3>Temuan Diagnosis</h3>
            <p>
              {ticket.diagnosis?.staffFindings ||
                'Simpan hasil diagnosis melalui halaman detail tiket sebelum mengirim estimasi.'}
            </p>
          </details>
        </>
      ) : (
        <InlineNotice>
          Tidak ada estimasi yang dapat diedit pada status tiket saat ini.{' '}
          <ButtonLink to={`/technician/tickets/${id}`} variant="secondary">
            Kembali ke Tiket
          </ButtonLink>
        </InlineNotice>
      )}
    </div>
  );
}
