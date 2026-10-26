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
