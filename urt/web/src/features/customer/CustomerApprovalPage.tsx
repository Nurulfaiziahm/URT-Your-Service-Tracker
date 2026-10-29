import { useState } from 'react';
import { useParams } from 'react-router';
import { useCustomerPortal } from './customer-portal';
import { useGetTicketByIdQuery } from '../tickets/ticketsApi';
import { CustomerApprovalCard } from '../tickets/CustomerApprovalCard';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { DeviceSummary } from '../tickets/DeviceSummary';
import { ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { Icon } from '../../components/ui/Icon';
export default function CustomerApprovalPage() {
  const { id = '' } = useParams();
  const { businessId, basePath } = useCustomerPortal();
  const { currentData: data, isLoading, isError, refetch } = useGetTicketByIdQuery(
    { businessId: businessId || '', ticketId: id },
    { skip: !businessId || !id },
  );
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const ticket = data?.data.ticket;
  if (isLoading) return <PageLoader />;
  if (isError || !ticket) return <InlineNotice>Tiket tidak dapat dimuat.</InlineNotice>;
  const revision = ticket.estimateRevisions?.at(-1);
  const result =
    decision ||
    (revision?.status === 'approved' || revision?.status === 'rejected' ? revision.status : null);
  return (
    <div className="reference-stack">
      <header className="reference-heading">
        <div>
          <ButtonLink to={`${basePath}/services/${id}`} variant="ghost" size="small">
            ← Detail Servis
          </ButtonLink>
          <h1>Persetujuan Servis</h1>
          <p>{ticket.ticketCode} · Tinjau hasil diagnosis dan rincian biaya perbaikan.</p>
        </div>
      </header>
      {result ? (
        <section className="reference-panel approval-result" data-decision={result}>
          <span className="approval-result-icon">
            <Icon name={result === 'approved' ? 'check' : 'ticket'} width={32} height={32} />
          </span>
          <h2>
            {result === 'approved' ? 'Persetujuan Berhasil Dikirim' : 'Estimasi Servis Ditolak'}
          </h2>
          <p>
            {result === 'approved'
              ? 'Terima kasih. Teknisi dapat melanjutkan perbaikan sesuai estimasi yang Anda setujui.'
              : 'Keputusan Anda telah diterima. Hubungi tempat servis untuk membahas langkah berikutnya.'}
          </p>
          <ButtonLink to={`${basePath}/services/${id}`}>Lihat Status Servis</ButtonLink>
        </section>
      ) : ticket.status === 'awaiting_approval' ? (
        <div className="reference-columns">
          <div className="reference-stack">
            <section className="reference-panel">
              <h2>Hasil Pemeriksaan</h2>
              <p>
                {revision?.customerExplanation ||
                  ticket.diagnosis?.customerExplanation ||
                  'Lihat rincian pekerjaan pada estimasi biaya.'}
              </p>
            </section>
            <CustomerApprovalCard
              businessId={businessId || ''}
              ticket={ticket}
              onSuccess={(value) => {
                setDecision(value);
                void refetch();
              }}
            />
          </div>
          <section className="reference-panel">
            <h2>Perangkat Anda</h2>
            <DeviceSummary device={ticket.device} />
            <h3>Keluhan Awal</h3>
            <p>{ticket.complaint}</p>
          </section>
        </div>
      ) : (
        <InlineNotice>Belum ada estimasi yang menunggu persetujuan.</InlineNotice>
      )}
      {result && revision && (
        <section className="reference-panel">
          <h2>Rincian Estimasi</h2>
          <EstimateBreakdown revision={revision} />
        </section>
      )}
    </div>
  );
}
