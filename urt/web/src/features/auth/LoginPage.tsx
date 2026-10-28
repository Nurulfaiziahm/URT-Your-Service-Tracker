import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLoginMutation } from './authApi';
import { businessApi } from '../business/businessApi';
import { useAppDispatch } from '../../redux/hooks';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import logo from '../../assets/logo-urt.svg';
import styles from './LoginPage.module.css';

type IconName = 'email' | 'team' | 'chart' | 'shield' | 'lock' | 'eye' | 'eyeOff';

function LoginIcon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'email' ? (
        <>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </>
      ) : name === 'team' ? (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          <circle cx="9" cy="7" r="4" />
        </>
      ) : name === 'chart' ? (
        <>
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </>
      ) : name === 'lock' ? (
        <>
          <rect width="18" height="11" x="3" y="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
      ) : name === 'eye' ? (
        <>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : name === 'eyeOff' ? (
        <>
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20" />
        </>
      ) : (
        <>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fromLoc = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const isOwnerFlow =
    (location.state as { role?: string })?.role === 'owner' ||
    fromLoc?.pathname?.startsWith('/owner');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login({ email: email.trim(), password }).unwrap();

      if (fromLoc) {
        navigate(`${fromLoc.pathname || '/owner'}${fromLoc.search || ''}`, { replace: true });
        return;
      }

      if (isOwnerFlow) {
        navigate('/owner', { replace: true });
        return;
      }

      try {
        const busRes = await dispatch(
          businessApi.endpoints.getMyBusinesses.initiate(undefined, { forceRefetch: true }),
        ).unwrap();
        const businesses = busRes?.data?.businesses || [];
        if (businesses.some((b) => b.roles.includes('owner'))) {
          navigate('/owner', { replace: true });
          return;
        }
        if (businesses.some((b) => b.roles.includes('technician'))) {
          navigate('/technician', { replace: true });
          return;
        }
        if (businesses.some((b) => b.roles.includes('customer'))) {
          navigate('/customer', { replace: true });
          return;
        }
      } catch {
        /* Fallback if business query fails */
      }

      navigate('/owner', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Email atau kata sandi tidak cocok. Silakan coba lagi.',
      );
    }
  }

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>

      <div className={styles['login-layout']}>
        {/* Left Sidebar / Promo section */}
        <aside className={styles['login-sidebar']}>
          <div>
            <div className={styles['brand-badge']}>
              <Link to="/" className={styles['site-header__brand']} aria-label="URT Beranda">
                <img src={logo} alt="URT Logo" className={styles['brand-logo-img']} />
              </Link>
              <div className={styles['brand-text-wrap']}>
                <div className={styles['brand-name']}>Your Service Tracker</div>
                <div className={styles['brand-sub']}>UNTUK PEMILIK USAHA</div>
              </div>
            </div>

            <div className={styles['sidebar-badge']}>PEMILIK USAHA</div>

            <h1 className={styles['sidebar-title']}>
              Bangun operasi servis
              <br />
              yang lebih rapi.
            </h1>

            <p className={styles['sidebar-desc']}>
              Satu sistem untuk mengelola tempat servis, teknisi, dan pelanggan.
            </p>

            <div className={styles['feature-list']}>
              {(
                [
                  [
                    'email',
                    'Kelola servis dari satu tempat',
                    'Pantau tiket, estimasi, dan progres pekerjaan secara real-time.',
                  ],
                  [
                    'team',
                    'Hubungkan seluruh tim',
                    'Atur teknisi dan pelanggan dalam satu alur kerja yang terhubung.',
                  ],
                  [
                    'chart',
                    'Keputusan berbasis data',
                    'Lihat performa layanan dan kesehatan operasional usaha.',
                  ],
                ] as const
              ).map(([icon, title, description]) => (
                <div key={icon} className={styles['feature-item']}>
                  <div className={styles['feature-icon-box']}>
                    <LoginIcon name={icon} size={20} />
                  </div>
                  <div>
                    <h4>{title}</h4>
                    <p>{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles['sidebar-bottom-info']}>
            <LoginIcon name="shield" size={20} />
            <span>
              Satu akun untuk terhubung dengan tempat servis. Akses portal disesuaikan dengan peran
              Anda.
            </span>
          </div>
        </aside>

        {/* Right Main Content */}
        <main id="main-content" tabIndex={-1} className={styles['login-main']}>
          <header className={styles['login-topbar']}>
            <div className={styles['topbar-link-wrap']}>
              Belum punya akun?{' '}
              <Link
                to="/owner/register"
                state={location.state}
                className={styles['topbar-link']}
              >
                Daftar sekarang
              </Link>
            </div>
          </header>

          <div className={styles['login-content']}>
            <section className={styles['login-card']} aria-labelledby="login-title">
              <header className={styles['card-header']}>
                <img src={logo} alt="URT" className={styles['card-logo']} />
                <span className={styles['card-eyebrow']}>PORTAL PEMILIK USAHA</span>
                <h2 id="login-title" className={styles['card-title']}>
                  Masuk ke URT
                </h2>
                <p className={styles['card-subtitle']}>
                  Satu akun untuk terhubung dengan tempat servis, teknisi, dan pelanggan.
                </p>
              </header>

              {errorMessage && (
                <div className={styles.errorNotice}>
                  <InlineNotice>{errorMessage}</InlineNotice>
                </div>
              )}

              <form className={styles['login-form']} onSubmit={handleSubmit} noValidate>
                <div className={styles['form-group']}>
                  <label className={styles['form-label']} htmlFor="loginEmail">
                    Alamat email
                  </label>
                  <div className={styles['input-container']}>
                    <span className={styles['input-icon-left']}>
                      <LoginIcon name="email" />
                    </span>
                    <input
                      id="loginEmail"
                      name="email"
                      type="email"
                      className={styles['form-control']}
                      placeholder="nama@email.com"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles['form-group']}>
                  <label className={styles['form-label']} htmlFor="loginPassword">
                    Kata sandi
                  </label>
                  <div className={styles['input-container']}>
                    <span className={styles['input-icon-left']}>
                      <LoginIcon name="lock" />
                    </span>
                    <input
                      id="loginPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${styles['form-control']} ${styles.passwordInput}`}
                      placeholder="Masukkan kata sandi"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles['toggle-password']}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      aria-pressed={showPassword}
                      aria-controls="loginPassword"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <LoginIcon name={showPassword ? 'eyeOff' : 'eye'} />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles['btn-primary']}
                  disabled={isLoading}
                  aria-busy={isLoading || undefined}
                >
                  {isLoading ? 'Masuk ke akun…' : 'Masuk ke akun'}
                </button>

                <div className={styles['forgot-link-wrap']}>
                  <Link to="/forgot-password" className={styles['forgot-link']}>
                    Lupa kata sandi?
                  </Link>
                </div>

                <div className={styles['mobile-register-link']}>
                  Belum punya akun?{' '}
                  <Link
                    to="/owner/register"
                    state={location.state}
                    className={styles['topbar-link']}
                  >
                    Daftar sekarang
                  </Link>
                </div>

                <nav className={styles['legal-links']} aria-label="Informasi layanan">
                  <Link to="/privacy">Privasi</Link>
                  <span> · </span>
                  <Link to="/terms">Ketentuan</Link>
                </nav>
              </form>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
