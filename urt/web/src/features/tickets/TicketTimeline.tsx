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
          {event.note && <span className={styles.timelineNote}>{event.note}</span>}
        </li>
      ))}
    </ol>
  );
}
