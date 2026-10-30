import type { ServiceTicket } from './types';
import { formatRupiah } from './currency.ts';
import { durationLabel } from './service-timing.ts';
import { difficultyLabels } from '../services/catalog.ts';

export function whatsappMessageLink(phone: string | undefined, message: string) {
  let number = phone?.trim().replace(/[\s()+.-]/g, '') || '';
  if (number.startsWith('0')) number = `62${number.slice(1)}`;
  if (!/^[1-9]\d{7,14}$/.test(number) || !message.trim()) return undefined;
  return `https://wa.me/${number}?text=${encodeURIComponent(message.trim())}`;
}

export function customerServiceUpdate(ticket: ServiceTicket, status: string, technicianName: string, portalUrl: string, approvalUrl?: string) {
  const estimate = ticket.estimateRevisions?.at(-1);
  if (!portalUrl || !['awaiting_approval', 'completed'].includes(ticket.status)) return '';
  if (ticket.status === 'awaiting_approval' && (!approvalUrl || !estimate)) return '';
  return [
    `Halo ${ticket.customer?.name || 'Pelanggan'}, berikut informasi servis Anda:`,
    `Nomor tiket: ${ticket.ticketCode}`,
    `Perangkat: ${[ticket.device.brand, ticket.device.model].filter(Boolean).join(' ') || ticket.device.category}`,
    `Keluhan: ${ticket.complaint}`,
    `Status: ${status}`,
    ...(ticket.status === 'awaiting_approval' && estimate ? [
      'Mohon tinjau dan setujui biaya servis sebelum perbaikan dimulai.',
      estimate.customerExplanation && `Hasil diagnosis: ${estimate.customerExplanation}`,
      ...estimate.lines.map((line) => `${line.description} (${line.quantity}): ${formatRupiah(line.subtotal ?? line.quantity * line.unitPrice)}`),
      ...estimate.lines.filter((line) => line.difficultyLevel).map((line) => `Tingkat kesulitan: ${difficultyLabels[line.difficultyLevel!]}`),
      `Total estimasi: ${formatRupiah(estimate.totalAmount)}`,
      `Estimasi pengerjaan: ${durationLabel(estimate.repairDurationMinutes)}`,
      `Estimasi QC: ${durationLabel(estimate.qcDurationMinutes)}`,
      estimate.targetCompletionDate && `Target siap diambil: ${new Date(estimate.targetCompletionDate).toLocaleString('id-ID')}`,
      `Persetujuan biaya: ${approvalUrl}`,
    ] : ['Perbaikan dan QC telah selesai. Perangkat Anda siap diambil.', ticket.workSummary]),
    `Portal pelanggan: ${portalUrl}`,
    `Teknisi: ${ticket.technician?.name || technicianName}`,
  ].filter(Boolean).join('\n');
}
