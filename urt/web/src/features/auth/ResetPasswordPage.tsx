import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useVerifyResetOtpMutation, useResetPasswordMutation } from './authApi';
import { sessionEnded } from './authSlice';
import { useAppDispatch } from '../../redux/hooks';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import type { AuthPortal } from './auth-routing';
import styles from './Auth.module.css';

export default function ResetPasswordPage({ portal }: { portal: AuthPortal }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  // Email links can update only the fragment while this route is already open.
  const resetToken = new URLSearchParams(location.hash.slice(1)).get('token') || verifiedToken;
  const step = resetToken ? 'password' : 'otp';
  const [email, setEmail] = useState((location.state as { email?: string })?.email || '');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [failure, setFailure] = useState('');
  const [complete, setComplete] = useState(false);
  const [verifyOtp, verification] = useVerifyResetOtpMutation();
  const [resetPassword, resetting] = useResetPasswordMutation();
  const loginPath = `/${portal}/login`;

  async function verify(event: FormEvent) {
    event.preventDefault(); setFailure('');
    if (verification.isLoading) return;
    try {
      const result = await verifyOtp({ portal, email: email.trim().toLowerCase(), otp }).unwrap();
      setVerifiedToken(result.data.resetToken);
    } catch (error) { setFailure((error as { data?: ApiErrorBody }).data?.error || 'Kode tidak valid atau sudah kedaluwarsa.'); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setFailure('');
    if (resetting.isLoading) return;
    if (!resetToken || password !== confirmPassword) { setFailure('Konfirmasi kata sandi tidak cocok.'); return; }
    try {
      await resetPassword({ portal, resetToken, password, confirmPassword }).unwrap();
      dispatch(sessionEnded());
      setPassword(''); setConfirmPassword(''); setVerifiedToken(null); setComplete(true);
      navigate(location.pathname, { replace: true });
    } catch (error) { setFailure((error as { data?: ApiErrorBody }).data?.error || 'Tautan tidak valid atau sudah kedaluwarsa. Minta email pemulihan baru.'); }
  }
  if (complete && !resetToken) return <section className={styles.form} aria-live="polite"><h1>Kata Sandi Berhasil Diperbarui</h1>
    <p>Silakan masuk menggunakan kata sandi baru Anda. Sesi sebelumnya sudah dinonaktifkan.</p>
    <ButtonLink to={loginPath}>Kembali ke Login</ButtonLink></section>;
  return <div className={styles.form}>
    <header className={styles.heading}><span className="eyebrow">Pemulihan {portal === 'owner' ? 'Pemilik Usaha' : portal === 'technician' ? 'Teknisi' : 'Pelanggan'}</span>
      <h1>{step === 'otp' ? 'Masukkan Kode Pemulihan' : 'Buat Kata Sandi Baru'}</h1>
      <p>{step === 'otp' ? 'Jika akun mendukung pemulihan pada portal ini, email berisi kode dan tautan akan dikirim. Masukkan kode 6 digit atau buka tautan di email Anda.' : 'Gunakan kata sandi baru untuk akun Anda. Tautan pemulihan hanya dapat dipakai sekali.'}</p></header>
    {failure && <InlineNotice type="error">{failure}</InlineNotice>}
    {step === 'otp' ? <form className={styles.form} onSubmit={verify}>
      <TextInput label="Alamat email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextInput label="Kode pemulihan (6 digit)" name="otp" required pattern="[0-9]{6}" minLength={6} maxLength={6} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} />
      <Button type="submit" pending={verification.isLoading}>Verifikasi Kode</Button>
    </form> : <form className={styles.form} onSubmit={save}>
      <TextInput label="Kata sandi baru" name="password" type="password" minLength={6} maxLength={128} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <TextInput label="Konfirmasi kata sandi" name="confirmPassword" type="password" minLength={6} maxLength={128} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      <Button type="submit" pending={resetting.isLoading}>Simpan Kata Sandi Baru</Button>
    </form>}
    <footer className={styles.links}><Link to={loginPath}>&larr; Kembali ke Login</Link><Link to={`/${portal}/forgot-password`}>Kirim kode dan tautan baru</Link></footer>
  </div>;
}
