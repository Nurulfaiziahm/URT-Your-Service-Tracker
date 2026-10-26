import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useLoginMutation } from './authApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fromLoc = (location.state as { from?: { pathname?: string; search?: string } })?.from;
  const targetPath = fromLoc ? `${fromLoc.pathname || '/portal'}${fromLoc.search || ''}` : '/portal';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await login({ email: email.trim(), password }).unwrap();
      navigate(targetPath, { replace: true });
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
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <header className={styles.heading}>
        <span className="eyebrow">Akses portal</span>
        <h1>Masuk ke URT</h1>
        <p>Satu akun untuk terhubung dengan tempat servis, teknisi, dan pelanggan.</p>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <TextInput
        label="Alamat email"
        name="email"
        type="email"
        placeholder="nama@email.com"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <TextInput
        label="Kata sandi"
        name="password"
        type="password"
        placeholder="Masukkan kata sandi"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className={styles.meta}>
        <Link to="/forgot-password" className="text-link">
          Lupa kata sandi?
        </Link>
      </div>

      <Button type="submit" full pending={isLoading}>
        Masuk ke akun
      </Button>

      <footer className={styles.links}>
        <span>
          Belum punya akun?{' '}
          <Link to="/register" state={location.state} className="text-link">
            Daftar sekarang
          </Link>
        </span>
        <span>
          Ingin membuka tempat servis?{' '}
          <Link to="/owner/register" state={location.state} className="text-link">
            Daftar sebagai pemilik
          </Link>
        </span>
      </footer>
    </form>
  );
}
