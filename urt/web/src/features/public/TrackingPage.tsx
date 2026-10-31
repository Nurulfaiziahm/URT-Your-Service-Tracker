import { Link } from 'react-router';
import logo from '../../assets/logo-urt.svg';
import { TicketTimeline } from '../tickets/TicketTimeline';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useParams } from 'react-router';
import { useGetPublicTrackingMutation } from '../tickets/ticketsApi';
import type { PublicTrackingResult } from '../tickets/types';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { EstimateBreakdown } from '../tickets/EstimateBreakdown';
import type { EstimateRevision } from '../tickets/types';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './InfoPages.module.css';
import ticketStyles from '../tickets/Tickets.module.css';
import timingStyles from '../tickets/TicketTiming.module.css';
import { customerPortalPath } from '../customer/customer-portal';

function getTargetCompletionDate(): Date {
  const now = new Date();
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
  const { hash } = useLocation();
  const [access] = useState(() => new URLSearchParams(hash.slice(1)));
  const autoLookup = useRef(false);

  const cleanRoute = (routeTicketCode || '').trim().replace(/^#/, '').toUpperCase();
  const isDemoTicket = cleanRoute === 'URT-1024' || cleanRoute.includes('1024') || cleanRoute === 'URT-2026-123456' || cleanRoute === 'URT-2026-SNRM';
  const [isDemo, setIsDemo] = useState(isDemoTicket);
  const [targetDate, setTargetDate] = useState(getTargetCompletionDate);

  useEffect(() => {
    const clean = (routeTicketCode || '').trim().replace(/^#/, '').toUpperCase();
    if (clean === 'URT-1024' || clean.includes('1024') || clean === 'URT-2026-123456' || clean === 'URT-2026-SNRM') {
      setIsDemo(true);
    }
  }, [routeTicketCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTargetDate(getTargetCompletionDate());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [ticketCode, setTicketCode] = useState(routeTicketCode || '');
  const [businessSlug, setBusinessSlug] = useState(access.get('business') || '');
  const [trackingSecret, setTrackingSecret] = useState(access.get('access') || '');
  const [trackingResult, setTrackingResult] = useState<PublicTrackingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [fetchTracking, { isLoading }] = useGetPublicTrackingMutation();
  const portalPath = businessSlug.trim() ? customerPortalPath(businessSlug.trim()) : '/customer';

  useEffect(() => {
    const slug = access.get('business');
    const secret = access.get('access');
    if (autoLookup.current || !routeTicketCode || !slug || !secret) return;
    autoLookup.current = true;
    void fetchTracking({ businessSlug: slug, ticketCode: routeTicketCode, trackingSecret: secret }).unwrap()
      .then((response) => setTrackingResult(response.data))
      .catch(() => setErrorMessage('Status belum dapat dimuat. Coba lagi menggunakan informasi pelacakan yang sudah terisi.'));
  }, [access, fetchTracking, routeTicketCode]);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = ticketCode.trim().replace(/^#/, '').toUpperCase();
    if (clean === 'URT-1024' || clean.includes('1024') || clean === 'URT-2026-123456' || clean === 'URT-2026-SNRM') {
      setIsDemo(true);
      return;
    }

    if (!businessSlug.trim() || !ticketCode.trim() || !trackingSecret.trim()) {
      setErrorMessage(
        'Mohon lengkapi identitas tempat servis, kode tiket, dan kode akses rahasia.',
      );
      return;
    }

    try {
      const res = await fetchTracking({
        businessSlug: businessSlug.trim().toLowerCase(),
        ticketCode: ticketCode.trim().toUpperCase(),
        trackingSecret: trackingSecret.trim(),
      }).unwrap();

      setTrackingResult(res.data);
    } catch (err) {
      const apiErr = err as { data?: ApiErrorBody };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.data?.message ||
          'Tiket servis tidak ditemukan atau kode rahasia salah.',
      );
      setTrackingResult(null);
    }
  };

  const displayTicketCode = (cleanRoute || ticketCode.trim().replace(/^#/, '').toUpperCase()) || 'URT-1024';

  if (isDemo) {
    const demoEstimate: EstimateRevision = {
      version: 1,
      status: 'approved',
      currency: 'IDR',
      totalAmount: 250000,
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      repairDurationMinutes: 120,
      qcDurationMinutes: 30,
      targetCompletionDate: targetDate.toISOString(),
      decision: {
        decision: 'approved',
        decidedAt: new Date(Date.now() - 1800000).toISOString(),
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
          <ServiceStepper status="approved" />
          <section className="reference-panel">
            <h2>Jadwal Pengerjaan &amp; QC</h2>
            <dl className="reference-dl">
              <div>
                <dt>Estimasi pengerjaan</dt>
                <dd>2 jam</dd>
              </div>
              <div>
                <dt>Estimasi QC</dt>
                <dd>30 menit</dd>
              </div>
              <div>
                <dt>Target siap diambil</dt>
                <dd>
                  {targetDate.toLocaleString('id-ID', {
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
              Jadwal adalah estimasi. Teknisi mengonfirmasi pengerjaan selesai dan hasil QC secara terpisah.
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
              Nomor tiket dan kode akses unik menjaga informasi perkembangan servis perangkat Anda
              tetap terlindungi dan dapat diakses kapan saja.
            </p>
          </div>

          {errorMessage && <InlineNotice type="error">{errorMessage}</InlineNotice>}

          {/* Lookup Form */}
          {!trackingResult ? (
            <form onSubmit={handleLookup} className={styles.form}>
              <TextInput
                id="businessSlug"
                label="Kode / Slug Tempat Servis *"
                value={businessSlug}
                onChange={(e) => setBusinessSlug(e.target.value)}
                placeholder="Contoh: bengkel-jaya-servis"
                required
              />

              <TextInput
                id="ticketCode"
                label="Nomor / Kode Tiket *"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value)}
                placeholder="Contoh: SRV-202610-001"
                required
              />

              <TextInput
                id="trackingSecret"
                label="Kode Akses Rahasia Pelacakan *"
                type="password"
                value={trackingSecret}
                onChange={(e) => setTrackingSecret(e.target.value)}
                placeholder="Diberikan oleh tempat servis pada tanda terima"
                autoComplete="off"
                required
              />

              <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? 'Mencari Status Servis...' : 'Lacak Status Servis'}
              </Button>

              <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', margin: 0 }}>
                * Data pribadi seperti nomor kontak atau rincian internal dilindungi dan tidak
                ditampilkan ke publik.
              </p>
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
                    onClick={() => setTrackingResult(null)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    Lacak Tiket Lain
                  </Button>
                </div>

                {/* Progress Stepper */}
                <ServiceStepper status={trackingResult.status} />

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
