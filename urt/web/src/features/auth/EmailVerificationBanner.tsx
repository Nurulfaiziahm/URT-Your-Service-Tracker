import { useState, useEffect, type FormEvent } from 'react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectUser, profileUpdated } from './authSlice';
import { useVerifyEmailMutation, useResendVerificationMutation } from './authApi';
import { toastAdded } from '../../components/feedback/toastSlice';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import { Icon } from '../../components/ui/Icon';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './EmailVerificationBanner.module.css';

export function EmailVerificationBanner() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const [isOpen, setIsOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!user || user.isEmailVerified) {
    return null;
  }

  async function handleResend() {
    if (!user?.email || cooldown > 0 || isResending) return;
    setErrorMessage(null);
    try {
      await resendVerification({ email: user.email }).unwrap();
      setCooldown(60);
      dispatch(
        toastAdded({
          type: 'success',
          message: 'Kode verifikasi 6 digit baru telah dikirim ke email Anda.',
        }),
      );
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      dispatch(
        toastAdded({
          type: 'error',
          message:
            apiErr.data?.error ||
            apiErr.error ||
            'Gagal mengirim ulang kode OTP. Silakan coba lagi.',
        }),
      );
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!user?.email || !otp.trim()) {
      setErrorMessage('Masukkan 6 digit kode OTP yang diterima.');
      return;
    }
    setErrorMessage(null);
    try {
      await verifyEmail({ email: user.email, otp: otp.trim() }).unwrap();
      dispatch(profileUpdated({ ...user, isEmailVerified: true }));
      dispatch(
        toastAdded({
          type: 'success',
          message: 'Email Anda berhasil diverifikasi!',
        }),
      );
      setIsOpen(false);
      setOtp('');
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Kode OTP tidak valid atau telah kedaluwarsa.',
      );
    }
  }

  return (
    <>
      <div className={styles.banner} role="status">
        <div className={styles.bannerContent}>
          <span className={styles.bannerIcon}>
            <Icon name="clock" />
          </span>
          <span className={styles.bannerText}>
            Alamat email <strong>{user.email}</strong> belum diverifikasi. Verifikasi sekarang untuk
            menerima update tiket & aktivasi fitur penuh.
          </span>
        </div>
        <div className={styles.bannerActions}>
          <button
            type="button"
            className={styles.verifyBtn}
            onClick={() => {
              setErrorMessage(null);
              setIsOpen(true);
            }}
          >
            Verifikasi Sekarang
          </button>
          <button
            type="button"
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
          >
            {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang Kode'}
          </button>
        </div>
      </div>

      {isOpen && (
        <Modal onClose={() => setIsOpen(false)} label="Verifikasi Email">
          <form className={styles.modalCard} onSubmit={handleVerify}>
            <div className={styles.modalHeader}>
              <h2>Verifikasi Alamat Email</h2>
              <p>
                Masukkan 6 digit kode OTP yang dikirimkan ke <strong>{user.email}</strong>.
              </p>
            </div>

            {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

            <TextInput
              label="Kode Verifikasi (OTP)"
              name="otp"
              placeholder="6 digit angka"
              maxLength={6}
              autoFocus
              required
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              hint="Periksa folder kotak masuk atau spam email Anda."
            />

            <div className={styles.modalActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isVerifying}
              >
                Batal
              </Button>
              <Button type="submit" pending={isVerifying} disabled={otp.length < 6}>
                Verifikasi OTP
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
