import { useState } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetReportOverviewQuery } from '../reports/reportsApi';
import { formatRupiah } from '../tickets/currency';
import { ticketStatuses, type TicketStatus } from '../tickets/status';
import { Button } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import type { ReportOverviewData } from '../reports/types';
import styles from './OwnerReports.module.css';

type PeriodMode = 'day' | 'week' | 'month' | 'custom';
type DateRange = { startDate: string; endDate: string };

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDateInputValue(year: number, month: number, day: number) {
  const safeDay = Math.min(day, new Date(year, month, 0).getDate());
  return `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1).padStart(2, '0'),
  label: new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, index, 1)),
}));

function fromDateInputValue(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getDateRange(mode: PeriodMode, selectedDate: string, startDate: string, endDate: string): DateRange {
  if (mode === 'custom') return { startDate, endDate };

  const selected = fromDateInputValue(selectedDate);
  if (mode === 'day') {
    const date = toDateInputValue(selected);
    return { startDate: date, endDate: date };
  }

  if (mode === 'week') {
    const mondayOffset = (selected.getDay() + 6) % 7;
    return {
      startDate: toDateInputValue(addDays(selected, -mondayOffset)),
      endDate: toDateInputValue(addDays(selected, 6 - mondayOffset)),
    };
  }

  return {
    startDate: toDateInputValue(new Date(selected.getFullYear(), selected.getMonth(), 1)),
    endDate: toDateInputValue(new Date(selected.getFullYear(), selected.getMonth() + 1, 0)),
  };
}

function formatDate(value: string) {
  return fromDateInputValue(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatReportDate(value: string, timezone: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: timezone,
  });
}

function initialRange(): DateRange {
  const today = new Date();
  return {
    startDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateInputValue(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  };
}

function getStatusLabel(status: string) {
  return ticketStatuses[status as TicketStatus]?.label || status;
}

function getTechnicianSlaColor(value: number | null) {
  if (value == null) return 'var(--slate-500)';
  return value >= 80 ? '#059669' : '#d97706';
}

type TechnicianRecord = ReportOverviewData['technicians'][number];

const technicianMetrics: { label: string; value: (technician: TechnicianRecord) => string; color?: (technician: TechnicianRecord) => string }[] = [
  { label: 'Tiket aktif', value: (technician) => String(technician.activeTickets) },
  { label: 'Servis selesai', value: (technician) => String(technician.completedInPeriod) },
  {
    label: 'Kepatuhan SLA',
    value: (technician) => technician.slaPercentage == null ? '—' : `${technician.slaPercentage}%`,
    color: (technician) => getTechnicianSlaColor(technician.slaPercentage),
  },
  {
    label: 'Rata-rata waktu',
    value: (technician) => technician.avgCompletionDays == null ? '—' : `${technician.avgCompletionDays} hari`,
  },
];

function TechnicianMobileView({ technicians }: { technicians: TechnicianRecord[] }) {
  const [search, setSearch] = useState('');
  const [metricIndex, setMetricIndex] = useState(0);
  const metric = technicianMetrics[metricIndex];
  const filteredTechnicians = technicians.filter((technician) =>
    technician.name.toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID')),
  );

  return (
    <div className={styles.technicianMobileView}>
      <label className={styles.technicianSearch}>
        <span>Cari teknisi</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ketik nama teknisi"
        />
      </label>
      <div className={styles.metricNavigation} aria-label="Navigasi metrik teknisi">
        <button type="button" onClick={() => setMetricIndex((index) => Math.max(0, index - 1))} disabled={metricIndex === 0}>
          Kembali
        </button>
        <span>{metricIndex + 1} dari {technicianMetrics.length}<strong>{metric.label}</strong></span>
        <button type="button" onClick={() => setMetricIndex((index) => Math.min(technicianMetrics.length - 1, index + 1))} disabled={metricIndex === technicianMetrics.length - 1}>
          Selanjutnya
        </button>
      </div>
      {filteredTechnicians.length === 0 ? (
        <p className={styles.noTechnicians}>Teknisi tidak ditemukan.</p>
      ) : (
        <div className={styles.technicianCards}>
          {filteredTechnicians.map((technician) => (
            <article className={styles.technicianCard} key={technician.technicianId}>
              <h3 className={styles.technicianCardName}>{technician.name}</h3>
              <div className={styles.singleTechnicianMetric}>
                <span>{metric.label}</span>
                <strong style={{ color: metric.color?.(technician) || 'var(--navy-950)' }}>
                  {metric.value(technician)}
                </strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportDashboard({ report }: { report: ReportOverviewData }) {
  const maxWeek = Math.max(...report.volume.byWeek.map((item) => item.ticketsReceived), ...report.volume.byWeek.map((item) => item.ticketsCompleted), 1);
  const statusDistribution = Object.entries(report.statusDistribution)
    .map(([status, count]) => ({ status, count }))
    .sort((left, right) => right.count - left.count);

  return (
    <>
      <section className={styles.statsGrid} aria-label="Ringkasan laporan">
        <article className={`${styles.statCard} ${styles.statCardPrimary}`}>
          <span className={styles.statLabel}>Pendapatan servis selesai</span>
          <strong className={styles.statValue}>{formatRupiah(report.revenue.totalRevenue)}</strong>
          <span className={styles.statDetail}>
            {report.revenue.serviceCount} servis dengan estimasi disetujui
          </span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Tiket masuk</span>
          <strong className={styles.statValue}>{report.volume.ticketsReceived}</strong>
          <span className={styles.statDetail}>Dibuat selama periode ini</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Servis selesai</span>
          <strong className={styles.statValue}>{report.volume.ticketsCompleted}</strong>
          <span className={styles.statDetail}>Siap diambil selama periode ini</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>Kepatuhan SLA</span>
          <strong className={styles.statValue}>
            {report.sla.percentage == null ? '—' : `${report.sla.percentage}%`}
          </strong>
          <span className={styles.statDetail}>
            {report.sla.metTickets} dari {report.sla.eligibleTickets} servis memenuhi target
          </span>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel} aria-labelledby="volume-title">
          <header className={styles.panelHeader}>
            <div>
              <h2 id="volume-title">Volume Tiket Mingguan</h2>
              <p>{formatReportDate(report.period.startDate, report.period.timezone)} – {formatReportDate(report.period.endDate, report.period.timezone)} · Tiket masuk dibandingkan tiket selesai</p>
            </div>
          </header>
          <div className={styles.chartLegend}>
            <span><i className={styles.legendReceived} /> Tiket masuk</span>
            <span><i className={styles.legendCompleted} /> Tiket selesai</span>
          </div>
          {report.volume.byWeek.length === 0 ? (
            <div className={styles.emptyChart}>Belum ada aktivitas tiket pada periode ini.</div>
          ) : (
            <div className={styles.weeklyChart} role="img" aria-label={report.volume.ticketsReceived + ' tiket masuk dan ' + report.volume.ticketsCompleted + ' servis selesai'}>
              {report.volume.byWeek.map((week) => (
                <div className={styles.weekColumn} key={week.week}>
                  <div className={styles.weekBars}>
                    <div className={styles.weekBarWrap}><span className={styles.weekValue}>{week.ticketsReceived}</span><i className={styles.weekBarReceived} style={{ height: Math.max(week.ticketsReceived ? 4 : 0, (week.ticketsReceived / maxWeek) * 100) + '%' }} /></div>
                    <div className={styles.weekBarWrap}><span className={styles.weekValue}>{week.ticketsCompleted}</span><i className={styles.weekBarCompleted} style={{ height: Math.max(week.ticketsCompleted ? 4 : 0, (week.ticketsCompleted / maxWeek) * 100) + '%' }} /></div>
                  </div>
                  <span className={styles.weekLabel}>{week.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${styles.panel} ${styles.statusPanel}`} aria-labelledby="status-title">
          <header className={styles.panelHeader}>
            <div>
              <h2 id="status-title">Status Tiket Aktif</h2>
              <p>{statusDistribution.reduce((sum, item) => sum + item.count, 0)} tiket belum ditutup</p>
            </div>
          </header>
          {statusDistribution.every((item) => item.count === 0) ? (
            <div className={styles.emptyChart}>Belum ada tiket aktif.</div>
          ) : (
            <div className={styles.statusList}>
              {statusDistribution.filter((item) => item.count > 0).map((item) => (
                <div className={styles.statusItem} key={item.status}>
                  <div className={styles.statusMeta}>
                    <strong>{getStatusLabel(item.status)}</strong>
                    <span>{item.count} tiket</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className={styles.slaCallout}>
            <span aria-hidden="true">i</span>
            <div><strong>{report.sla.percentage == null ? 'Belum ada data SLA' : report.sla.percentage + '% SLA terpenuhi'}</strong><p>Pertahankan performa tim Anda.</p></div>
          </div>
        </section>
      </div>
      <section className={styles.techniciansPanel} aria-labelledby="technicians-title">
        <header className={styles.techniciansHeader}>
          <div>
            <h2 id="technicians-title">Performa Tim</h2>
            <p>Servis selesai dan ketepatan target waktu pada periode terpilih.</p>
          </div>
        </header>
        {report.technicians.length === 0 ? (
          <div className={styles.emptyTable}>Belum ada teknisi aktif terdaftar.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Teknisi</th>
                    <th className={styles.textRight}>Tiket aktif</th>
                    <th className={styles.textRight}>Servis selesai</th>
                    <th className={styles.textRight}>Kepatuhan SLA</th>
                    <th className={styles.textRight}>Rata-rata waktu servis</th>
                  </tr>
                </thead>
                <tbody>
                  {report.technicians.map((technician) => (
                    <tr key={technician.technicianId}>
                      <td><span className={styles.technicianName}>{technician.name}</span></td>
                      <td className={styles.textRight}>{technician.activeTickets}</td>
                      <td className={styles.textRight}>{technician.completedInPeriod}</td>
                      <td className={styles.textRight}>
                        <span style={{ color: getTechnicianSlaColor(technician.slaPercentage), fontWeight: 650 }}>
                          {technician.slaPercentage == null ? '—' : String(technician.slaPercentage) + '%'}
                        </span>
                      </td>
                      <td className={styles.textRight}>
                        {technician.avgCompletionDays == null ? '—' : String(technician.avgCompletionDays) + ' hari'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TechnicianMobileView technicians={report.technicians} />
          </>
        )}
      </section>
    </>
  );
}

export default function OwnerReportsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const today = toDateInputValue(new Date());
  const currentMonth = today.slice(0, 7);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedDate, setSelectedDate] = useState(today);
  const [customStartDate, setCustomStartDate] = useState(`${currentMonth}-01`);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [appliedRange, setAppliedRange] = useState<DateRange>(initialRange);
  const [rangeError, setRangeError] = useState('');
  const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
  const selectedWeek = Math.floor((selectedDay - 1) / 7) + 1;
  const selectedWeekCount = Math.ceil(new Date(selectedYear, selectedMonth, 0).getDate() / 7);
  const yearOptions = Array.from({ length: 23 }, (_, index) => new Date().getFullYear() - 20 + index);

  function updateSelectedDate(year: number, month: number, day = selectedDay) {
    setSelectedDate(buildDateInputValue(year, month, day));
  }

  const { currentData, isLoading, isFetching, error, refetch } = useGetReportOverviewQuery(
    { businessId: businessId || '', params: appliedRange },
    {
      skip: !businessId,
      refetchOnFocus: true,
      refetchOnReconnect: true,
      refetchOnMountOrArgChange: true,
    },
  );
  const report = currentData?.data;

  function handleApplyRange() {
    if (periodMode === 'custom' && (!customStartDate || !customEndDate)) {
      setRangeError('Pilih tanggal mulai dan tanggal selesai.');
      return;
    }
    if (periodMode !== 'custom' && !selectedDate) {
      setRangeError('Pilih tanggal untuk menentukan periode laporan.');
      return;
    }

    const nextRange = getDateRange(periodMode, selectedDate, customStartDate, customEndDate);
    if (!nextRange.startDate || !nextRange.endDate || nextRange.startDate > nextRange.endDate) {
      setRangeError('Tanggal mulai harus sama dengan atau sebelum tanggal selesai.');
      return;
    }

    const start = fromDateInputValue(nextRange.startDate);
    const end = fromDateInputValue(nextRange.endDate);
    const rangeDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (rangeDays > 366) {
      setRangeError('Rentang laporan maksimal 366 hari.');
      return;
    }

    setRangeError('');
    setAppliedRange(nextRange);
  }

  function selectPeriod(mode: PeriodMode) {
    setPeriodMode(mode);
    setRangeError('');
    if (mode !== 'custom') {
      setAppliedRange(getDateRange(mode, selectedDate, customStartDate, customEndDate));
    }
  }

  if ((isLoading || isFetching) && !report) return <PageLoader />;

  if (!report) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Laporan belum tersedia"
          description={error
            ? 'Data laporan gagal dimuat. Coba muat ulang laporan.'
            : 'Pilih periode untuk melihat ringkasan keuangan dan operasional tempat servis.'}
          symbol="▤"
          action={<Button onClick={() => void refetch()}>Muat ulang</Button>}
        />
      </main>
    );
  }

  const modeOptions: { value: PeriodMode; label: string }[] = [
    { value: 'day', label: 'Hari' },
    { value: 'week', label: 'Minggu' },
    { value: 'month', label: 'Bulan' },
    { value: 'custom', label: 'Rentang tanggal' },
  ];

  return (
    <div className={`container page-content ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span className="eyebrow">PORTAL PEMILIK</span>
          <h1>Laporan</h1>
          <p>Ringkasan operasional ServisKita, beban tim, dan ketepatan waktu penyelesaian.</p>
        </div>
      </header>

      <section className={styles.periodCard} aria-label="Filter periode laporan">
        <div className={styles.periodHeader}>
          <div>
            <h2>Periode laporan</h2>
            <span className={styles.periodLabel}>
              Data: {formatDate(appliedRange.startDate)} – {formatDate(appliedRange.endDate)}
              {' · '}{report.period.days} hari
            </span>
          </div>
          {isFetching && <span className={styles.loadingHint} role="status">Memperbarui laporan…</span>}
        </div>

        <div className={styles.periodModes} role="group" aria-label="Pilih jenis periode">
          {modeOptions.map((option) => (
            <button
              className={`${styles.periodMode} ${periodMode === option.value ? styles.periodModeActive : ''}`}
              key={option.value}
              type="button"
              aria-pressed={periodMode === option.value}
              onClick={() => selectPeriod(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {periodMode === 'custom' ? (
          <div className={styles.periodControls + ' ' + styles.customPeriodControls}>
            <div className={styles.dateField}>
              <label htmlFor="report-start-date">Dari tanggal</label>
              <input
                id="report-start-date"
                type="date"
                value={customStartDate}
                onChange={(event) => setCustomStartDate(event.target.value)}
              />
            </div>
            <div className={styles.dateField}>
              <label htmlFor="report-end-date">Sampai tanggal</label>
              <input
                id="report-end-date"
                type="date"
                value={customEndDate}
                onChange={(event) => setCustomEndDate(event.target.value)}
              />
            </div>
            <Button type="button" onClick={handleApplyRange}>Terapkan periode</Button>
          </div>
        ) : (
          <div className={styles.periodControls + ' ' + (periodMode === 'month' ? styles.monthControls : styles.multiSelectControls)}>
            <div className={styles.dateSelectors + ' ' + (periodMode === 'month' ? styles.monthSelectors : '')}>
              {periodMode === 'day' && (
                <div className={styles.selectField + ' ' + styles.daySelect}>
                  <label htmlFor="report-day">Tanggal</label>
                  <select
                    id="report-day"
                    value={selectedDay}
                    onChange={(event) => updateSelectedDate(selectedYear, selectedMonth, Number(event.target.value))}
                  >
                    {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              )}
              {periodMode === 'week' && (
                <div className={styles.selectField + ' ' + styles.weekSelect}>
                  <label htmlFor="report-week">Minggu</label>
                  <select
                    id="report-week"
                    value={selectedWeek}
                    onChange={(event) => updateSelectedDate(selectedYear, selectedMonth, (Number(event.target.value) - 1) * 7 + 1)}
                  >
                    {Array.from({ length: selectedWeekCount }, (_, index) => index + 1).map((week) => (
                      <option key={week} value={week}>Minggu {week}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.selectField + ' ' + styles.monthSelect}>
                <label htmlFor="report-month">Bulan</label>
                <select
                  id="report-month"
                  value={String(selectedMonth).padStart(2, '0')}
                  onChange={(event) => {
                    const month = Number(event.target.value);
                    const day = periodMode === 'week'
                      ? Math.min((selectedWeek - 1) * 7 + 1, new Date(selectedYear, month, 0).getDate())
                      : selectedDay;
                    updateSelectedDate(selectedYear, month, day);
                  }}
                >
                  {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
              </div>
              <div className={styles.selectField + ' ' + styles.yearSelect}>
                <label htmlFor="report-year">Tahun</label>
                <select
                  id="report-year"
                  value={selectedYear}
                  onChange={(event) => {
                    const year = Number(event.target.value);
                    const day = periodMode === 'week'
                      ? Math.min((selectedWeek - 1) * 7 + 1, new Date(year, selectedMonth, 0).getDate())
                      : selectedDay;
                    updateSelectedDate(year, selectedMonth, day);
                  }}
                >
                  {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
            <Button type="button" onClick={handleApplyRange}>Terapkan periode</Button>
          </div>
        )}
        {rangeError && <p className={styles.rangeError} role="alert">{rangeError}</p>}
      </section>

      <ReportDashboard report={report} />
    </div>
  );
}
