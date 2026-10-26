import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { Icon } from '../../components/ui/Icon';
import styles from './CustomerWelcomeOnboarding.module.css';

export function CustomerWelcomeOnboarding() {
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const [ticketCode, setTicketCode] = useState('');
  const [businessSlug, setBusinessSlug] = useState('');

  function handleTrackTicket(e: FormEvent) {
    e.preventDefault();
    const cleanCode = ticketCode.trim().toUpperCase();
    if (!cleanCode) return;
    navigate(`/tracking/${encodeURIComponent(cleanCode)}`);
  }

  function handleVisitBusiness(e: FormEvent) {
    e.preventDefault();
    let cleanSlug = businessSlug.trim().toLowerCase();
    if (!cleanSlug) return;
    // Strip leading /b/ or https domain if user pasted full url
    cleanSlug = cleanSlug.replace(/^.*\/b\//, '').replace(/^\/+/, '');
    navigate(`/b/${encodeURIComponent(cleanSlug)}`);
  }

  return (
    <main className={styles.container}>
      <header className={styles.heading}>
        <span className="eyebrow">PORTAL PELANGGAN</span>
        <h1>Selamat Datang, {user?.firstName || 'Pelanggan'}!</h1>
        <p>
          Akun Anda telah siap. Untuk mulai memantau perbaikan atau mengajukan servis, hubungkan akun Anda melalui salah satu opsi berikut:
        </p>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
            <Icon name="ticket" />
          </div>
          <div className={styles.cardContent}>
            <h2>Lacak Status Servis Perangkat</h2>
            <p>
              Punya tanda terima servis dari tempat servis? Masukkan kode tiket servis Anda (contoh: <code>#URT-2026-001</code>) untuk melihat perkembangan perbaikan secara langsung.
            </p>
          </div>
          <form className={styles.formRow} onSubmit={handleTrackTicket}>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Contoh: URT-2026-001"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              aria-label="Kode Tiket Servis"
              required
            />
            <button type="submit" className={styles.submitBtn}>
              Lacak Tiket →
            </button>
          </form>
        </article>

        <article className={styles.card}>
          <div className={`${styles.cardIcon} ${styles.iconGreen}`}>
            <Icon name="tool" />
          </div>
          <div className={styles.cardContent}>
            <h2>Kunjungi Tempat Servis Rekanan</h2>
            <p>
              Ingin mengajukan servis baru? Masukkan tautan (slug) atau nama tempat servis rekanan URT untuk membuka formulir pengajuan servis mandiri.
            </p>
          </div>
          <form className={styles.formRow} onSubmit={handleVisitBusiness}>
            <input
              type="text"
              className={styles.formInput}
              placeholder="Contoh: elektronik-jaya"
              value={businessSlug}
              onChange={(e) => setBusinessSlug(e.target.value)}
              aria-label="Tautan Tempat Servis"
              required
            />
            <button type="submit" className={`${styles.submitBtn} ${styles.submitBtnGreen}`}>
              Buka Halaman →
            </button>
          </form>
        </article>
      </div>

      <div className={styles.footerActions}>
        <Link to="/portal" className="text-link" style={{ fontSize: '0.9rem' }}>
          ← Pilih Portal Akses Lain
        </Link>
        <span style={{ color: '#cbd5e1' }}>•</span>
        <Link to="/" className="text-link" style={{ fontSize: '0.9rem' }}>
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
