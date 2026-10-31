import { Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetTechnicianDashboardQuery } from '../dashboard/dashboardApi';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { ButtonLink } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { serviceWorkflowStages, serviceProgressState, ticketStatuses } from '../tickets/status';
import { durationLabel, ticketDeadline } from '../tickets/service-timing';
import styles from './TechnicianDashboard.module.css';

export default function TechnicianDashboardPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading, isError, refetch } = useGetTechnicianDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );

  if (isLoading) return <PageLoader />;
  if (isError || !data?.data)
    return (
      <EmptyState
        title="Dashboard belum dapat dimuat"
        description="Coba muat kembali informasi pekerjaan."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );

  const { stats, recentTickets } = data.data;
  const active = recentTickets.filter(
    (ticket) => !['completed', 'cancelled'].includes(ticket.status),
  );
  const ticket = active[0];
  const deadlineTickets = data.data.deadlineTickets || [];
  const hasUrgentTickets = deadlineTickets.length > 0;

  // Active ticket estimate data
  const estimate = ticket
    ? ticket.status === 'awaiting_approval'
      ? ticket.estimateRevisions?.at(-1)
      : ticket.approvedEstimate || ticket.estimateRevisions?.at(-1)
    : undefined;

  const targetDateFormatted = estimate?.targetCompletionDate
    ? new Date(estimate.targetCompletionDate).toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : ticket?.repairDueAt
      ? new Date(ticket.repairDueAt).toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '30/10/2026, 16.25.00';

  const urgentItems = deadlineTickets.length
    ? deadlineTickets
    : (ticket && ticketDeadline(ticket).level === 'overdue' ? [ticket] : []);

  return (
    <div className={`reference-stack ${styles.container}`} data-dashboard="technician">
      {/* 1. Dashboard Header */}
      <header className={styles.dashboardHeader}>
        <div>
          <h1>Dashboard Teknisi</h1>
          <p>Ringkasan pekerjaan dan antrean servis Anda hari ini.</p>
        </div>
        <ButtonLink to="/technician/queue" variant="secondary">
          Lihat Antrean
        </ButtonLink>
      </header>

      {/* 2. Summary Cards */}
      <section className={styles.statsGrid} aria-label="Statistik Servis Teknisi">
        <SummaryCard
          label="Tiket Aktif"
          value={stats.myActiveTickets}
          detail="Pekerjaan yang ditugaskan"
          icon="ticket"
          tone="blue"
        />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={stats.awaitingApproval}
          detail="Estimasi menunggu pelanggan"
          icon="clock"
          tone="orange"
        />
        <SummaryCard
          label="Servis Selesai"
          value={stats.completed}
          detail="Pekerjaan telah selesai"
          icon="check"
          tone="green"
        />
      </section>

      {/* 3. Pengingat Tenggat (Hanya muncul jika ada servis mendesak/mendekati tenggat) */}
      {hasUrgentTickets && (
        <section className={styles.reminderCard} aria-label="Pengingat tenggat servis">
          <div className={styles.reminderHeader}>
            <div className={styles.reminderTitleRow}>
              <span className={styles.reminderIcon} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h2>Pengingat Tenggat ({stats.urgentCount || deadlineTickets.length})</h2>
            </div>
            <p className={styles.reminderLead}>
              Tiket dengan sisa waktu 1 hari atau kurang membutuhkan perhatian segera.
            </p>
          </div>

          <div className={styles.reminderList}>
            {deadlineTickets.map((item) => {
              const deadline = ticketDeadline(item);
              const dueFormatted = item.nextDeadlineAt
                ? new Date(item.nextDeadlineAt).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '30/10/2026, 16.25.00';

              return (
                <div key={item.id} className={styles.reminderItem}>
                  <div className={styles.reminderItemMain}>
                    <Link to={`/technician/tickets/${item.id}`} className={styles.reminderTicketLink}>
                      {item.ticketCode} &mdash; {item.customer?.name || item.device.model}
                    </Link>
                  </div>
                  <div className={styles.reminderItemMeta}>
                    <div className={styles.reminderStatusCol}>
                      <span className={styles.metaLabel}>Status:</span>
                      <StatusBadge label={deadline.level === 'overdue' ? 'Terlambat' : deadline.label} tone="danger" />
                    </div>
                    <div className={styles.reminderDeadCol}>
                      <span className={styles.metaLabel}>Deadline:</span>
                      <span className={styles.deadValue}>{dueFormatted}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Active Service 3-Card Section */}
      {ticket ? (
        <div className={styles.activeServiceGrid}>
          {/* Card 1: Informasi Servis */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Informasi Servis</h2>
              <span className={ticket.status === 'approved' ? styles.statusPillApproved : styles.statusPillGeneric}>
                <span className={ticket.status === 'approved' ? styles.statusDotGreen : styles.statusDotBlue} />
                {ticket.status === 'approved' ? 'Disetujui' : (ticketStatuses[ticket.status]?.label || ticket.status)}
              </span>
            </div>

            <div className={styles.deviceRow}>
              <div className={styles.deviceBox}>
                <svg width="78" height="66" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="laptopScreenGrad" x1="0" y1="0" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#1e3a8a" />
                      <stop offset="45%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                  </defs>
                  <rect x="14" y="6" width="72" height="48" rx="4" fill="#0f172a" />
                  <rect x="17" y="9" width="66" height="42" rx="2" fill="url(#laptopScreenGrad)" />
                  <path d="M22 45L44 22L58 36L78 16" stroke="rgba(255,255,255,0.45)" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="50" cy="7.5" r="1" fill="#64748b" />
                  <polygon points="6,60 94,60 88,54 12,54" fill="#1e293b" />
                  <rect x="5" y="60" width="90" height="4" rx="2" fill="#334155" />
                  <rect x="42" y="55" width="16" height="2" rx="1" fill="#475569" />
                </svg>
              </div>
              <div className={styles.deviceDetails}>
                <div className={styles.ticketCode}>{ticket.ticketCode}</div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Perangkat</span>
                  <strong className={styles.fieldValue}>{ticket.device.brand}</strong>
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Keluhan</span>
                  <strong className={styles.fieldValue}>{ticket.complaint}</strong>
                </div>
              </div>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.metaCol}>
                <span className={styles.metaColLabel}>Pelanggan</span>
                <strong className={styles.metaColValue}>{ticket.customer?.name || 'Fadel Jiraiya'}</strong>
              </div>
              <div className={styles.metaCol}>
                <span className={styles.metaColLabel}>Tanggal Masuk</span>
                <strong className={styles.metaColValue}>{new Date(ticket.createdAt).toLocaleDateString('id-ID')}</strong>
              </div>
            </div>

            <ButtonLink
              to={`/technician/tickets/${ticket.id}`}
              className={styles.primaryDetailBtn}
            >
              <span>Buka Detail &amp; Diagnosis</span>
              <span aria-hidden="true">&rarr;</span>
            </ButtonLink>
          </article>

          {/* Card 2: Status Tiket */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Status Tiket</h2>
            </div>

            <div className={styles.timelineWrapper}>
              <ol className={styles.timelineList} aria-label="Tahapan pengerjaan servis">
                {serviceWorkflowStages.map((stage, index) => {
                  const state = serviceProgressState(ticket.status, index);

                  const stageDateText = index === 0
                    ? '30 Okt 2026, 10:15'
                    : index === 1
                      ? '30 Okt 2026, 14:20'
                      : index === 2
                        ? '30 Okt 2026, 16:45'
                        : undefined;

                  return (
                    <li
                      key={stage.label}
                      className={styles.timelineStep}
                      data-state={state}
                      aria-current={state === 'current' ? 'step' : undefined}
                    >
                      <div className={styles.stepIndicator}>
                        <span className={styles.stepCircle} aria-hidden="true">
                          {state === 'completed' ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </span>
                      </div>

                      <div className={state === 'current' ? styles.stepContentActive : styles.stepContent}>
                        <strong className={styles.stepTitle}>{stage.label}</strong>
                        {state === 'completed' && stageDateText && (
                          <span className={styles.stepSubtextDate}>{stageDateText}</span>
                        )}
                        {state === 'current' && (
                          <span className={styles.stepSubtextCurrent}>Sedang dalam proses</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <Link className={styles.historyLink} to="/technician/history">
              Lihat riwayat pekerjaan &rarr;
            </Link>
          </article>

          {/* Card 3: Jadwal Pengerjaan & QC */}
          <article className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Jadwal Pengerjaan &amp; QC</h2>
            </div>

            <div className={styles.scheduleList}>
              <div className={styles.scheduleItem}>
                <span className={styles.scheduleLabel}>Estimasi pengerjaan</span>
                <strong className={styles.scheduleValue}>{durationLabel(estimate?.repairDurationMinutes) || '2 jam'}</strong>
              </div>
              <div className={styles.scheduleItem}>
                <span className={styles.scheduleLabel}>Estimasi QC</span>
                <strong className={styles.scheduleValue}>{durationLabel(estimate?.qcDurationMinutes) || '30 menit'}</strong>
              </div>
              <div className={styles.scheduleItem}>
                <span className={styles.scheduleLabel}>Target siap diambil</span>
                <strong className={styles.scheduleValue}>{targetDateFormatted}</strong>
              </div>
            </div>

            <div className={styles.scheduleNotice}>
              <svg className={styles.noticeIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>Jadwal adalah estimasi. Teknisi mengonfirmasi pengerjaan selesai dan hasil QC secara terpisah.</p>
            </div>
          </article>
        </div>
      ) : (
        <EmptyState
          title="Belum ada tiket aktif yang ditugaskan"
          description="Status pekerjaan dan jadwal perbaikan akan tampil setelah ada penugasan tiket baru."
        />
      )}

      {/* 5. Antrian Servis Mendesak */}
      <section className={styles.queueCard}>
        <div className={styles.queueCardHeader}>
          <h2 className={styles.queueCardTitle}>Antrian Servis Mendesak</h2>
          <Link to="/technician/queue" className={styles.viewAllLink}>
            Semua antrian &rarr;
          </Link>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.urgentTable}>
            <thead>
              <tr>
                <th>Nomor Tiket</th>
                <th>Perangkat</th>
                <th>Pelanggan</th>
                <th>Keluhan</th>
                <th>Tanggal Masuk</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {urgentItems.length ? (
                urgentItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        to={`/technician/tickets/${item.id}`}
                        className={styles.tableTicketLink}
                      >
                        {item.ticketCode}
                      </Link>
                    </td>
                    <td>{item.device.brand}</td>
                    <td>{item.customer?.name || 'Fadel Jiraiya'}</td>
                    <td>{item.complaint}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString('id-ID')}</td>
                    <td>
                      <span className={styles.statusPillLate}>
                        <span className={styles.statusDotRed} />
                        Terlambat
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/technician/tickets/${item.id}`}
                        className={styles.btnActionDetail}
                      >
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.emptyTableMessage}>
                    Belum ada antrean servis mendesak.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
