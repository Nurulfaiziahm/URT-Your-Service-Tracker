import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useRegisterMutation } from './authApi';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import logo from '../../assets/logo-urt.svg';
import styles from './RegisterPage.module.css';

type IconName = 'user' | 'phone' | 'email' | 'lock' | 'eye' | 'team' | 'chart' | 'shield';

function RegisterIcon({ name, size = 18 }: { name: IconName; size?: number }) {
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
      {name === 'user' ? (
        <>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      ) : name === 'team' ? (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          <circle cx="9" cy="7" r="4" />
        </>
      ) : name === 'email' ? (
        <>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </>
      ) : name === 'phone' ? (
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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
      ) : name === 'chart' ? (
        <>
          <path d="M18 20V10M12 20V4M6 20v-6" />
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

function RegisterField({
  label,
  icon,
  type = 'text',
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; icon: IconName }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className={styles['form-group']}>
      <label className={styles['form-label']} htmlFor={id}>
        {label}
      </label>
      <div className={styles['input-container']}>
        <span className={styles['input-icon-left']}>
          <RegisterIcon name={icon} />
        </span>
        <input
          {...props}
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={`${styles['form-control']} ${isPassword ? styles.passwordInput : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            className={styles['toggle-password']}
            aria-label={`${visible ? 'Sembunyikan' : 'Lihat'} ${label.toLowerCase()}`}
            aria-pressed={visible}
            aria-controls={id}
            onClick={() => setVisible(!visible)}
          >
            <RegisterIcon name="eye" />
          </button>
        )}
      </div>
      <div className={styles['field-error']} />
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isOwner = location.pathname.includes('owner');
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasInvitation = Boolean(
    searchParams.get('token') ||
      (location.state as { from?: { pathname?: string } })?.from?.pathname?.includes('invitations'),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    try {
      let formattedPhone = phone.trim().replace(/[\s()-]/g, '');
      if (formattedPhone && !formattedPhone.startsWith('+')) {
        formattedPhone = formattedPhone.startsWith('0')
          ? '+62' + formattedPhone.slice(1)
          : '+' + formattedPhone;
      }
      await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: formattedPhone || undefined,
      }).unwrap();

      const fromLoc = (location.state as { from?: { pathname?: string; search?: string } })?.from;
      const targetFrom = fromLoc ? `${fromLoc.pathname || ''}${fromLoc.search || ''}` : null;
      const inviteToken = searchParams.get('token');
      const inviteRole = searchParams.get('role');
      let fallbackInvite: string | null = null;
      if (inviteToken) {
        fallbackInvite =
          inviteRole === 'technician'
            ? `/invitations/technician?token=${encodeURIComponent(inviteToken)}`
            : `/invitations/customer?token=${encodeURIComponent(inviteToken)}`;
      }
      const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');

      const destination = isOwner
        ? '/owner/onboarding'
        : targetFrom || fallbackInvite || returnUrl || '/portal';

      navigate(destination, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Pendaftaran akun gagal. Silakan periksa kembali data Anda.',
      );
    }
  }

  const form = (
    <form onSubmit={handleSubmit}>
      <div className={styles['form-grid-2']}>
        <RegisterField
          id="firstName"
          name="firstName"
          label="Nama Depan"
          icon="user"
          placeholder="Nama depan Anda"
          autoComplete="given-name"
          required
          minLength={2}
          maxLength={50}
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <RegisterField
          id="lastName"
          name="lastName"
          label="Nama Belakang"
          icon="user"
          placeholder="Nama belakang Anda"
          autoComplete="family-name"
          required
          minLength={2}
          maxLength={50}
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>
      <div className={styles['form-grid-2']}>
        <RegisterField
          id="phone"
          name="phone"
          type="tel"
          label="Nomor WhatsApp (opsional)"
          icon="phone"
          placeholder="08xx xxxx xxxx"
          autoComplete="tel"
          maxLength={30}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <RegisterField
          id="email"
          name="email"
          type="email"
          label="Email"
          icon="email"
          placeholder="nama@usaha.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className={styles['form-grid-2']}>
        <RegisterField
          id="password"
          name="password"
          type="password"
          label="Kata Sandi"
          icon="lock"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={128}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <RegisterField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Konfirmasi Kata Sandi"
          icon="lock"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={128}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      <div className={styles['checkbox-group']}>
        <input type="checkbox" id="termsCheckbox" required />
        <label htmlFor="termsCheckbox">
          Saya menyetujui <Link to="/terms">Syarat Penggunaan</Link> dan{' '}
          <Link to="/privacy">Kebijakan Privasi</Link> URT.
        </label>
      </div>
      <button
        type="submit"
        className={styles['btn-primary']}
        disabled={isLoading}
        aria-busy={isLoading || undefined}
      >
        {isLoading ? 'Mendaftarkan akun…' : 'Daftar akun sekarang →'}
      </button>
    </form>
  );
  if (!isOwner)
    return (
      <div className={`${styles.page} ${styles.customerPage}`}>
        <a className="skip-link" href="#main-content">
          Lewati ke konten utama
        </a>
        <main id="main-content" className={styles.customerCard} tabIndex={-1}>
          <header className={styles.customerHeader}>
            <Link to="/">
              <img src={logo} alt="URT" />
            </Link>
            <div>
              <span className={styles.customerBadge}>PELANGGAN</span>
            </div>
            <h1>Buat Akun Pelanggan</h1>
            <p>Daftar untuk melacak servis dan menyetujui estimasi biaya dengan mudah.</p>
          </header>
          {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}
          {form}
          <p className={styles.customerLinks}>
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>
          <Link className={styles.customerBack} to="/">
            ← Kembali ke Beranda
          </Link>
        </main>
      </div>
    );

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <div className={styles['register-layout']}>
        <aside className={styles['register-sidebar']}>
          <div>
            <div className={styles['brand-badge']}>
              <Link to="/" className={styles['site-header__brand']} aria-label="URT Beranda">
                <img src={logo} alt="URT Logo" className={styles['brand-logo-img']} />
              </Link>
              <div className={styles['brand-text-wrap']}>
                <div className={styles['brand-name']}>Your Service Tracker</div>
                <div className={styles['brand-sub']}>
                  {isOwner ? 'UNTUK PEMILIK USAHA' : 'AKUN URT'}
                </div>
              </div>
            </div>
            <div className={styles['sidebar-badge']}>{isOwner ? 'PEMILIK USAHA' : 'AKUN BARU'}</div>
            <h1 className={styles['sidebar-title']}>
              Bangun operasi servis
              <br />
              yang lebih rapi.
            </h1>
            <p className={styles['sidebar-desc']}>
              Daftarkan akun Anda untuk terhubung dengan usaha servis, teknisi, pelanggan, dan
              layanan dalam satu sistem.
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
                    <RegisterIcon name={icon} size={20} />
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
            <RegisterIcon name="shield" size={20} />
            <span>
              Satu akun untuk terhubung dengan tempat servis. Akses portal disesuaikan dengan peran
              Anda.
            </span>
          </div>
        </aside>
        <main id="main-content" tabIndex={-1} className={styles['register-main']}>
          <header className={styles['register-topbar']}>
            <nav className={styles.stepper} aria-label="Tahapan pendaftaran">
              <div className={`${styles['step-item']} ${styles.active}`} aria-current="step">
                <span className={styles['step-num']}>1</span>
                <span>Data Akun</span>
              </div>
              <div className={styles['stepper-line']} aria-hidden="true" />
              <div className={styles['step-item']}>
                <span className={styles['step-num']}>2</span>
                <span>{isOwner ? 'Data Usaha' : 'Verifikasi'}</span>
              </div>
              <div className={styles['stepper-line']} aria-hidden="true" />
              <div className={styles['step-item']}>
                <span className={styles['step-num']}>3</span>
                <span>Akses Portal</span>
              </div>
            </nav>
            <div className={styles['login-link-wrap']}>
              Sudah punya akun? <Link to="/login" state={location.state}>Masuk</Link>
            </div>
          </header>
          <div className={styles['register-content']}>
            <section className={styles['register-card']} aria-labelledby="registration-title">
              <div className={styles['card-step-label']}>LANGKAH 1 DARI 3</div>
              <h2 id="registration-title" className={styles['card-heading']}>
                {isOwner ? 'Daftarkan akun pemilik' : 'Buat akun URT Anda'}
              </h2>
              <p className={styles['card-subheading']}>
                {isOwner
                  ? 'Buat akun pemilik untuk mulai mengelola tiket servis, teknisi, dan pelanggan.'
                  : hasInvitation
                    ? 'Daftar untuk menghubungkan akun Anda dan menerima undangan akses tempat servis.'
                    : 'Daftar untuk memantau status servis, menyetujui estimasi biaya, dan melihat riwayat perbaikan Anda.'}
              </p>
              {errorMessage && (
                <div className={styles.errorNotice}>
                  <InlineNotice>{errorMessage}</InlineNotice>
                </div>
              )}
              {form}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
