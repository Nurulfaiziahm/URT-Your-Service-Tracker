import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useVerifyResetOtpMutation, useResetPasswordMutation } from './authApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Auth.module.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const stateEmail = (location.state as { email?: string })?.email || '';

  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState(stateEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyResetOtpMutation();
  const [submitReset, { isLoading: isResetting }] = useResetPasswordMutation();

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !otp.trim()) {
      setErrorMessage('Email dan kode verifikasi wajib diisi.');
      return;
    }

    try {
      const res = await verifyOtp({ email: email.trim().toLowerCase(), otp: otp.trim() }).unwrap();
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
        setStep('password');
      } else {
        setErrorMessage('Gagal memverifikasi kode OTP.');
      }
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error || apiErr.error || 'Kode verifikasi salah atau telah kedaluwarsa.',
      );
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetToken) {
      setErrorMessage('Sesi verifikasi hilang. Silakan masukkan ulang kode OTP.');
      setStep('otp');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      await submitReset({
        resetToken,
        password,
        confirmPassword,
      }).unwrap();

      navigate('/login', {
        state: { message: 'Kata sandi berhasil diatur ulang. Silakan masuk dengan kata sandi baru.' },
        replace: true,
      });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error || apiErr.error || 'Gagal mengatur ulang kata sandi. Silakan coba lagi.',
      );
    }
  }

  return (
    <div className={styles.form}>
      <header className={styles.heading}>
        <span className="eyebrow">Atur Ulang Sandi</span>
        <h1>{step === 'otp' ? 'Masukkan Kode OTP' : 'Buat Kata Sandi Baru'}</h1>
        <p>
          {step === 'otp'
            ? 'Masukkan kode verifikasi yang dikirimkan ke alamat email Anda.'
            : 'Masukkan kata sandi baru untuk akun URT Anda.'}
        </p>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      {step === 'otp' ? (
        <form onSubmit={handleVerifyOtp} className={styles.form} noValidate>
          <TextInput
            label="Alamat email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextInput
            label="Kode verifikasi (OTP)"
            name="otp"
            placeholder="6 digit kode"
            maxLength={6}
            required
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          />

          <Button type="submit" full pending={isVerifyingOtp}>
            Lanjutkan ke Kata Sandi Baru
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className={styles.form} noValidate>
          <TextInput
            label="Kata sandi baru"
            name="password"
            type="password"
            placeholder="Minimal 6 karakter"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextInput
            label="Konfirmasi kata sandi baru"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi kata sandi baru"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <Button type="submit" full pending={isResetting}>
            Simpan Kata Sandi Baru
          </Button>
        </form>
      )}

      <footer className={styles.links}>
        <span>
          <Link to="/login" className="text-link">
            ← Kembali ke halaman masuk
          </Link>
        </span>
      </footer>
    </div>
  );
}
