import { Link } from 'react-router';
import logo from '../../assets/logo-urt.svg';
import { currentStatusNote, TicketTimeline } from '../tickets/TicketTimeline';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useParams } from 'react-router';
import {
  useGetPublicTrackingMutation,
  useInspectServiceApprovalQuery,
  useRespondServiceApprovalMutation,
} from '../tickets/ticketsApi';
import type { EstimateRevision, PublicServiceApproval, PublicTrackingResult } from '../tickets/types';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './InfoPages.module.css';
import ticketStyles from '../tickets/Tickets.module.css';
import timingStyles from '../tickets/TicketTiming.module.css';
import { customerPortalPath } from '../customer/customer-portal';
import { durationLabel, totalServiceDurationMinutes } from '../tickets/service-timing';

function getTargetCompletionDate(now: Date): Date {
  const currentHour = now.getHours();

  if (currentHour >= 21) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  const target = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (target.getHours() >= 21) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }

  return target;
}

export default function TrackingPage() {
  const { ticketCode: routeTicketCode } = useParams<{ ticketCode?: string }>();
  const location = useLocation();
  const autoLookup = useRef(false);

  const cleanRoute = (routeTicketCode || '').trim().replace(/^#/, '').toUpperCase();
  const isDemoTicket = cleanRoute === 'URT-1024' || cleanRoute.includes('1024') || cleanRoute === 'URT-2026-123456' || cleanRoute === 'URT-2026-SNRM';
  const [ticketCode, setTicketCode] = useState(routeTicketCode || '');
  const [manualDemoCode, setManualDemoCode] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const normalizedTicketCode = (value: string) => value.trim().replace(/^#/, '').toUpperCase();
  const isDemo = isDemoTicket || manualDemoCode === normalizedTicketCode(ticketCode);
  const approvalToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      setCurrentTime(now);
      setTargetDate(getTargetCompletionDate(new Date(now)));
    };
    const initialUpdate = window.setTimeout(updateTime, 0);
    const timer = window.setInterval(updateTime, 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const [trackingResult, setTrackingResult] = useState<PublicTrackingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState('');
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'rejected' | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [fetchTracking, { isLoading }] = useGetPublicTrackingMutation();
  const { currentData: approvalData, isFetching: isCheckingApproval, isError: isApprovalError } = useInspectServiceApprovalQuery(
    approvalToken,
    { skip: !approvalToken, refetchOnFocus: true },
  );
  const [respondApproval, { isLoading: isResponding }] = useRespondServiceApprovalMutation();
  const portalPath = trackingResult?.business.slug ? customerPortalPath(trackingResult.business.slug) : '/customer';

  useEffect(() => {
    if (isDemoTicket || autoLookup.current || !routeTicketCode) return;
    autoLookup.current = true;
    void fetchTracking({ ticketCode: routeTicketCode }).unwrap()
      .then((response) => setTrackingResult(response.data))
      .catch(() => setErrorMessage('Nomor tiket tidak ditemukan. Periksa kembali nomor tiket dan coba lagi.'));
  }, [fetchTracking, isDemoTicket, routeTicketCode]);

  useEffect(() => {
    if (!trackingResult?.ticketCode) return;
    const timer = window.setInterval(() => {
      void fetchTracking({ ticketCode: trackingResult.ticketCode }).unwrap()
        .then((response) => setTrackingResult(response.data))
        .catch(() => window.clearInterval(timer));
    }, 60000);
    return () => window.clearInterval(timer);
  }, [fetchTracking, trackingResult?.ticketCode]);

  async function handleApproval(decision: 'approved' | 'rejected') {
    const approval: PublicServiceApproval | undefined = approvalData?.data;
    if (!approval || approval.ticketCode !== trackingResult?.ticketCode) return;
    setApprovalError('');
    try {
      await respondApproval({
        token: approvalToken,
        expectedRevision: approval.revision,
        decision,
        reason: decision === 'rejected' ? rejectReason.trim() || undefined : undefined,
      }).unwrap();
      setApprovalDecision(decision);
      const response = await fetchTracking({ ticketCode: approval.ticketCode }).unwrap();
      setTrackingResult(response.data);
    } catch (err) {
      const body = (err as { data?: ApiErrorBody }).data;
      setApprovalError(body?.error || body?.message || 'Tanggapan belum terkirim. Periksa kembali estimasi lalu coba lagi.');
    }
  }

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setApprovalDecision(null);
    setApprovalError('');

    const clean = ticketCode.trim().replace(/^#/, '').toUpperCase();
    if (clean === 'URT-1024' || clean.includes('1024') || clean === 'URT-2026-123456' || clean === 'URT-2026-SNRM') {
      setManualDemoCode(clean);
      return;
    }

    if (!ticketCode.trim()) {
      setErrorMessage('Masukkan nomor tiket servis.');
      return;
    }

    try {
      const res = await fetchTracking({ ticketCode: ticketCode.trim().toUpperCase() }).unwrap();

      setTrackingResult(res.data);
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.data?.message ||
          'Nomor tiket tidak ditemukan. Periksa kembali nomor tiket dan coba lagi.',
      );
      setTrackingResult(null);
    }
  };

  const displayTicketCode = (cleanRoute || ticketCode.trim().replace(/^#/, '').toUpperCase()) || 'URT-1024';

  if (isDemo) {
    if (currentTime === null || targetDate === null) return null;
    const demoNow = currentTime;
    const demoTargetDate = targetDate;
    const demoEstimate: EstimateRevision = {
      version: 1,
      status: 'approved',
      currency: 'IDR',
      totalAmount: 250000,
      submittedAt: new Date(demoNow - 3600000).toISOString(),
      repairDurationMinutes: 120,
      qcDurationMinutes: 30,
      serviceDurationMinutes: 150,
      targetCompletionDate: demoTargetDate.toISOString(),
      decision: {
        decision: 'approved',
        decidedAt: new Date(demoNow - 1800000).toISOString(),
      },
      lines: [
        {
          id: 'line-1',
          type: 'part',
          catalogEntryType: 'part',
          description: 'Thermal Paste Arctic MX-4 (High Performance)',
          quantity: 1,
          unitPrice: 100000,
          subtotal: 100000,
        },
        {
          id: 'line-2',
          type: 'labor',
          catalogEntryType: 'difficulty',
          difficultyLevel: 'medium',
          description: 'Biaya Servis',
          quantity: 1,
          unitPrice: 150000,
          subtotal: 150000,
        },
      ],
    };

    return (
      <div className={`container page-content ${ticketStyles.container}`}>
        <header className={ticketStyles.heading}>
          <div>
            <span className="eyebrow">Status Perbaikan</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <span className={ticketStyles.ticketCode}>{displayTicketCode}</span>
              <TicketStatusBadge status="approved" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <ButtonLink to="/" variant="secondary">
              Kembali ke Landing Page
            </ButtonLink>
          </div>
        </header>

        {/* Stepper Card */}
        <div className={ticketStyles.ticketCard}>
          <ServiceStepper status="approved" statusNote={currentStatusNote('approved')} />
          <section className="reference-panel">
            <h2>Estimasi Servis Selesai</h2>
            <dl className="reference-dl">
              <div>
                <dt>Durasi servis (termasuk QC)</dt>
                <dd>{durationLabel(totalServiceDurationMinutes(demoEstimate))}</dd>
              </div>
              <div>
                <dt>Perkiraan selesai</dt>
                <dd>
                  {demoTargetDate.toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </dd>
              </div>
            </dl>
            <p className={timingStyles.note}>
              Durasi yang ditampilkan mencakup pengerjaan dan pemeriksaan kualitas.
            </p>
          </section>
        </div>

        {/* Hasil Pemeriksaan & Diagnosis Teknisi */}
        <div className={ticketStyles.ticketCard}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--navy-950)', margin: 0 }}>
            Hasil Pemeriksaan &amp; Diagnosis Teknisi
          </h2>
          <div
            style={{
              padding: '14px 18px',
              background: 'var(--canvas)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--blue)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--navy-950)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Debu tebal menumpuk pada sirip heatsink dan kipas pendingin laptop, memicu thermal throttling hingga laptop mati mendadak. Kualitas thermal paste CPU/GPU telah kering mengeras dan wajib diganti dengan pasta konduktivitas tinggi agar suhu operasional kembali normal dan aman.
            </p>
          </div>
        </div>

        {/* Estimasi Suku Cadang & Rincian Biaya */}
        <div className={ticketStyles.ticketCard}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--navy-950)', margin: 0 }}>
            Estimasi Suku Cadang &amp; Rincian Biaya
          </h2>
          <EstimateBreakdown revision={demoEstimate} customerView />
        </div>

        {/* Data Perangkat & Keluhan */}
        <div className={ticketStyles.ticketCard}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--navy-950)', margin: 0 }}>
            Data Perangkat &amp; Keluhan Masuk
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              padding: '14px 18px',
              background: 'var(--canvas)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Perangkat
              </span>
              <strong style={{ color: 'var(--navy-950)', fontSize: '0.95rem' }}>
                Laptop • ASUS VivoBook 14 (A416MA)
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                Teknisi Penanggung Jawab
              </span>
              <strong style={{ color: 'var(--navy-950)', fontSize: '0.95rem' }}>
                Sofia Malvalena Adam
              </strong>
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-600)' }}>
              Keluhan Awal:
            </span>
            <p style={{ marginTop: 4, marginBottom: 0, color: 'var(--navy-950)', fontSize: '0.9rem' }}>
              Laptop mati mendadak setelah 10-15 menit digunakan. Area casing bawah dan ventilasi kipas terasa sangat panas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trackingPage}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <nav className={styles.trackingNav} aria-label="Navigasi pelacakan">
        <Link to={portalPath}>
          <img src={logo} alt="URT" height="38" />
        </Link>
        <div className="actions">
          <Link to={portalPath}>Portal Pelanggan</Link>
          <ButtonLink to="/customer/login" size="small" state={{ from: { pathname: portalPath } }}>
            Login
          </ButtonLink>
        </div>
      </nav>
      <main id="main-content" className={styles.trackingMain}>
        <div className="reference-stack">
          <div className={styles.heading}>
            <span className="eyebrow">Pelacakan Servis Mandiri</span>
            <h1>Ikuti Perjalanan Perbaikan Perangkat</h1>
            <p>
              Masukkan nomor tiket servis untuk melihat perkembangan perbaikan perangkat Anda.
            </p>
          </div>

          {errorMessage && <InlineNotice type="error">{errorMessage}</InlineNotice>}

          {/* Lookup Form */}
          {!trackingResult ? (
            <form onSubmit={handleLookup} className={styles.form}>
              <TextInput
                id="ticketCode"
                label="Nomor / Kode Tiket *"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Contoh: SI-KPC2TSZXP3"
                required
              />

              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Mencari Status Servis...' : 'Lacak Status Servis'}
              </Button>

              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: 0 }}>Hanya informasi perkembangan servis yang ditampilkan.</p>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Tracking Result Card */}
              <div className={`${ticketStyles.ticketCard} ${styles.resultCard}`}>
                <div className={ticketStyles.ticketTop}>
                  <div>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--slate-500)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Tempat Servis: <strong>{trackingResult.business.name}</strong>
                      {trackingResult.business.phone && ` • Telp: ${trackingResult.business.phone}`}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span className={ticketStyles.ticketCode}>{trackingResult.ticketCode}</span>
                      <TicketStatusBadge status={trackingResult.status} />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setTrackingResult(null);
                      setApprovalDecision(null);
                      setApprovalError('');
                      setRejectReason('');
                    }}
                    style={{ fontSize: '0.82rem' }}
                  >
                    Lacak Tiket Lain
                  </Button>
                </div>

                {/* Progress Stepper */}
                <ServiceStepper
                  status={trackingResult.status}
                  statusNote={currentStatusNote(trackingResult.status, trackingResult.timeline)}
                />

                {/* Device and Complaint */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    padding: 12,
                    background: 'var(--canvas)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--slate-500)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Perangkat
                    </span>
                    <div style={{ fontWeight: 700, color: 'var(--navy-950)' }}>
                      {trackingResult.device.brand ? `${trackingResult.device.brand} ` : ''}
                      {trackingResult.device.model} ({trackingResult.device.category})
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--slate-500)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Keluhan Masuk
                    </span>
                    <div style={{ color: 'var(--navy-950)', fontSize: '0.9rem' }}>
                      {trackingResult.complaint}
                    </div>
                  </div>
                </div>

                {trackingResult.attachments?.length > 0 && (
                  <section aria-labelledby="tracking-photos-title">
                    <h3 id="tracking-photos-title" style={{ fontSize: '1.05rem', color: 'var(--navy-950)', marginBottom: 8 }}>
                      Foto Perangkat
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                      {trackingResult.attachments.map((attachment) => (
                        <a
                          key={attachment.key}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: 'grid', gap: 6, color: 'var(--navy-950)', textDecoration: 'none' }}
                        >
                          <img
                            src={attachment.url}
                            alt={`Foto perangkat: ${attachment.originalName}`}
                            loading="lazy"
                            style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                          />
                          <span style={{ fontSize: '0.82rem' }}>{attachment.originalName}</span>
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                {trackingResult.diagnosis?.customerExplanation && (
                  <section className="reference-panel">
                    <h3>Hasil Diagnosis Teknisi</h3>
                    <p style={{ marginBottom: 0 }}>{trackingResult.diagnosis.customerExplanation}</p>
                  </section>
                )}

                {trackingResult.estimate && (
                  <section className="reference-panel">
                    <EstimateBreakdown revision={trackingResult.estimate} customerView />
                  </section>
                )}

                {approvalDecision && trackingResult.status !== 'awaiting_approval' && (
                  <InlineNotice type="success">
                    {approvalDecision === 'approved'
                      ? 'Estimasi berhasil disetujui. Teknisi dapat melanjutkan perbaikan.'
                      : 'Estimasi ditolak. Tempat servis akan menghubungi Anda untuk membahas langkah selanjutnya.'}
                  </InlineNotice>
                )}

                {trackingResult.status === 'awaiting_approval' && (
                  <section className="reference-panel reference-stack" aria-labelledby="tracking-approval-title">
                    <h3 id="tracking-approval-title">Persetujuan Estimasi Servis</h3>
                    {approvalError && <InlineNotice type="error">{approvalError}</InlineNotice>}
                    {approvalDecision ? (
                      <InlineNotice type="success">
                        {approvalDecision === 'approved'
                          ? 'Estimasi berhasil disetujui. Teknisi dapat melanjutkan perbaikan.'
                          : 'Estimasi ditolak. Tempat servis akan menghubungi Anda untuk membahas langkah selanjutnya.'}
                      </InlineNotice>
                    ) : !approvalToken ? (
                      <InlineNotice>
                        Untuk menyetujui atau menolak estimasi, buka tautan persetujuan yang dikirim oleh tempat servis.
                      </InlineNotice>
                    ) : isCheckingApproval ? (
                      <p>Memuat rincian persetujuan…</p>
                    ) : isApprovalError || !approvalData?.data ? (
                      <InlineNotice type="error">Tautan persetujuan tidak tersedia atau sudah kedaluwarsa. Minta tautan terbaru dari tempat servis.</InlineNotice>
                    ) : approvalData.data.ticketCode !== trackingResult.ticketCode ? (
                      <InlineNotice type="error">Tautan persetujuan ini bukan untuk tiket yang sedang dilacak.</InlineNotice>
                    ) : approvalData.data.estimate.status !== 'pending' ? (
                      <InlineNotice>Estimasi ini sudah diproses sebelumnya.</InlineNotice>
                    ) : (
                      <>
                        <p>Tinjau diagnosis dan rincian biaya di atas sebelum menentukan persetujuan.</p>
                        <label htmlFor="tracking-reject-reason">Alasan jika menolak (opsional)</label>
                        <textarea
                          id="tracking-reject-reason"
                          maxLength={500}
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                        />
                        <div className="actions">
                          <Button variant="secondary" disabled={isResponding} onClick={() => void handleApproval('rejected')}>
                            {isResponding ? 'Memproses…' : 'Tolak Estimasi'}
                          </Button>
                          <Button disabled={isResponding} onClick={() => void handleApproval('approved')}>
                            {isResponding ? 'Memproses…' : 'Setujui Servis'}
                          </Button>
                        </div>
                      </>
                    )}
                  </section>
                )}

                {/* Ready / Handed over notification */}
                {trackingResult.status === 'completed' && !trackingResult.handedOverAt && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: 14,
                      borderRadius: 'var(--radius-sm)',
                      color: '#166534',
                    }}
                  >
                    <strong>Perangkat Siap Diambil!</strong>
                    <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
                      Perbaikan telah selesai dan lolos uji kendali mutu. Silakan datang ke tempat
                      servis dengan membawa tanda terima unit.
                    </p>
                  </div>
                )}

                {/* Public Timeline */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--navy-950)', marginBottom: 8 }}>
                    Perjalanan Pengerjaan Unit
                  </h3>
                  <TicketTimeline timeline={trackingResult.timeline} />
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <ButtonLink to={portalPath} variant="secondary">
              Portal Pelanggan
            </ButtonLink>
          </div>
        </div>
      </main>
      <footer className={styles.trackingFooter}>
        © {new Date().getFullYear()} URT — Your Service Tracker
      </footer>
    </div>
  );
}
