import { Link } from 'react-router';
import logo from '../../assets/logo-urt.svg';
import { timelineActionLabel } from '../tickets/TicketTimeline';
import { useState, type FormEvent } from 'react';
import { useParams } from 'react-router';
import { useGetPublicTrackingMutation } from '../tickets/ticketsApi';
import type { PublicTrackingResult } from '../tickets/types';
import { TicketStatusBadge } from '../tickets/TicketStatusBadge';
import { ServiceStepper } from '../tickets/ServiceStepper';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './InfoPages.module.css';
import ticketStyles from '../tickets/Tickets.module.css';

export default function TrackingPage() {
  const { ticketCode: routeTicketCode } = useParams<{ ticketCode?: string }>();

  const [ticketCode, setTicketCode] = useState(routeTicketCode || '');
  const [businessSlug, setBusinessSlug] = useState('');
  const [trackingSecret, setTrackingSecret] = useState('');
  const [trackingResult, setTrackingResult] = useState<PublicTrackingResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [fetchTracking, { isLoading }] = useGetPublicTrackingMutation();

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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

  return (
    <div className={styles.trackingPage}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <nav className={styles.trackingNav} aria-label="Navigasi pelacakan">
        <Link to="/">
          <img src={logo} alt="URT" height="38" />
        </Link>
        <div className="actions">
          <Link to="/">← Kembali ke Beranda</Link>
          <ButtonLink to="/portal" size="small">
            Masuk Portal
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
                  <div className={ticketStyles.timeline}>
                    {trackingResult.timeline.map((ev, idx) => (
                      <div key={idx} className={ticketStyles.timelineItem}>
                        <div className={ticketStyles.timelineDot} />
                        <div className={ticketStyles.timelineAction}>
                          {timelineActionLabel(ev.action)}
                        </div>
                        <div className={ticketStyles.timelineMeta}>
                          {new Date(ev.timestamp).toLocaleString('id-ID')}
                        </div>
                        {ev.note && <div className={ticketStyles.timelineNote}>{ev.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <ButtonLink to="/" variant="secondary">
              ← Kembali ke Beranda
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
