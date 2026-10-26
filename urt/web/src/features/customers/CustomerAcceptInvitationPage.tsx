import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAcceptCustomerInvitationMutation } from './customersApi';
import { useVerifyEmailMutation, useResendVerificationMutation } from '../auth/authApi';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectUser, profileUpdated } from '../auth/authSlice';
import { selectBusiness } from '../business/businessSlice';
import { toastAdded } from '../../components/feedback/toastSlice';
import { Button, ButtonLink } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../business/Business.module.css';

export default function CustomerAcceptInvitationPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const user = useAppSelector(selectUser);

  const [token] = useState<string | null>(() => searchParams.get('token'));
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptCustomerInvitationMutation();
  const [verifyEmail, { isLoading: isVerifying }] = useVerifyEmailMutation();
  const [resendVerification, { isLoading: isResending }] = useResendVerificationMutation();

  const isEmailVerified = Boolean(user?.isEmailVerified);
  const isPending = isAccepting || isVerifying;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (searchParams.has('token')) {
      // Remove token from browser history / URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [searchParams]);

  async function handleResendOtp() {
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
      setErrorMessage(
        apiErr.data?.error || apiErr.error || 'Gagal mengirim ulang kode OTP.',
      );
    }
  }

  async function handleAccept() {
    if (!token) {
      setErrorMessage('Token klaim akun pelanggan tidak ditemukan.');
      return;
    }

    setErrorMessage(null);

    try {
      // If email is not yet verified, verify it first using the entered OTP
      if (!isEmailVerified) {
        if (!user?.email || !otp.trim() || otp.trim().length < 6) {
          setErrorMessage(
            'Masukkan 6 digit kode OTP yang dikirim ke email Anda sebelum mengklaim akun.',
          );
          return;
        }

        await verifyEmail({ email: user.email, otp: otp.trim() }).unwrap();
        dispatch(profileUpdated({ ...user, isEmailVerified: true }));
      }

      const res = await acceptInvitation({ token }).unwrap();
      const membership = res.data.membership;
      dispatch(selectBusiness({ businessId: membership.businessId, portal: 'customer' }));
      dispatch(
        toastAdded({
          type: 'success',
          message: 'Riwayat servis berhasil terhubung dengan akun Anda.',
        }),
      );
      navigate('/customer', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal menghubungkan akun. Pastikan kode OTP sesuai atau token klaim masih berlaku.',
      );
    }
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <span className="eyebrow">Hubungkan Akun</span>
        <h1>Klaim Riwayat Servis Pelanggan</h1>
        <p>Hubungkan riwayat servis perangkat Anda dengan akun URT.</p>
      </header>

      {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Konfirmasi Klaim Akun</h2>
          <p>
            Dengan menghubungkan kontak pelanggan Anda, semua tiket perbaikan dan status perangkat Anda akan dapat dipantau langsung melalui portal pelanggan.
          </p>
        </div>

        {!isEmailVerified && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
              <strong>Verifikasi Email Diperlukan</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                Masukkan 6 digit kode OTP yang kami kirimkan ke <strong>{user?.email}</strong> untuk mengaktifkan akun dan mengklaim riwayat servis.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <TextInput
                  label="Kode OTP (6 digit)"
                  name="otp"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div style={{ marginTop: '28px' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || isResending}
                >
                  {cooldown > 0 ? `Kirim Ulang (${cooldown}s)` : 'Kirim Ulang OTP'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="actions">
          <Button
            onClick={handleAccept}
            pending={isPending}
            disabled={!token || (!isEmailVerified && otp.length < 6)}
          >
            {!isEmailVerified ? 'Verifikasi & Buka Portal Pelanggan' : 'Klaim & Buka Portal Pelanggan'}
          </Button>
          <ButtonLink to="/portal" variant="secondary">
            Batal
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
