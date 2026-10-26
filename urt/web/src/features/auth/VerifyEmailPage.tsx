import { useState, useEffect, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from './authSlice';
import { useVerifyEmailMutation, useResendVerificationMutation } from './authApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Auth.module.css';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = useAppSelector(selectUser);

  const queryEmail = new URLSearchParams(location.search).get('email');
  const initialEmail = currentUser?.email || queryEmail || '';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendOtp, { isLoading: isResending }] = useResendVerificationMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!otp.trim()) {
      setErrorMessage('Masukkan kode verifikasi yang Anda terima.');
      return;
    }

    try {
      await verifyEmail({ email: email.trim(), otp: otp.trim() }).unwrap();
      setSuccessMessage('Email Anda berhasil diverifikasi!');
      setTimeout(() => {
        navigate('/account/profile');
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error || apiErr.error || 'Kode verifikasi tidak valid atau telah kedaluwarsa.',
      );
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resendOtp({ email: email.trim() }).unwrap();
      setSuccessMessage('Kode verifikasi baru telah dikirim ke email Anda.');
      setCooldown(60);
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error || apiErr.error || 'Gagal mengirim ulang kode. Silakan coba lagi nanti.',
      );
    }
  }

  return (
    <div className={styles.form}>
      <header className={styles.heading}>
        <span className="eyebrow">Verifikasi Akun</span>
        <h1>Verifikasi Email</h1>
        <p>Masukkan 6 digit kode OTP yang kami kirimkan ke email Anda.</p>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}
      {successMessage && <InlineNotice>{successMessage}</InlineNotice>}

      <form onSubmit={handleVerify} className={styles.form} noValidate>
        <TextInput
          label="Alamat email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={Boolean(currentUser?.email)}
        />

        <TextInput
          label="Kode verifikasi (OTP)"
          name="otp"
          placeholder="6 digit kode angka"
          maxLength={6}
          required
          autoComplete="one-time-code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          hint="Periksa folder kotak masuk atau spam email Anda."
        />

        <Button type="submit" full pending={isVerifying}>
          Verifikasi Sekarang
        </Button>
      </form>

      <div className={styles.meta}>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || isResending}
          className="text-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {cooldown > 0 ? `Kirim ulang kode (${cooldown}s)` : 'Kirim ulang kode OTP'}
        </button>
      </div>

      <footer className={styles.links}>
        <ButtonLink to="/portal" variant="secondary" full>
          Kembali ke portal
        </ButtonLink>
      </footer>
    </div>
  );
}
