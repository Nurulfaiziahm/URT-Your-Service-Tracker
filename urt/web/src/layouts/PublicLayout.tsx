import { useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { authPortalFromPath } from '../features/auth/auth-routing';
import { useAppSelector } from '../redux/hooks';
import { selectUser, selectIsAuthenticated } from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';
import { Brand } from '../components/ui/Brand';
import { Button, ButtonLink } from '../components/ui/Button';
import styles from './PublicLayout.module.css';

export function PublicLayout() {
  const location = useLocation();
  const loginPortal = authPortalFromPath(location.pathname) || 'owner';
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <header
        className={styles.header}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            setOpen(false);
            toggle.current?.focus();
          }
        }}
      >
        <div className={`container ${styles.headerInner}`}>
          <Brand />
          <button
            ref={toggle}
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls="public-nav"
            onClick={() => setOpen(!open)}
            style={{ border: 0, background: 'transparent', padding: 12 }}
          >
            {open ? 'Tutup ✕' : 'Menu ☰'}
          </button>
          <nav
            id="public-nav"
            aria-label="Navigasi utama"
            className={`${styles.nav} ${open ? styles.navOpen : ''}`}
            onClick={() => setOpen(false)}
          >
            <Link to="/#alur-kerja">Alur kerja</Link>
            <Link to="/#peran">Tiga peran</Link>
            <Link to="/#layanan">Fitur</Link>
            <Link to="/tracking">Lacak servis</Link>
            <div className="actions">
              {isAuthenticated && user ? (
                <>
                  <ButtonLink to="/portal?auth=login" variant="secondary">
                    Portal
                  </ButtonLink>
                  <ButtonLink to="/account/profile" variant="ghost">
                    {user.firstName}
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    onClick={() => logout()}
                    pending={isLoggingOut}
                  >
                    Keluar
                  </Button>
                </>
              ) : (
                <>
                  <ButtonLink to={`/${loginPortal}/login`} state={{ from: location }} variant="secondary">
                    Masuk portal
                  </ButtonLink>
                  {loginPortal !== 'technician' && <ButtonLink to={`/${loginPortal}/register`} state={{ from: location }}>
                    {loginPortal === 'owner' ? 'Daftar tempat servis' : 'Buat Akun Pelanggan'}
                  </ButtonLink>}
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerTop}>
            <div>
              <Brand />
              <p>Satu alur yang jelas untuk setiap perjalanan servis.</p>
            </div>
            <nav className={styles.footerLinks} aria-label="Navigasi footer">
              <Link to="/#alur-kerja">Cara kerja</Link>
              <Link to="/tracking">Pelacakan</Link>
              <Link to="/privacy">Privasi</Link>
              <Link to="/terms">Syarat & ketentuan</Link>
            </nav>
          </div>
          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} URT — Your Service Tracker</span>
            <span>Dirancang untuk tempat servis Indonesia.</span>
          </div>
        </div>
      </footer>
    </>
  );
}

export function BackToHome() {
  return (
    <Button variant="ghost" onClick={() => window.location.assign('/')}>
      Kembali ke beranda
    </Button>
  );
}

