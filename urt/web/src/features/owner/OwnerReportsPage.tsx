import { SummaryCard } from '../../components/ui/SummaryCard';
import { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetReportOverviewQuery } from '../reports/reportsApi';
import { formatRupiah } from '../tickets/currency';
import { ticketStatuses, type TicketStatus } from '../tickets/status';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import type { StatusTone } from '../../components/ui/StatusBadge';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { ResponsiveTable } from '../../components/ui/ResponsiveTable';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from './OwnerDashboard.module.css';
import ticketStyles from '../tickets/Tickets.module.css';

const statusColors: Record<StatusTone, string> = {
  neutral: '#64748b',
  info: '#2563eb',
  warning: '#d97706',
  success: '#059669',
  danger: '#dc2626',
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusColor(status: string) {
  const definition = ticketStatuses[status as TicketStatus];
  return definition ? statusColors[definition.tone] : statusColors.neutral;
}

export default function OwnerReportsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);

  const getMonthStart = () => {
    const d = new Date();
    return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1));
  };

  const getToday = () => {
    return toDateInputValue(new Date());
  };

  const getSixMonthStart = () => {
    const now = new Date();
    return toDateInputValue(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  };

  const [startDate, setStartDate] = useState(getSixMonthStart);
  const [endDate, setEndDate] = useState(getToday);

  const { data, isLoading, refetch } = useGetReportOverviewQuery(
    {
      businessId: businessId || '',
      params: {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      },
    },
    {
      skip: !businessId,
      pollingInterval: 60_000,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
    },
  );

  const report = data?.data;

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(toDateInputValue(start));
    setEndDate(toDateInputValue(end));
  };

  const setMonthPreset = (months: number) => {
    const end = new Date();
    setStartDate(toDateInputValue(new Date(end.getFullYear(), end.getMonth() - months + 1, 1)));
    setEndDate(toDateInputValue(end));
  };

  if (isLoading && !report) {
    return <PageLoader />;
  }

  if (!report) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Laporan Belum Tersedia"
          description="Pilih rentang tanggal untuk melihat analisis laporan keuangan dan operasional tempat servis."
          symbol="📊"
        />
      </main>
    );
  }

  const { revenue, volume, sla, invoices, technicians } = report;
  const statusDistribution = Object.entries(report.statusDistribution).map(([status, count]) => ({ status, count }));
  const hasTickets = statusDistribution.some(({ count }) => count > 0);
  const maxMonthlyRevenue = Math.max(...revenue.byMonth.map((month) => month.totalRevenue), 1);
  const hasMonthlyRevenue = revenue.byMonth.some((month) => month.totalRevenue > 0);

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <span className="eyebrow">Analisis Bisnis</span>
          <h1>Laporan Keuangan & Performa</h1>
          <p>
            Pendapatan dihitung dari estimasi yang disetujui pada servis yang selesai. Servis yang ditolak tidak dihitung.
          </p>
        </div>
      </header>

      {/* Date Range Filter Bar */}
      <div className={ticketStyles.ticketCard}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <strong style={{ fontSize: '0.95rem', color: 'var(--navy-950)' }}>
            Rentang Waktu Laporan:
          </strong>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              onClick={() => setMonthPreset(6)}
            >
              6 Bulan Terakhir
            </Button>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              onClick={() => {
                setStartDate(getMonthStart());
                setEndDate(getToday());
              }}
            >
              Bulan Ini
            </Button>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              onClick={() => setPreset(30)}
            >
              30 Hari Terakhir
            </Button>
            <Button
              type="button"
              variant="secondary"
              style={{ fontSize: '0.8rem', padding: '4px 10px' }}
              onClick={() => setPreset(90)}
            >
              90 Hari Terakhir
            </Button>
          </div>
        </div>

        <div
          style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}
        >
          <div style={{ maxWidth: 200 }}>
            <TextInput
              id="startDate"
              label="Tanggal Mulai"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ maxWidth: 200 }}>
            <TextInput
              id="endDate"
              label="Tanggal Selesai"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div style={{ alignSelf: 'flex-end', paddingBottom: 2 }}>
            <Button type="button" variant="primary" onClick={() => refetch()}>
              Terapkan Filter
            </Button>
          </div>
        </div>
      </div>

      <div className="reference-stats">
        <SummaryCard
          label="Pendapatan Servis Selesai"
          value={formatRupiah(revenue.totalRevenue)}
          detail={`${revenue.serviceCount} servis dengan estimasi disetujui`}
          icon="wallet"
          tone="green"
        />
        <SummaryCard label="Tiket Masuk" value={volume.ticketsReceived} icon="ticket" />
        <SummaryCard
          label="Servis Selesai"
          value={volume.ticketsCompleted}
          icon="check"
          tone="green"
        />
        <SummaryCard
          label="Kepatuhan SLA"
          value={sla.percentage == null ? '—' : `${sla.percentage}%`}
          detail={`${sla.metTickets} dari ${sla.eligibleTickets} tiket`}
          icon="clock"
        />
      </div>
      <section className={`${ticketStyles.ticketCard} ${styles.monthlyRevenuePanel}`}>
        <div>
          <h2>Perbandingan Pendapatan per Bulan</h2>
          <p>Nilai estimasi disetujui dari servis yang selesai pada rentang laporan.</p>
        </div>
        {revenue.byMonth.length === 0 ? (
          <p className={styles.monthlyRevenueEmpty}>Belum ada pendapatan servis selesai pada rentang ini.</p>
        ) : (
          <>
            {!hasMonthlyRevenue && (
              <p className={styles.monthlyRevenueEmpty}>Belum ada pendapatan servis selesai pada rentang ini.</p>
            )}
            <div className={styles.monthlyRevenueList} role="img" aria-label="Grafik perbandingan pendapatan bulanan">
              {revenue.byMonth.map((month) => {
                const width = month.totalRevenue > 0 ? Math.max(2, (month.totalRevenue / maxMonthlyRevenue) * 100) : 0;
                return (
                <div className={styles.monthlyRevenueRow} key={month.month}>
                  <div className={styles.monthlyRevenueLabel}>
                    <strong>{month.label}</strong>
                    <span>{formatRupiah(month.totalRevenue)} · {month.serviceCount} servis</span>
                  </div>
                  <div className={styles.monthlyRevenueTrack}>
                    <div style={{ width: `${width}%` }} />
                  </div>
                </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <div className="reference-columns">
        <section className="reference-panel">
          <h2>Volume Servis dalam Periode</h2>
          <div
            className={styles.volumeChart}
            role="img"
            aria-label={`${volume.ticketsReceived} tiket masuk dan ${volume.ticketsCompleted} tiket selesai dalam periode terpilih`}
          >
            {[
              { label: 'Tiket Masuk', value: volume.ticketsReceived, color: '#2563eb' },
              { label: 'Servis Selesai', value: volume.ticketsCompleted, color: '#10b981' },
            ].map((item) => (
              <div className={styles.barColumn} key={item.label}>
                <strong>{item.value}</strong>
                <div
                  style={{
                    height: `${Math.max(3, (item.value / Math.max(1, volume.ticketsReceived, volume.ticketsCompleted)) * 160)}px`,
                    background: item.color,
                  }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="reference-panel">
          <h2>Distribusi Status Tiket</h2>
          <div className={styles.distribution}>
            {hasTickets ? (
              statusDistribution.map((item) => (
                <div key={item.status}>
                  <div className={styles.chartLabel}>
                    {ticketStatuses[item.status as TicketStatus] ? <TicketStatusBadge status={item.status as TicketStatus} /> : item.status}
                    <strong>{item.count}</strong>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      style={{
                        width: `${(item.count / Math.max(1, ...statusDistribution.map((s) => s.count))) * 100}%`,
                        background: statusColor(item.status),
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p>Belum ada tiket dalam periode ini.</p>
            )}
          </div>
        </section>
      </div>
      <div className="reference-callout">
        <strong>Ringkasan Tagihan</strong>
        <p>
          {formatRupiah(invoices.issuedInPeriodTotal)} dari {invoices.issuedInPeriodCount} invoice
          diterbitkan. Piutang belum lunas: {formatRupiah(invoices.unpaidInvoicesBalance)} (
          {invoices.unpaidInvoicesCount} invoice).
        </p>
      </div>

      {/* Revenue basis & Status Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Revenue basis */}
        <div className={ticketStyles.ticketCard}>
          <h2>Dasar Perhitungan Pendapatan</h2>
          <p style={{ margin: 0, color: 'var(--slate-600)' }}>
            Total berasal dari nilai estimasi yang disetujui untuk servis berstatus selesai pada rentang tanggal ini.
            Transaksi dilakukan langsung di toko, jadi laporan tidak bergantung pada pencatatan pembayaran di aplikasi.
            Tiket yang ditolak pelanggan dan servis tanpa estimasi disetujui tidak dihitung.
          </p>
        </div>

        {/* Status Distribution */}
        <div className={ticketStyles.ticketCard}>
          <h2>Distribusi Status Tiket Servis</h2>
          <ResponsiveTable className={ticketStyles.tableWrapper}>
            <table className={ticketStyles.table}>
              <thead>
                <tr>
                  <th>Tahapan Servis</th>
                  <th className={ticketStyles.textRight}>Jumlah Tiket</th>
                </tr>
              </thead>
              <tbody>
                {statusDistribution.map((s) => (
                  <tr key={s.status}>
                    <td>{ticketStatuses[s.status as TicketStatus] ? <TicketStatusBadge status={s.status as TicketStatus} /> : s.status}</td>
                    <td className={ticketStyles.textRight}>
                      <strong>{s.count}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      </div>

      {/* Technician Performance Table */}
      <div className={ticketStyles.ticketCard}>
        <h2>Performa Tim Teknisi</h2>
        {technicians.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--slate-500)', fontStyle: 'italic' }}>
            Belum ada teknisi aktif terdaftar.
          </p>
        ) : (
          <ResponsiveTable className={ticketStyles.tableWrapper}>
            <table className={ticketStyles.table}>
              <thead>
                <tr>
                  <th>Nama Teknisi</th>
                  <th className={ticketStyles.textRight}>Servis Selesai</th>
                  <th className={ticketStyles.textRight}>Kepatuhan SLA</th>
                  <th className={ticketStyles.textRight}>Rata-rata Waktu Servis</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((t) => (
                  <tr key={t.technicianId}>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td className={ticketStyles.textRight}>{t.completedInPeriod} unit</td>
                    <td className={ticketStyles.textRight}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: t.slaPercentage == null ? 'var(--slate-500)' : t.slaPercentage >= 80 ? '#059669' : '#d97706',
                        }}
                      >
                        {t.slaPercentage == null ? '—' : `${t.slaPercentage}%`}
                      </span>
                    </td>
                    <td className={ticketStyles.textRight}>{t.avgCompletionDays == null ? '—' : `${t.avgCompletionDays} hari`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </div>
    </div>
  );
}
