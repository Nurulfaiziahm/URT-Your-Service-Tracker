import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import {
  useChangePasswordMutation,
  useGetDevicesQuery,
  useRevokeDeviceMutation,
  useLogoutAllMutation,
  useDeleteAccountMutation,
} from '../auth/authApi';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Account.module.css';

export default function AccountSecurityPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const portal = location.pathname.split('/')[1];
  const profilePath = ['owner', 'technician', 'customer'].includes(portal)
    ? `/${portal}/profile`
    : '/account/profile';
  const securityPath = ['owner', 'technician', 'customer'].includes(portal)
    ? `/${portal}/security`
    : '/account/security';
  const user = useAppSelector(selectUser);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const { data: devicesData, isLoading: isLoadingDevices } = useGetDevicesQuery();
  const [revokeDevice, { isLoading: isRevoking }] = useRevokeDeviceMutation();
  const [logoutAll, { isLoading: isLoggingOutAll }] = useLogoutAllMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  const devices = devicesData?.data?.devices || [];
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'Kata sandi baru minimal 6 karakter.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }).unwrap();

      setPasswordNotice({
        type: 'success',
        text: 'Kata sandi berhasil diubah. Sesi perangkat lain telah otomatis dikeluarkan.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setPasswordNotice({
        type: 'error',
        text:
          apiErr.data?.error ||
          apiErr.error ||
          'Gagal mengubah kata sandi. Periksa kata sandi saat ini.',
      });
    }
  }

  async function handleRevoke(deviceId: string) {
    setSessionNotice('');
    try {
      await revokeDevice(deviceId).unwrap();
      setConfirmAction(null);
      setSessionNotice('Sesi perangkat berhasil dicabut.');
    } catch {
      setConfirmAction(null);
      setSessionNotice('Gagal mencabut sesi perangkat.');
    }
  }

  async function handleLogoutAll() {
    setSessionNotice('');
    try {
      await logoutAll().unwrap();
      setConfirmAction(null);
      setSessionNotice('Sesi perangkat lain berhasil dikeluarkan.');
    } catch {
      setConfirmAction(null);
      setSessionNotice('Gagal mengeluarkan sesi semua perangkat.');
    }
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteNotice('');
    try {
      await deleteAccount({
        confirmEmail: deleteEmail.trim().toLowerCase(),
        ...(user?.canChangePassword ? { currentPassword: deletePassword } : {}),
      }).unwrap();
      navigate('/portal?auth=login', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setDeleteNotice(
        apiErr.data?.error || apiErr.error || 'Gagal menghapus akun. Silakan coba lagi.',
      );
    }
  }

  const isCustomerShop = location.pathname.startsWith('/b/');
  const homePath = isCustomerShop
    ? location.pathname.split('/').slice(0, 4).join('/')
    : portal === 'customer'
      ? '/customer'
      : portal === 'owner'
        ? '/owner'
        : portal === 'technician'
          ? '/technician'
          : '/customer';

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <span className="eyebrow">Pengaturan Akun</span>
        <h1>Pengaturan Akun</h1>
        <p>Kelola profil pengguna, kata sandi, dan keamanan sesi akun Anda.</p>
      </header>

      <nav className={styles.nav} aria-label="Menu akun">
        <div className={styles.navTabs}>
          <Link to={profilePath} className={styles.navTab}>
            Profil Pengguna
          </Link>
          <Link to={securityPath} data-active={true} className={styles.navTab}>
            Keamanan &amp; Sesi
          </Link>
        </div>
        <Link to={homePath} className={styles.navHome}>
          &larr; Kembali ke Beranda
        </Link>
      </nav>

      {sessionNotice && <InlineNotice>{sessionNotice}</InlineNotice>}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction === 'all' ? 'Keluar dari Perangkat Lain' : 'Cabut Sesi Perangkat'}
          description={
            confirmAction === 'all'
              ? 'Semua perangkat lain harus masuk kembali untuk mengakses akun Anda.'
              : 'Perangkat ini harus masuk kembali untuk mengakses akun Anda.'
          }
          pending={isRevoking || isLoggingOutAll}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction === 'all') void handleLogoutAll();
            else void handleRevoke(confirmAction);
          }}
        />
      )}
      {/* Section 1: Change Password */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Ganti Kata Sandi</h2>
          <p>Ubah kata sandi secara berkala untuk menjaga keamanan akun Anda.</p>
        </div>

        {user && !user.canChangePassword ? (
          <InlineNotice>
            Akun ini terhubung melalui autentikasi pihak ketiga (Google) dan tidak memiliki kata
            sandi lokal.
          </InlineNotice>
        ) : (
          <form
            onSubmit={handleChangePassword}
            style={{ display: 'grid', gap: 'var(--space-4)' }}
            noValidate
          >
            {passwordNotice && <InlineNotice>{passwordNotice.text}</InlineNotice>}

            <TextInput
              label="Kata sandi saat ini"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <div className={styles.row}>
              <TextInput
                label="Kata sandi baru"
                name="newPassword"
                type="password"
                placeholder="Minimal 6 karakter"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <TextInput
                label="Konfirmasi kata sandi baru"
                name="confirmPassword"
                type="password"
                placeholder="Ulangi kata sandi"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="actions">
              <Button type="submit" pending={isChangingPassword}>
                Perbarui Kata Sandi
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Section 2: Active Devices */}
      <section className={styles.card}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div className={styles.cardHeader}>
            <h2>Sesi Perangkat Masuk</h2>
            <p>Daftar perangkat yang saat ini memiliki akses aktif ke akun Anda.</p>
          </div>
          {devices.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => setConfirmAction('all')}
              pending={isLoggingOutAll}
            >
              Keluarkan Semua Perangkat Lain
            </Button>
          )}
        </div>

        {isLoadingDevices ? (
          <PageLoader />
        ) : (
          <div className={styles.deviceList}>
            {devices.map((device) => (
              <div key={device.deviceId} className={styles.deviceItem}>
                <div className={styles.deviceInfo}>
                  <div className={styles.deviceName}>
                    <span>{device.deviceName || 'Perangkat Browser'}</span>
                    {device.isCurrent && <span className={styles.badgeCurrent}>Perangkat Ini</span>}
                  </div>
                  <div className={styles.deviceMeta}>
                    {device.browser} • {device.os} • IP: {device.ip}
                  </div>
                  <div className={styles.deviceMeta}>
                    Terakhir aktif: {new Date(device.lastSeen).toLocaleString('id-ID')}
                  </div>
                </div>

                {!device.isCurrent && (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmAction(device.deviceId)}
                    pending={isRevoking}
                  >
                    Cabut Akses
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {user && (
        <section className={`${styles.card} ${styles.dangerZone}`}>
          <div className={styles.cardHeader}>
            <h2>Hapus Akun</h2>
            <p>
              Akun akan dinonaktifkan dan data profil akan dianonimkan. Usaha yang Anda miliki juga
              akan dinonaktifkan; riwayat transaksi tetap disimpan.
            </p>
          </div>
          <details>
            <summary>Hapus akun saya</summary>
            <form onSubmit={handleDeleteAccount} className={styles.deleteAccountForm}>
              {deleteNotice && <InlineNotice>{deleteNotice}</InlineNotice>}
              <TextInput
                label={`Ketik email akun untuk konfirmasi (${user.email})`}
                name="confirmEmail"
                type="email"
                autoComplete="email"
                required
                value={deleteEmail}
                onChange={(event) => setDeleteEmail(event.target.value)}
              />
              {user.canChangePassword && (
                <TextInput
                  label="Kata sandi saat ini"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              )}
              <Button type="submit" variant="danger" pending={isDeletingAccount}>
                Hapus Akun Permanen
              </Button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
