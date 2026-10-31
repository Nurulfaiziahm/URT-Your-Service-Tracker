import type { EstimateRevision } from './types';
import { formatRupiah } from './currency';
import styles from './Tickets.module.css';
import { durationLabel } from './service-timing';
import { difficultyLabels } from '../services/catalog';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';

interface EstimateBreakdownProps {
  revision: EstimateRevision;
  title?: string;
  customerView?: boolean;
}

export function EstimateBreakdown({ revision, title, customerView = false }: EstimateBreakdownProps) {
  const estimateStatus = {
    approved: { label: 'Disetujui Pelanggan', tone: 'success' },
    rejected: { label: 'Ditolak', tone: 'danger' },
    pending: { label: 'Menunggu Persetujuan', tone: 'info' },
    superseded: { label: 'Digantikan Revisi Baru', tone: 'neutral' },
  } as const;
  const status = estimateStatus[revision.status];

  return (
    <div className={styles.estimateBox}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: '1rem', color: 'var(--navy-950)' }}>
            {title || `Estimasi Biaya (Revisi #${revision.version})`}
          </strong>
          <StatusBadge label={status.label} tone={status.tone} />
        </div>
        <span style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
          Diajukan: {new Date(revision.submittedAt).toLocaleDateString('id-ID')}
        </span>
      </div>

      {revision.customerExplanation && (
        <div
          style={{
            fontSize: '0.88rem',
            background: 'var(--canvas)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '3px solid var(--blue)',
          }}
        >
          <strong style={{ color: 'var(--navy-900)' }}>Penjelasan untuk Anda: </strong>
          <span style={{ color: 'var(--slate-700)' }}>{revision.customerExplanation}</span>
        </div>
      )}

      <ResponsiveTable className={styles.tableWrapper} rowHeading="Item">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Deskripsi</th>
              <th className={styles.textRight}>Jumlah</th>
              <th className={styles.textRight}>Harga Satuan</th>
              <th className={styles.textRight}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {revision.lines.map((line, idx) => {
              const subtotal = line.subtotal ?? line.quantity * line.unitPrice;
              return (
                <tr key={line.id || idx}>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        borderRadius: 4,
                        background:
                          line.type === 'part' ? '#f0fdf4' : '#eff6ff',
                        color:
                          line.type === 'part' ? '#166534' : '#1e40af',
                      }}
                    >
                      {line.type === 'part' ? 'Suku Cadang' : 'Jasa / Biaya'}
                    </span>
                  </td>
                  <td>{customerView && line.catalogEntryType === 'difficulty' ? 'Biaya Servis' : line.description}{line.difficultyLevel && <div>Tingkat kesulitan: {difficultyLabels[line.difficultyLevel]}</div>}</td>
                  <td className={styles.textRight}>{line.quantity}</td>
                  <td className={styles.textRight}>{formatRupiah(line.unitPrice)}</td>
                  <td className={styles.textRight}>
                    <strong>{formatRupiah(subtotal)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResponsiveTable>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 6 }}>
          {revision.repairDurationMinutes && <span>Pengerjaan: {durationLabel(revision.repairDurationMinutes)}</span>}
          {revision.qcDurationMinutes && <span>QC: {durationLabel(revision.qcDurationMinutes)}</span>}
          {revision.targetCompletionDate && (
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
              Target Selesai:{' '}
              <strong>
                {new Date(revision.targetCompletionDate).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
            </span>
          )}
        </div>
        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Total Estimasi Biaya:</span>
          <span className={styles.totalAmount}>{formatRupiah(revision.totalAmount)}</span>
        </div>
      </div>

      {revision.decision && (
        <div
          style={{
            marginTop: 4,
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            background: revision.decision.decision === 'approved' ? '#f0fdf4' : '#fef2f2',
            color: revision.decision.decision === 'approved' ? '#166534' : '#991b1b',
          }}
        >
          <strong>
            {revision.decision.decision === 'approved'
              ? '✓ Telah disetujui oleh pelanggan'
              : '✕ Ditolak oleh pelanggan'}
          </strong>{' '}
          pada {new Date(revision.decision.decidedAt).toLocaleString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          {revision.decision.reason && ` (Alasan: ${revision.decision.reason})`}
        </div>
      )}
    </div>
  );
}
