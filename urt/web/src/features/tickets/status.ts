/** Agreed machine values; transitions and permissions remain server-owned. */
export const ticketStatuses = {
  submitted: { label: 'Pengajuan', tone: 'warning' },
  waiting_diagnosis: { label: 'Menunggu diagnosis', tone: 'warning' },
  diagnosing: { label: 'Diagnosis', tone: 'info' },
  awaiting_approval: { label: 'Menunggu persetujuan', tone: 'warning' },
  approved: { label: 'Servis Disetujui', tone: 'success' },
  repairing: { label: 'Dalam pengerjaan', tone: 'info' },
  quality_check: { label: 'Quality check', tone: 'info' },
  completed: { label: 'Servis Selesai', tone: 'success' },
  rejected: { label: 'Servis Ditolak', tone: 'danger' },
  reassembling: { label: 'Dirakit kembali', tone: 'info' },
  cancelled: { label: 'Dibatalkan', tone: 'neutral' },
} as const;

export type TicketStatus = keyof typeof ticketStatuses;

export const customerStatusNotes: Record<TicketStatus, string> = {
  submitted: 'Pengajuan servis sudah diterima. Tempat servis akan meninjau permintaan Anda.',
  waiting_diagnosis: 'Perangkat sudah diterima dan sedang menunggu pemeriksaan teknisi.',
  diagnosing: 'Teknisi sedang memeriksa perangkat dan menyiapkan diagnosis serta estimasi biaya.',
  awaiting_approval: 'Estimasi biaya sudah dikirim. Tinjau rincian servis lalu pilih setujui atau tolak.',
  approved: 'Persetujuan telah diterima. Mohon menunggu teknisi memulai pengerjaan.',
  rejected: 'Servis ditolak. Perangkat akan dirakit kembali sebelum siap diambil.',
  reassembling: 'Perangkat sedang dirakit kembali agar siap diambil.',
  repairing: 'Teknisi sedang mengerjakan perbaikan perangkat.',
  quality_check: 'Perbaikan selesai dan perangkat sedang menjalani pemeriksaan kualitas.',
  completed: 'Servis selesai setelah pemeriksaan kualitas. Perangkat siap diambil di tempat servis.',
  cancelled: 'Servis dibatalkan. Hubungi tempat servis jika Anda memerlukan bantuan.',
};

export interface ServiceWorkflowStage {
  label: string;
  statuses: readonly TicketStatus[];
}

export const serviceWorkflowStages: readonly ServiceWorkflowStage[] = [
  { label: 'Pengajuan', statuses: ['submitted', 'waiting_diagnosis'] },
  { label: 'Diagnosis', statuses: ['diagnosing'] },
  { label: 'Persetujuan', statuses: ['awaiting_approval'] },
  { label: 'Pengerjaan', statuses: ['approved', 'repairing'] },
  { label: 'Quality Check', statuses: ['quality_check'] },
  { label: 'Siap Diambil', statuses: ['completed'] },
];

const rejectedWorkflowStages: readonly ServiceWorkflowStage[] = [
  { label: 'Persetujuan', statuses: ['awaiting_approval'] },
  { label: 'Persetujuan Ditolak', statuses: ['rejected'] },
  { label: 'Rakit Kembali', statuses: ['reassembling'] },
  { label: 'Selesai', statuses: ['completed'] },
];

export function serviceWorkflowForStatus(status: TicketStatus, rejectedFlow = false): readonly ServiceWorkflowStage[] {
  return status === 'rejected' || status === 'reassembling' || (status === 'completed' && rejectedFlow)
    ? rejectedWorkflowStages
    : serviceWorkflowStages;
}

export function serviceProgressState(
  status: TicketStatus,
  stage: number,
  workflow: readonly ServiceWorkflowStage[] = serviceWorkflowForStatus(status),
): 'completed' | 'current' | 'pending' | 'rejected' | 'cancelled' {
  if (status === 'cancelled') return 'cancelled';
  const activeStage = workflow.findIndex((item) => (item.statuses as readonly string[]).includes(status));
  const isRejectedStage = (workflow[stage]?.statuses as readonly string[] | undefined)?.includes('rejected');
  const completedRejectedFlow = status === 'completed'
    && workflow.some((item) => (item.statuses as readonly string[]).includes('rejected'));
  if (isRejectedStage && (status === 'rejected' || completedRejectedFlow)) {
    return 'rejected';
  }
  if (status === 'completed' || stage < activeStage) return 'completed';
  if (stage === activeStage) return 'current';
  return 'pending';
}
