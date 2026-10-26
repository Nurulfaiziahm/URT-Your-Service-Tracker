import type { TimelineEvent } from './types';
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
export function timelineActionLabel(action: string) {
  return actions[action] || 'Status servis diperbarui';
}
const roles: Record<string, string> = {
  owner: 'Pemilik',
  technician: 'Teknisi',
  customer: 'Pelanggan',
  system: 'Sistem',
};
export function TicketTimeline({ timeline }: { timeline: TimelineEvent[] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <p style={{ fontSize: '0.88rem', color: 'var(--slate-500)' }}>Belum ada catatan aktivitas.</p>
    );
  }

  return (
    <div className={styles.timeline}>
      {timeline.map((event, index) => (
        <div key={event.id || index} className={styles.timelineItem}>
          <div className={styles.timelineDot} />
          <div className={styles.timelineAction}>{timelineActionLabel(event.action)}</div>
          <div className={styles.timelineMeta}>
            {event.actorName} ({roles[event.actorRole] || event.actorRole}) •{' '}
            {new Date(event.timestamp).toLocaleString('id-ID')}
          </div>
          {event.note && <div className={styles.timelineNote}>{event.note}</div>}
        </div>
      ))}
    </div>
  );
}
