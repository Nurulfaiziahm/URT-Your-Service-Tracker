import { customerStatusNotes, type TicketStatus } from './status';

export function timelineNoteLabel(note: string) {
  const fixedNotes: Record<string, string> = {
    'Walk-in service intake recorded at frontdesk': 'Penerimaan servis langsung dicatat di meja layanan.',
    'Assigned to technician': 'Tiket ditugaskan kepada teknisi.',
    'Service request submitted online by customer': 'Pengajuan servis dikirim oleh pelanggan secara online.',
    'Intake details updated by owner': 'Data penerimaan diperbarui oleh pemilik servis.',
    'Diagnosis recorded by technician': 'Diagnosis dicatat oleh teknisi.',
    'Device physically received at repair shop': 'Perangkat diterima di tempat servis.',
    'Technician started device diagnosis': 'Teknisi mulai memeriksa perangkat.',
    'Repair work commenced according to approved estimate': 'Perbaikan dimulai sesuai estimasi yang disetujui.',
    'Customer approved the estimate. Waiting for the technician to start the repair.': customerStatusNotes.approved,
    'Perangkat sedang dirakit kembali setelah estimasi servis ditolak.': customerStatusNotes.reassembling,
    'Perangkat selesai dirakit kembali dan siap diambil pelanggan.': 'Perangkat selesai dirakit kembali dan siap diambil.',
  };
  if (fixedNotes[note]) return fixedNotes[note];

  const assigned = note.match(/^(Reassigned|Assigned) to technician (.+)$/);
  if (assigned) return assigned[1] === 'Reassigned'
    ? `Penugasan dialihkan kepada teknisi ${assigned[2]}.`
    : `Ditugaskan kepada teknisi ${assigned[2]}.`;
  const estimateSubmitted = note.match(/^Estimate revision #(\d+) submitted for customer approval \(Rp (.+)\)$/);
  if (estimateSubmitted) return `Revisi estimasi #${estimateSubmitted[1]} dikirim untuk persetujuan pelanggan (Rp ${estimateSubmitted[2]}).`;
  const estimateApproved = note.match(/^Customer approved estimate revision #(\d+) \(Rp (.+)\)$/);
  if (estimateApproved) return `Pelanggan menyetujui revisi estimasi #${estimateApproved[1]} (Rp ${estimateApproved[2]}).`;
  const estimateRejected = note.match(/^Customer declined estimate revision #(\d+)$/);
  if (estimateRejected) return `Pelanggan menolak revisi estimasi #${estimateRejected[1]}.`;
  const qcFailed = note.match(/^QC failed: (.+)\. Rework required\.$/);
  if (qcFailed) return `Pemeriksaan kualitas belum lolos: ${qcFailed[1]}. Perlu perbaikan ulang.`;
  const repairCompleted = note.match(/^Repair completed: (.+)\. Awaiting quality check\.$/);
  if (repairCompleted) return `Perbaikan selesai: ${repairCompleted[1]}. Menunggu pemeriksaan kualitas.`;
  const warranty = note.match(/^Quality check passed\. Device repair completed and ready for pickup\.(?: Warranty: (\d+) days\.)?$/);
  if (warranty) return `Pemeriksaan kualitas lolos. Perangkat selesai diperbaiki dan siap diambil.${warranty[1] ? ` Garansi ${warranty[1]} hari.` : ''}`;
  const handedOver = note.match(/^Device collected by (.+?)(?: \((.+)\))?$/);
  if (handedOver) return `Perangkat diserahkan kepada ${handedOver[1]}${handedOver[2] ? ` (${handedOver[2]})` : ''}.`;
  return note;
}

export function currentStatusNote(
  status: TicketStatus,
  timeline: { status?: TicketStatus; note?: string; action?: string }[] = [],
) {
  if (status === 'completed' && timeline.some((event) => event.action === 'estimate_rejected')) {
    return 'Estimasi servis ditolak. Perangkat sudah dirakit kembali dan siap diambil.';
  }
  const currentEvent = [...timeline].reverse().find((event) => event.status === status && event.note?.trim());
  return currentEvent?.note ? timelineNoteLabel(currentEvent.note) : customerStatusNotes[status];
}
