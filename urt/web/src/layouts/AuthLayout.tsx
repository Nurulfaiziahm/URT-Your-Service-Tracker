import { Link, Outlet } from 'react-router';
import logo from '../assets/logo-urt.svg';
import styles from './AuthLayout.module.css';

export function AuthLayout({ showHomeLink = false }: { showHomeLink?: boolean }) {
  return (
    <div className={styles.layout}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <main id="main-content" className={styles.card} tabIndex={-1}>
        <Link to="/" className={styles.brand}>
          <img src={logo} alt="URT — Your Service Tracker" />
        </Link>
        <div className={styles.tagline}>YOUR SERVICE TRACKER</div>
        <Outlet />
        <nav className={styles.links} aria-label="Informasi layanan">
          {showHomeLink && <Link to="/">← Kembali ke beranda</Link>}
          <div>
            <Link to="/privacy">Privasi</Link>
            <span> · </span>
            <Link to="/terms">Ketentuan</Link>
          </div>
        </nav>
      </main>
    </div>
  );
}
