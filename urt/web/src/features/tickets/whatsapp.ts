import type { ServiceTicket } from './types';
import { formatRupiah } from './currency.ts';
import { durationLabel, totalServiceDurationMinutes } from './service-timing.ts';
import { difficultyLabels } from '../services/catalog.ts';

export function whatsappMessageLink(phone: string | undefined, message: string) {
  let number = phone?.trim().replace(/[\s()+.-]/g, '') || '';
  if (number.startsWith('0')) number = `62${number.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(number) || !message.trim()) return undefined;
  return `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`;
}

export function customerServiceUpdate(ticket: ServiceTicket, status: string, technicianName: string, portalUrl: string, approvalUrl?: string) {
  const estimate = ticket.estimateRevisions?.at(-1);
  if (!portalUrl || !['awaiting_approval', 'completed', 'rejected', 'reassembling'].includes(ticket.status)) return '';
  if (ticket.status === 'awaiting_approval' && (!approvalUrl || !estimate)) return '';
  return [
    `Halo ${ticket.customer?.name || 'Pelanggan'}, ini kabar terbaru tentang servis Anda:`,
    `Nomor tiket: ${ticket.ticketCode}`,
    `Perangkat: ${[ticket.device.brand, ticket.device.model].filter(Boolean).join(' ') || ticket.device.category}`,
    `Keluhan: ${ticket.complaint}`,
    `Status: ${status}`,
    ...(ticket.status === 'awaiting_approval' && estimate ? [
      'Silakan tinjau biaya servis. Perbaikan dimulai setelah Anda menyetujuinya.',
      estimate.customerExplanation && `Hasil diagnosis: ${estimate.customerExplanation}`,
      ...estimate.lines.map((line) => `${line.description} (${line.quantity}): ${formatRupiah(line.subtotal ?? line.quantity * line.unitPrice)}`),
      ...estimate.lines.filter((line) => line.difficultyLevel).map((line) => `Tingkat kesulitan: ${difficultyLabels[line.difficultyLevel!]}`),
      `Total estimasi: ${formatRupiah(estimate.totalAmount)}`,
      `Estimasi servis selesai (termasuk QC): ${durationLabel(totalServiceDurationMinutes(estimate))}`,
      estimate.targetCompletionDate && `Perkiraan selesai: ${new Date(estimate.targetCompletionDate).toLocaleString('id-ID')}`,
      `Persetujuan biaya: ${approvalUrl}`,
    ] : ticket.status === 'rejected'
      ? ['Anda menolak estimasi servis. Perangkat sedang dirakit kembali agar siap diambil.']
      : ticket.status === 'reassembling'
        ? ['Perangkat sedang dirakit kembali dan akan diberi kabar saat siap diambil.']
        : ['Perbaikan dan pemeriksaan selesai. Perangkat Anda siap diambil.', ticket.workSummary]),
      `Lihat status servis tanpa login: ${portalUrl.replace(/\/b\/.*$/, `/tracking/${encodeURIComponent(ticket.ticketCode)}`)}`,
    `Teknisi: ${ticket.technician?.name || technicianName}`,
  ].filter(Boolean).join('\n');
}
