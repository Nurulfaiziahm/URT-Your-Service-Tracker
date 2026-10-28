import { Link } from 'react-router';
import type { BusinessRole } from '../business/types';
import logo from '../../assets/logo-urt.svg';
import styles from './PortalSelectPage.module.css';

const roles = [
  {
    role: 'customer',
    theme: 'pelanggan',
    label: 'Pelanggan',
    title: 'Portal Pelanggan',
    description:
      'Pantau status perbaikan perangkat Anda, beri persetujuan biaya estimasi, dan ajukan tiket servis baru secara mandiri.',
    demo: 'Nino Rachimas (NR)',
    detail: 'Tiket: #URT-2026-001',
    href: '/demo/pelanggan/beranda-pelanggan.html',
  },
  {
    role: 'technician',
    theme: 'teknisi',
    label: 'Teknisi Servis',
    title: 'Portal Teknisi',
    description:
      'Kelola antrean tiket penugasan, input hasil diagnosis kerusakan, buat rincian estimasi biaya, dan catat penyelesaian QC.',
    demo: 'Sofia Malvalena Adam',
    detail: 'Spesialis: Laptop • Hardware',
    href: '/demo/teknisi/beranda-teknisi.html',
  },
  {
    role: 'owner',
    theme: 'owner',
    label: 'Pemilik Usaha',
    title: 'Portal Owner',
    description:
      'Pusat kendali tempat servis: pantau pendapatan, beban kerja teknisi, database pelanggan, dan manajemen paket langganan.',
    demo: 'Andi Ramadhan (ServisKita)',
    detail: 'Status: Paket Tahunan Aktif',
    href: '/demo/owner/beranda-owner.html',
  },
] as const;

function RoleIcon({ role }: { role: BusinessRole }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {role === 'customer' ? (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      ) : role === 'technician' ? (
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      ) : (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </>
      )}
    </svg>
  );
}

export default function PortalSelectPage() {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <div className={styles['portal-select-container']}>
        <header className={styles['portal-header']}>
          <Link to="/" className={styles['portal-header-logo']}>
            <img src={logo} alt="URT — Your Service Tracker" />
          </Link>
        </header>
        <main id="main-content" tabIndex={-1} className={styles['portal-content']}>
          <div className={styles['portal-title-area']}>
            <div className={styles.eyebrow}>PORTAL AKSES TERINTEGRASI</div>
            <h1>Jelajahi Demo URT</h1>
            <p>
              Lihat bagaimana URT bekerja dari sisi pemilik tempat servis, teknisi, dan pelanggan
              melalui demo interaktif.
            </p>
          </div>
          <div className={styles['portal-cards-grid']}>
            {roles.map((portal) => (
              <article className={styles['portal-card']} key={portal.role}>
                <div
                  className={`${styles['portal-card__icon']} ${styles[`icon-${portal.theme}`]}`}
                >
                  <RoleIcon role={portal.role} />
                </div>
                <div
                  className={`${styles['portal-card__role']} ${styles[`role-${portal.theme}`]}`}
                >
                  {portal.label}
                </div>
                <h2 className={styles['portal-card__title']}>{portal.title}</h2>
                <p className={styles['portal-card__desc']}>{portal.description}</p>
                <div className={styles['portal-card__demo-user']}>
                  <strong>Demo:</strong> {portal.demo}
                  <br />
                  <span className={styles.dim}>{portal.detail}</span>
                </div>
                <a
                  href={portal.href}
                  className={`${styles['portal-card__btn']} ${
                    portal.role === 'customer'
                      ? styles['portal-card__btn--green']
                      : portal.role === 'technician'
                        ? styles['portal-card__btn--amber']
                        : ''
                  }`}
                >
                  Masuk {portal.title} →
                </a>
              </article>
            ))}
          </div>
          <div className={styles.manualLogin} style={{ marginTop: '24px' }}>
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>
              ← Kembali ke Landing Page
            </Link>
          </div>
        </main>
        <footer className={styles['portal-footer']}>
          © 2026 URT — Your Service Tracker | Kelompok 2 UT. Hak cipta dilindungi.
        </footer>
      </div>
    </div>
  );
}

