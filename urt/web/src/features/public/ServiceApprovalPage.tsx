import { useState } from 'react';
import { useLocation } from 'react-router';
import { useInspectServiceApprovalQuery, useRespondServiceApprovalMutation } from '../tickets/ticketsApi';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';

export default function ServiceApprovalPage() {
  const token = new URLSearchParams(useLocation().hash.slice(1)).get('token') || '';
  return <ApprovalForm key={token} token={token} />;
}

function ApprovalForm({ token }: { token: string }) {
  const { currentData, isLoading, isError, refetch } = useInspectServiceApprovalQuery(token, { skip: !token, refetchOnFocus: true });
  const [respond, { isLoading: sending }] = useRespondServiceApprovalMutation();
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  if (isLoading) return <PageLoader />;
  const approval = currentData?.data;
  if (!approval || isError) return <main className="container page-content"><InlineNotice>Tautan persetujuan tidak tersedia atau kedaluwarsa. Minta tautan terbaru kepada teknisi.</InlineNotice><Button variant="secondary" onClick={() => void refetch()} disabled={!token}>Coba lagi</Button></main>;
  const result = decision || (approval.estimate.status === 'approved' || approval.estimate.status === 'rejected' ? approval.estimate.status : null);
  async function submit(value: 'approved' | 'rejected') {
    if (!approval) return;
    setError('');
    try {
      await respond({ token, expectedRevision: approval.revision, decision: value, reason: value === 'rejected' ? reason.trim() || undefined : undefined }).unwrap();
      setDecision(value);
    } catch (err) {
      const body = (err as { data?: ApiErrorBody }).data;
      setError(body?.message || body?.error || 'Persetujuan belum terkirim. Muat ulang rincian sebelum mencoba lagi.');
      void refetch();
    }
  }
  return <main className="container page-content reference-stack" style={{ maxWidth: 960 }}>
    <header className="reference-heading"><div><h1>Persetujuan Servis</h1><p>{approval.businessName} · {approval.ticketCode}</p><p>{[approval.device.brand, approval.device.model].filter(Boolean).join(' ') || approval.device.category}</p></div></header>
    <section className="reference-panel"><EstimateBreakdown revision={approval.estimate} customerView /></section>
    {error && <InlineNotice type="error">{error}</InlineNotice>}
    {result ? <InlineNotice type="success">{result === 'approved' ? 'Persetujuan berhasil dikirim. Teknisi dapat memulai perbaikan.' : 'Estimasi ditolak. Hubungi tempat servis untuk membahas langkah berikutnya.'}</InlineNotice> : approval.estimate.status === 'pending' ? <section className="reference-panel reference-stack">
      <p>Dengan menyetujui, Anda menyetujui rincian biaya dan estimasi waktu di atas. Teknisi mengonfirmasi pengerjaan selesai dan QC secara terpisah.</p>
      <label htmlFor="approval-reason">Alasan jika menolak (opsional)</label><textarea id="approval-reason" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
      <div className="actions"><Button disabled={sending} onClick={() => void submit('approved')}>Setujui Biaya Servis</Button><Button disabled={sending} variant="secondary" onClick={() => void submit('rejected')}>Tolak Estimasi Biaya</Button></div>
    </section> : <InlineNotice>Estimasi ini sudah diperbarui. Minta tautan terbaru kepada teknisi.</InlineNotice>}
    <div><ButtonLink to={`/b/${encodeURIComponent(approval.businessSlug)}/customer`} variant="secondary">Buka Portal Pelanggan</ButtonLink></div>
  </main>;
}
