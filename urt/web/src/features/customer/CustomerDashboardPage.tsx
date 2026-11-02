import { Link } from 'react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useCustomerPortal } from './customer-portal';
import { useGetCustomerDashboardQuery } from '../dashboard/dashboardApi';
import { SummaryCard } from '../../components/ui/SummaryCard';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { TicketTable } from '../tickets/TicketTable';
import { serviceWorkflowStages, serviceProgressState } from '../tickets/status';
import { durationLabel, totalServiceDurationMinutes } from '../tickets/service-timing';
import { useGetPublicTrackingMutation } from '../tickets/ticketsApi';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { currentStatusNote, TicketTimeline } from '../tickets/TicketTimeline';
import type { PublicTrackingResult } from '../tickets/types';
import { whatsappMessageLink } from '../tickets/whatsapp';
import styles from './CustomerDashboard.module.css';

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.67 12.05 3.67ZM8.53 7.33C8.37 7.33 8.1 7.39 7.87 7.64C7.65 7.89 7.02 8.48 7.02 9.68C7.02 10.88 7.89 12.04 8.01 12.2C8.13 12.36 9.73 14.83 12.18 15.89C12.77 16.14 13.22 16.29 13.58 16.41C14.16 16.59 14.7 16.56 15.12 16.5C15.59 16.43 16.56 15.91 16.76 15.35C16.96 14.79 16.96 14.31 16.9 14.21C16.84 14.11 16.68 14.05 16.44 13.93C16.2 13.81 15.02 13.23 14.8 13.15C14.58 13.07 14.42 13.03 14.26 13.27C14.1 13.51 13.64 14.05 13.5 14.21C13.36 14.37 13.22 14.39 12.98 14.27C12.74 14.15 11.97 13.9 11.04 13.08C10.32 12.44 9.83 11.65 9.69 11.41C9.55 11.17 9.67 11.04 9.79 10.92C9.9 10.81 10.04 10.63 10.16 10.49C10.28 10.35 10.32 10.25 10.4 10.09C10.48 9.93 10.44 9.79 10.38 9.67C10.32 9.55 9.86 8.41 9.67 7.95C9.48 7.51 9.29 7.57 9.15 7.56C9.02 7.56 8.86 7.33 8.53 7.33Z" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function TrackedTicketPanel({ ticket }: { ticket: PublicTrackingResult }) {
  const deviceTitle = [ticket.device.brand, ticket.device.model].filter(Boolean).join(' ') || ticket.device.category;

  return (
    <div className={styles.trackedServiceLayout} aria-label="Informasi tiket yang dicari">
      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div className={styles.deviceVisual}><DeviceIcon /></div>
          <div className={styles.summaryMeta}>
            <div className={styles.summaryHeader}>
              <span className={styles.ticketCode}>{ticket.ticketCode}</span>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <h2 className={styles.deviceName}>{deviceTitle}</h2>
            <p className={styles.complaintText}><strong>Pemilik perangkat:</strong> {ticket.customer.name}</p>
            <p className={styles.complaintText}>{ticket.complaint}</p>
          </div>
        </div>

        <hr className={styles.cardDivider} />

        <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <span className={styles.infoIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18M5 21V7l8-4 6 4v14M9 21v-6h6v6M8 9h.01M12 9h.01M16 9h.01" />
              </svg>
            </span>
            <div className={styles.infoCol}>
              <span className={styles.infoLabel}>Tempat Servis</span>
              <strong className={styles.infoValue}>{ticket.business.name}</strong>
            </div>
          </div>
          <div className={styles.infoSeparator} aria-hidden="true" />
          <div className={styles.infoItem}>
            <span className={styles.infoIcon} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            </span>
            <div className={styles.infoCol}>
              <span className={styles.infoLabel}>Tanggal Diterima</span>
              <strong className={styles.infoValue}>
                {new Date(ticket.receivedAt).toLocaleString('id-ID')}
              </strong>
            </div>
          </div>
        </div>

        {ticket.attachments?.length > 0 && (
          <section aria-label="Foto perangkat">
            <h3 className={styles.timelineHeading}>Foto Perangkat</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {ticket.attachments.map((attachment) => (
                <a key={attachment.key} href={attachment.url} target="_blank" rel="noreferrer">
                  <img
                    src={attachment.url}
                    alt={`Foto perangkat: ${attachment.originalName}`}
                    loading="lazy"
                    style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {(ticket.readyAt || ticket.handedOverAt || ticket.business.phone) && (
          <div className={styles.trackingMeta}>
            {ticket.readyAt && <p><strong>Siap diambil:</strong> {new Date(ticket.readyAt).toLocaleString('id-ID')}</p>}
            {ticket.handedOverAt && <p><strong>Diserahkan:</strong> {new Date(ticket.handedOverAt).toLocaleString('id-ID')}</p>}
            {ticket.business.phone && <p><strong>Telepon servis:</strong> {ticket.business.phone}</p>}
          </div>
        )}
      </section>

      <section className={styles.journeyCard}>
        <div className={styles.journeyHeader}><h2>Perjalanan Servis</h2></div>
        <ServiceStepper status={ticket.status} statusNote={currentStatusNote(ticket.status, ticket.timeline)} />
        <div>
          <h3 className={styles.timelineHeading}>Riwayat Status</h3>
          <TicketTimeline timeline={ticket.timeline} />
        </div>
      </section>
    </div>
  );
}

export default function CustomerDashboardPage() {
  const { businessId, business, basePath, hasMembership, isAuthenticated } = useCustomerPortal();
  const [searchParams] = useSearchParams();
  const initialTicketCode = searchParams.get('ticketCode')?.trim() || '';
  const [ticketSearch, setTicketSearch] = useState(initialTicketCode);
  const [trackingResult, setTrackingResult] = useState<PublicTrackingResult | null>(null);
  const [searchError, setSearchError] = useState('');
  const [fetchTracking, { isLoading: isSearching }] = useGetPublicTrackingMutation();
  const authState = {
    from: {
      pathname: basePath,
      search: initialTicketCode ? `?ticketCode=${encodeURIComponent(initialTicketCode)}` : undefined,
    },
  };
  const user = useAppSelector(selectUser);
  const { currentData: data, isLoading, isError, refetch } = useGetCustomerDashboardQuery(
    { businessId: businessId || '' },
    { skip: !businessId || !hasMembership || !isAuthenticated, pollingInterval: 10000, refetchOnFocus: true, refetchOnReconnect: true },
  );

  useEffect(() => {
    if (!initialTicketCode) return;
    const ticketCode = initialTicketCode.replace(/^#/, '').toUpperCase();
    setTicketSearch(ticketCode);
    void fetchTracking({ ticketCode }).unwrap()
      .then((response) => setTrackingResult(response.data))
      .catch(() => setSearchError('Nomor tiket tidak ditemukan. Periksa kembali nomor tiket dan coba lagi.'));
  }, [fetchTracking, initialTicketCode]);

  useEffect(() => {
    if (!trackingResult?.ticketCode) return;
    const interval = window.setInterval(() => {
      void fetchTracking({ ticketCode: trackingResult.ticketCode }).unwrap()
        .then((response) => setTrackingResult(response.data))
        .catch(() => window.clearInterval(interval));
    }, 60000);
    return () => window.clearInterval(interval);
  }, [fetchTracking, trackingResult?.ticketCode]);

  const handleTicketSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ticketCode = ticketSearch.trim().replace(/^#/, '').toUpperCase();
    if (!ticketCode) {
      setSearchError('Masukkan nomor tiket untuk melacak status servis.');
      setTrackingResult(null);
      return;
    }

    setSearchError('');
    setTrackingResult(null);
    try {
      const response = await fetchTracking({ ticketCode }).unwrap();
      setTrackingResult(response.data);
    } catch {
      setSearchError('Nomor tiket tidak ditemukan. Periksa kembali nomor tiket dan coba lagi.');
    }
  };

  if (isLoading) return <PageLoader />;
  if (hasMembership && isAuthenticated && (isError || !data?.data))
    return (
      <EmptyState
        title="Servis belum dapat dimuat"
        description="Coba muat kembali informasi perangkat Anda."
        action={<button onClick={() => refetch()}>Coba lagi</button>}
      />
    );

  const ownDashboard = hasMembership && isAuthenticated && data?.data ? data.data : undefined;
  const { stats, recentTickets } = ownDashboard || {
    stats: { activeTickets: 0, completedTickets: 0, awaitingApproval: 0 },
    recentTickets: [],
  };
  const displayPublicStats = !isAuthenticated || !hasMembership;
  const trackedTicketStats = trackingResult
    ? {
        activeTickets: ['completed', 'cancelled'].includes(trackingResult.status) ? 0 : 1,
        completedTickets: trackingResult.status === 'completed' ? 1 : 0,
        awaitingApproval: trackingResult.status === 'awaiting_approval' ? 1 : 0,
      }
    : { activeTickets: 0, completedTickets: 0, awaitingApproval: 0 };
  const displayStats = displayPublicStats ? trackedTicketStats : stats;

  const ticket = recentTickets.find((item) => !['completed', 'cancelled'].includes(item.status));
  const completed = recentTickets.filter((item) =>
    ['completed', 'cancelled'].includes(item.status),
  );

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
      })
    : undefined;
  const totalServiceDuration = totalServiceDurationMinutes(estimate);

  const techPhone = ticket?.technician?.phone;
  const techName = ticket?.technician?.name || 'Patrick Star';
  const deviceTitle = ticket
    ? [ticket.device.brand, ticket.device.model].filter(Boolean).join(' ') || ticket.device.category
    : '';
  const waMsg = ticket
    ? `Halo ${techName}, saya ingin menanyakan perkembangan servis tiket #${ticket.ticketCode} (${deviceTitle}). Terima kasih!`
    : '';
  const waLink = whatsappMessageLink(techPhone, waMsg) || (techPhone ? `https://wa.me/${techPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMsg)}` : `https://wa.me/?text=${encodeURIComponent(waMsg)}`);

  return (
    <div className="reference-stack" data-dashboard="customer">
      <header className="reference-heading">
        <div>
          <h1>
            {user ? `Halo, ${user.firstName} ${user.lastName}` : 'Selamat Datang di Portal Pelanggan'}
          </h1>
          <p>{business?.name || 'Pantau perkembangan perangkat Anda dengan mudah.'}</p>
        </div>
        <div className="actions">
          {!isAuthenticated && (
            <>
              <ButtonLink to="/customer/login" variant="secondary" state={authState}>
                Masuk
              </ButtonLink>
              <ButtonLink to="/customer/register" variant="secondary" state={authState}>
                Daftar Akun
              </ButtonLink>
            </>
          )}
          <ButtonLink to={`${basePath}/services/new`}>+ Ajukan Servis</ButtonLink>
        </div>
      </header>

      <section className={`reference-panel ${styles.ticketSearch}`} aria-labelledby="ticket-search-title">
        <div className="reference-panel-header">
          <h2 id="ticket-search-title">Lacak Tiket Servis</h2>
        </div>
        <form className={styles.searchRow} onSubmit={handleTicketSearch}>
          <input
            id="customer-ticket-search"
            name="ticketSearch"
            type="search"
            aria-label="Nomor tiket servis untuk melacak status"
            value={ticketSearch}
            onChange={(event) => {
              setTicketSearch(event.target.value);
              setSearchError('');
              setTrackingResult(null);
            }}
            placeholder="Masukkan nomor tiket untuk melacak status servis"
            autoComplete="off"
          />
          <Button type="submit" pending={isSearching}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            Cari
          </Button>
        </form>
        {searchError && <p className={styles.searchError} role="alert">{searchError}</p>}
      </section>

      <section className="reference-stats reference-stats-three">
        <SummaryCard
          label="Servis Aktif"
          value={displayStats.activeTickets}
          detail={displayPublicStats ? 'Tiket yang sedang dilacak' : 'Perangkat dalam penanganan'}
        />
        <SummaryCard
          label="Servis Selesai"
          value={displayStats.completedTickets}
          detail={displayPublicStats ? 'Status tiket yang sedang dilacak' : 'Riwayat perbaikan Anda'}
          tone="green"
          icon="check"
        />
        <SummaryCard
          label="Menunggu Persetujuan"
          value={displayStats.awaitingApproval}
          detail={displayPublicStats ? 'Tiket yang sedang dilacak' : 'Estimasi membutuhkan keputusan'}
          tone="orange"
          icon="clock"
        />
      </section>

      {trackingResult ? (
        <TrackedTicketPanel ticket={trackingResult} />
      ) : ticket ? (
        <div className={styles.activeServiceGrid}>
          {/* Card Kiri: Service Summary */}
          <section className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div className={styles.deviceVisual}>
                <DeviceIcon />
              </div>
              <div className={styles.summaryMeta}>
                <div className={styles.summaryHeader}>
                  <span className={styles.ticketCode}>{ticket.ticketCode}</span>
                  <TicketStatusBadge status={ticket.status} />
                </div>
                <h3 className={styles.deviceName}>
                  {[ticket.device.brand, ticket.device.model].filter(Boolean).join(' ') || ticket.device.category}
                </h3>
                <p className={styles.complaintText}>{ticket.complaint}</p>
              </div>
            </div>

            <hr className={styles.cardDivider} />

            <div className={styles.infoRow}>
              <div className={styles.infoCol}>
                <span className={styles.infoLabel}>Teknisi</span>
                <strong className={styles.infoValue}>
                  {ticket.technician?.name || 'Patrick Star'}
                </strong>
              </div>
              <div className={styles.infoSeparator} aria-hidden="true" />
              <div className={styles.infoCol}>
                <span className={styles.infoLabel}>Tempat Servis</span>
                <strong className={styles.infoValue}>
                  {business?.name || data?.data.business.name || 'nfservice'}
                </strong>
              </div>
            </div>

            <div className={styles.cardActions}>
              <ButtonLink
                to={`${basePath}/services/${ticket.id}`}
                variant="primary"
                className={styles.primaryDetailBtn}
              >
                <span>Lihat Detail Servis</span>
                <span aria-hidden="true">&rarr;</span>
              </ButtonLink>
              {ticket.status === 'awaiting_approval' && (
                <ButtonLink
                  to={`${basePath}/services/${ticket.id}/approval`}
                  variant="secondary"
                >
                  Tinjau Estimasi
                </ButtonLink>
              )}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactTechBtn}
                title="Buka chat WhatsApp dengan teknisi penanggung jawab"
              >
                <WhatsAppIcon />
                <span>Hubungi Teknisi</span>
              </a>
            </div>
          </section>

          {/* Card Kanan: Perjalanan Servis */}
          <section className={styles.journeyCard}>
            <div className={styles.journeyHeader}>
              <h2>Perjalanan Servis</h2>
              <Link to={`${basePath}/services/${ticket.id}`} className="text-link">
                Lihat riwayat lengkap
              </Link>
            </div>

            <div className={styles.journeyBody}>
              {/* Timeline 6 Tahap */}
              <div className={styles.timelineWrapper}>
                <ol className={styles.journeyTimeline} aria-label="Tahapan pengerjaan servis">
                  {serviceWorkflowStages.map((stage, index) => {
                    const state = serviceProgressState(ticket.status, index);

                    let timestamp: string | undefined;
                    if (index === 0 && ticket.createdAt) {
                      timestamp = new Date(ticket.createdAt).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    } else if (state === 'completed') {
                      const event = ticket.timeline?.find((e) => {
                        if (index === 1) return e.action === 'diagnosed' || e.action === 'diagnosis_started';
                        if (index === 2) return e.action === 'estimate_approved';
                        if (index === 3) return e.action === 'repair_started' || e.action === 'estimate_approved';
                        if (index === 4) return e.action === 'quality_check_submitted';
                        if (index === 5) return e.action === 'completed';
                        return false;
                      });
                      if (event?.timestamp) {
                        timestamp = new Date(event.timestamp).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      }
                    }

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
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </span>
                        </div>

                        <div className={state === 'current' ? styles.stepContentActive : styles.stepContent}>
                          <strong className={styles.stepTitle}>{stage.label}</strong>
                          {state === 'current' && (
                            <span className={styles.stepSubtext}>Sedang dalam proses</span>
                          )}
                          {timestamp && state === 'completed' && (
                            <span className={styles.stepTimestamp}>{timestamp}</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

            <p className={styles.scheduleNote} role="status">
              {currentStatusNote(ticket.status, ticket.timeline)}
            </p>

              {/* Estimasi Servis Selesai */}
              <div className={styles.scheduleCard}>
                <h3 className={styles.scheduleTitle}>Estimasi Servis Selesai</h3>
                <dl className={styles.scheduleDl}>
                  {totalServiceDuration && <div><dt>Durasi servis (termasuk QC)</dt><dd>{durationLabel(totalServiceDuration)}</dd></div>}
                  {targetDateFormatted && (
                    <div>
                      <dt>Perkiraan selesai</dt>
                      <dd>{targetDateFormatted}</dd>
                    </div>
                  )}
                </dl>
                <div className={styles.scheduleNote}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>Durasi yang ditampilkan mencakup pengerjaan dan pemeriksaan kualitas.</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="Belum ada servis aktif"
          description={isAuthenticated
            ? 'Ajukan servis di tempat ini. Nomor tiket akan muncul setelah pengajuan berhasil.'
            : 'Ajukan servis tanpa membuat akun. Anda akan mendapat nomor tiket dan tautan pelacakan pribadi.'}
          action={<div className="actions">
            <ButtonLink to={`${basePath}/services/new`}>Ajukan Servis</ButtonLink>
          </div>}
        />
      )}

      {/* Servis Sebelumnya / Riwayat Servis */}
      <section className="reference-panel">
        <div className="reference-panel-header">
          <div>
            <h2>Servis Sebelumnya</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--slate-500)', fontSize: '0.88rem' }}>
              Daftar perbaikan perangkat Anda sebelumnya.
            </p>
          </div>
          <Link to={`${basePath}/history`} className="text-link">
            Lihat semua
          </Link>
        </div>
        <TicketTable tickets={completed} role="customer" customerBasePath={basePath} history />
      </section>
    </div>
  );
}
