/** Agreed machine values; transitions and permissions remain server-owned. */
export const ticketStatuses = {
  submitted: { label: 'Pengajuan', tone: 'neutral' },
  waiting_diagnosis: { label: 'Menunggu diagnosis', tone: 'neutral' },
  diagnosing: { label: 'Diagnosis', tone: 'info' },
  awaiting_approval: { label: 'Menunggu persetujuan', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'success' },
  repairing: { label: 'Dalam pengerjaan', tone: 'info' },
  quality_check: { label: 'Quality check', tone: 'info' },
  completed: { label: 'Siap diambil', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'neutral' },
} as const;

export type TicketStatus = keyof typeof ticketStatuses;

export const customerStatusNotes: Record<TicketStatus, string> = {
  submitted: 'Pengajuan servis sudah diterima. Tempat servis akan meninjau permintaan Anda.',
  waiting_diagnosis: 'Perangkat sudah diterima dan sedang menunggu pemeriksaan teknisi.',
  diagnosing: 'Teknisi sedang memeriksa perangkat dan menyiapkan diagnosis serta estimasi biaya.',
  awaiting_approval: 'Estimasi biaya sudah dikirim. Tinjau rincian servis lalu pilih setujui atau tolak.',
  approved: 'Persetujuan telah diterima. Mohon menunggu teknisi memulai pengerjaan.',
  rejected: 'Estimasi ditolak. Tempat servis akan menindaklanjuti keputusan Anda.',
  repairing: 'Teknisi sedang mengerjakan perbaikan perangkat.',
  quality_check: 'Perbaikan selesai dan perangkat sedang menjalani pemeriksaan kualitas.',
  completed: 'Pemeriksaan kualitas selesai. Perangkat siap diambil di tempat servis.',
  cancelled: 'Servis dibatalkan. Hubungi tempat servis jika Anda memerlukan bantuan.',
};

export const serviceWorkflowStages = [
  { label: 'Pengajuan', statuses: ['submitted', 'waiting_diagnosis'] },
  { label: 'Diagnosis', statuses: ['diagnosing'] },
  { label: 'Persetujuan', statuses: ['awaiting_approval', 'rejected'] },
  { label: 'Pengerjaan', statuses: ['approved', 'repairing'] },
  { label: 'Quality Check', statuses: ['quality_check'] },
  { label: 'Siap Diambil', statuses: ['completed'] },
] as const satisfies readonly { label: string; statuses: readonly TicketStatus[] }[];

const activeStageByStatus = Object.fromEntries(
  serviceWorkflowStages.flatMap((stage, index) => stage.statuses.map((status) => [status, index])),
) as Record<TicketStatus, number>;
activeStageByStatus.cancelled = -1;

export function serviceProgressState(status: TicketStatus, stage: number): 'completed' | 'current' | 'pending' | 'rejected' | 'cancelled' {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'rejected' && stage === activeStageByStatus.rejected) return 'rejected';
  if (status === 'completed' || stage < activeStageByStatus[status]) return 'completed';
  if (stage === activeStageByStatus[status]) return 'current';
  return 'pending';
}
