import { useId, useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { Button, ButtonLink } from '../../components/ui/Button';
import { customerServiceUpdate, whatsappMessageLink } from './whatsapp';
import { ticketStatuses } from './status';
import type { ServiceTicket } from './types';
import { useGetMyBusinessesQuery } from '../business/businessApi';
import { useGetCustomerApprovalLinkQuery } from './ticketsApi';

export function CustomerWhatsAppUpdate({ ticket }: { ticket: ServiceTicket }) {
  const user = useAppSelector(selectUser);
  const { data: businesses } = useGetMyBusinessesQuery();
  const slug = businesses?.data.businesses.find((business) => business.businessId === ticket.businessId)?.slug;
  const portalUrl = slug ? `${window.location.origin}/b/${encodeURIComponent(slug)}/customer` : '';
  const { currentData: approval, isFetching, isError, refetch } = useGetCustomerApprovalLinkQuery(
    { businessId: ticket.businessId, ticketId: ticket.id, estimateVersion: ticket.estimateRevisions?.at(-1)?.version || 0 },
    { skip: ticket.status !== 'awaiting_approval' },
  );
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const generated = customerServiceUpdate(ticket, ticketStatuses[ticket.status].label, `${user?.firstName || ''} ${user?.lastName || ''}`.trim(), portalUrl, approval?.data.approvalUrl);
  const message = draft ?? generated;
  const link = whatsappMessageLink(ticket.customer?.phone, message);
  if (!['awaiting_approval', 'completed'].includes(ticket.status)) return null;
  return <section className="reference-panel">
    <h2>Informasi WhatsApp Pelanggan</h2>
    <label htmlFor={id}>Pesan untuk pelanggan</label>
    <textarea id={id} rows={9} value={message} onChange={(event) => setDraft(event.target.value)} style={{ width: '100%', marginBlock: 12, padding: '12px 14px', lineHeight: 1.5, border: '1px solid var(--border)', borderRadius: 8, resize: 'vertical' }} />
    <p>Pesan akan dibuka di WhatsApp. Tekan Kirim di WhatsApp agar pelanggan menerima pesan.</p>
    <div className="actions" style={{ marginTop: 12 }}>
      {isError ? <Button variant="secondary" onClick={() => void refetch()}>Coba muat tautan persetujuan</Button> : generated && link ? <ButtonLink to={link} target="_blank" rel="noopener noreferrer">Buka WhatsApp</ButtonLink> : <p>{isFetching || !portalUrl ? 'Menyiapkan tautan pelanggan...' : 'Isi pesan dan pastikan nomor WhatsApp pelanggan tersedia serta valid.'}</p>}
      <Button variant="ghost" onClick={() => setDraft(null)}>Gunakan info terbaru</Button>
    </div>
  </section>;
}
