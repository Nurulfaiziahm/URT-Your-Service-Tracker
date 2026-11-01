import styles from './Tickets.module.css';

const actions: Record<string, string> = {
  created: 'Tiket servis dibuat',
  assigned: 'Teknisi ditugaskan',
  intake_corrected: 'Data penerimaan diperbarui',
  diagnosed: 'Diagnosis disimpan',
  estimate_submitted: 'Estimasi biaya dikirim',
  estimate_approved: 'Estimasi biaya disetujui',
  estimate_rejected: 'Estimasi biaya ditolak',
  intake_accepted: 'Perangkat diterima',
  diagnosis_started: 'Pemeriksaan dimulai',
  reopened_for_diagnosis: 'Pemeriksaan dibuka kembali',
  repair_started: 'Perbaikan dimulai',
  qc_failed: 'Pemeriksaan kualitas perlu perbaikan',
  quality_check_submitted: 'Pemeriksaan kualitas selesai',
  completed: 'Perbaikan selesai',
  cancelled: 'Tiket dibatalkan',
  handed_over: 'Perangkat diserahkan',
  tracking_access_issued: 'Akses pelacakan dibuat',
  attachment_added: 'Lampiran ditambahkan',
  attachment_removed: 'Lampiran dihapus',
};

const roles: Record<string, string> = {
  owner: 'Pemilik',
  technician: 'Teknisi',
  customer: 'Pelanggan',
  system: 'Sistem',
};

function timelineActionLabel(action: string) {
  return actions[action] || 'Status servis diperbarui';
}

function timelineNoteLabel(note: string) {
  const fixedNotes: Record<string, string> = {
    'Walk-in service intake recorded at frontdesk': 'Penerimaan servis langsung dicatat di meja layanan.',
    'Assigned to technician': 'Tiket ditugaskan kepada teknisi.',
    'Service request submitted online by customer': 'Pengajuan servis dikirim oleh pelanggan secara online.',
    'Intake details updated by owner': 'Data penerimaan diperbarui oleh pemilik servis.',
    'Diagnosis recorded by technician': 'Diagnosis dicatat oleh teknisi.',
    'Device physically received at repair shop': 'Perangkat diterima di tempat servis.',
    'Technician started device diagnosis': 'Teknisi mulai memeriksa perangkat.',
    'Repair work commenced according to approved estimate': 'Perbaikan dimulai sesuai estimasi yang disetujui.',
  };
  if (fixedNotes[note]) return fixedNotes[note];

  const assigned = note.match(/^(Reassigned|Assigned) to technician (.+)$/);
  if (assigned) {
    return assigned[1] === 'Reassigned'
      ? `Penugasan dialihkan kepada teknisi ${assigned[2]}.`
      : `Ditugaskan kepada teknisi ${assigned[2]}.`;
  }

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
  if (warranty) {
    return `Pemeriksaan kualitas lolos. Perangkat selesai diperbaiki dan siap diambil.${warranty[1] ? ` Garansi ${warranty[1]} hari.` : ''}`;
  }

  const handedOver = note.match(/^Device collected by (.+?)(?: \((.+)\))?$/);
  if (handedOver) return `Perangkat diserahkan kepada ${handedOver[1]}${handedOver[2] ? ` (${handedOver[2]})` : ''}.`;

  // Keep notes written by staff or customers as entered.
  return note;
}

export interface TicketTimelineEntry {
  id?: string;
  action: string;
  actorName?: string;
  actorRole: string;
  note?: string;
  timestamp: string;
}

export function TicketTimeline({ timeline }: { timeline: TicketTimelineEntry[] }) {
  if (!timeline?.length) return <p className={styles.timelineEmpty}>Belum ada catatan aktivitas.</p>;
  return (
    <ol className={styles.timeline} aria-label="Riwayat perubahan status servis">
      {timeline.map((event, index) => (
        <li key={event.id || index} className={styles.timelineItem}>
          <span className={styles.timelineDot} aria-hidden="true" />
          <strong className={styles.timelineAction}>{timelineActionLabel(event.action)}</strong>
          <span className={styles.timelineMeta}>
            {event.actorName ? `${event.actorName} (${roles[event.actorRole] || event.actorRole})` : roles[event.actorRole] || event.actorRole}
            {' \u00b7 '}{new Date(event.timestamp).toLocaleString('id-ID')}
          </span>
          {event.note && <span className={styles.timelineNote}>{timelineNoteLabel(event.note)}</span>}
        </li>
      ))}
    </ol>
  );
}
