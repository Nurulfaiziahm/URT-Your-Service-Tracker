import { SummaryCard } from '../../components/ui/SummaryCard';
import { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetReportOverviewQuery } from '../reports/reportsApi';
import { formatRupiah } from '../tickets/currency';
import { ticketStatuses, type TicketStatus } from '../tickets/status';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import styles from './OwnerDashboard.module.css';
import ticketStyles from '../tickets/Tickets.module.css';

export default function OwnerReportsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);

  const getMonthStart = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getToday);

  const { data, isLoading, refetch } = useGetReportOverviewQuery(
    {
      businessId: businessId || '',
      params: {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z').toISOString() : undefined,
      },
    },
    { skip: !businessId },
  );

  const report = data?.data;

  const setPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
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
  const paymentMethods = Object.entries(revenue.byMethod);
  const hasTickets = statusDistribution.some(({ count }) => count > 0);

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.header}>
        <div>
          <span className="eyebrow">Analisis Bisnis</span>
          <h1>Laporan Keuangan & Performa</h1>
          <p>
            Ringkasan pendapatan kas aktual, volume pengerjaan servis, dan metrik kepatuhan SLA.
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
          label="Pendapatan"
          value={formatRupiah(revenue.totalRevenue)}
          detail={`${revenue.paymentCount} pembayaran`}
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
              statusDistribution.map((item, index) => (
                <div key={item.status}>
                  <div className={styles.chartLabel}>
                    <span>{ticketStatuses[item.status as TicketStatus]?.label || item.status}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className={styles.chartTrack}>
                    <div
                      style={{
                        width: `${(item.count / Math.max(1, ...statusDistribution.map((s) => s.count))) * 100}%`,
                        background: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6'][index % 4],
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

      {/* Revenue by Method & Status Distribution */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {/* Payment Methods */}
        <div className={ticketStyles.ticketCard}>
          <h2>Pendapatan per Metode Pembayaran</h2>
          {paymentMethods.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--slate-500)', fontStyle: 'italic' }}>
              Belum ada transaksi pembayaran pada rentang tanggal ini.
            </p>
          ) : (
            <div className={ticketStyles.tableWrapper}>
              <table className={ticketStyles.table}>
                <thead>
                  <tr>
                    <th>Metode Pembayaran</th>
                    <th className={ticketStyles.textRight}>Total Diterima</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentMethods.map(([method, total]) => (
                    <tr key={method}>
                      <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{method}</td>
                      <td className={ticketStyles.textRight}>
                        <strong>{formatRupiah(total)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className={ticketStyles.ticketCard}>
          <h2>Distribusi Status Tiket Servis</h2>
          <div className={ticketStyles.tableWrapper}>
            <table className={ticketStyles.table}>
              <thead>
                <tr>
                  <th>Tahapan Servis</th>
                  <th className={ticketStyles.textRight}>Jumlah Tiket</th>
                </tr>
              </thead>
              <tbody>
                {statusDistribution.map((s, idx) => (
                  <tr key={idx}>
                    <td>{ticketStatuses[s.status as TicketStatus]?.label || s.status}</td>
                    <td className={ticketStyles.textRight}>
                      <strong>{s.count}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className={ticketStyles.tableWrapper}>
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
          </div>
        )}
      </div>
    </div>
  );
}
