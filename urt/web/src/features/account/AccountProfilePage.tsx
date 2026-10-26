import { TechnicianProfileSection } from '../technician/TechnicianProfileSection';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetMyBusinessesQuery } from '../business/businessApi';
import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useGetProfileQuery, useUpdateProfileMutation } from '../auth/authApi';
import type { User } from '../auth/types';
import { TextInput } from '../../components/ui/TextInput';
import { Button, ButtonLink } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './Account.module.css';

interface ProfileFormProps {
  user: User;
}

function ProfileForm({ user }: ProfileFormProps) {
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');
  const [address, setAddress] = useState(user.address || '');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatusMessage(null);

    let formattedPhone = phone.trim();
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+62' + formattedPhone.slice(1);
      } else {
        formattedPhone = '+' + formattedPhone;
      }
    }

    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: formattedPhone || null,
        address: address.trim() || null,
      }).unwrap();

      setStatusMessage({ type: 'success', text: 'Profil akun berhasil diperbarui.' });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setStatusMessage({
        type: 'error',
        text: apiErr.data?.error || apiErr.error || 'Gagal menyimpan perubahan profil.',
      });
    }
  }

  return (
    <>
      {statusMessage && <InlineNotice>{statusMessage.text}</InlineNotice>}

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardHeader}>
          <h2>Informasi Pribadi</h2>
          <p>Informasi ini digunakan pada tiket servis dan komunikasi perbaikan.</p>
        </div>

        <div className={styles.row}>
          <TextInput
            label="Nama depan"
            name="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextInput
            label="Nama belakang"
            name="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <TextInput
          label="Alamat email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint={
            user.isEmailVerified
              ? '✓ Email telah terverifikasi.'
              : 'Mengubah email akan memerlukan verifikasi ulang.'
          }
        />

        <TextInput
          label="Nomor telepon / WhatsApp"
          name="phone"
          type="tel"
          placeholder="08123456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint="Nomor untuk update notifikasi perbaikan perangkat."
        />

        <TextInput
          label="Alamat domisili"
          name="address"
          placeholder="Alamat lengkap (kota, provinsi)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className="actions">
          <Button type="submit" pending={isUpdating}>
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </>
  );
}

export default function AccountProfilePage() {
  const location = useLocation();
  const cachedUser = useAppSelector(selectUser);
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { data: memberships } = useGetMyBusinessesQuery();
  const business = memberships?.data.businesses.find((b) => b.businessId === businessId);
  const portal = location.pathname.split('/')[1];
  const roleLabel =
    portal === 'owner'
      ? 'Pemilik Usaha'
      : portal === 'technician'
        ? 'Teknisi'
        : portal === 'customer'
          ? 'Pelanggan'
          : 'Pengguna';
  const profilePath = ['owner', 'technician', 'customer'].includes(portal)
    ? `/${portal}/profile`
    : '/account/profile';
  const securityPath = ['owner', 'technician', 'customer'].includes(portal)
    ? `/${portal}/security`
    : '/account/security';
  const { data: profileData, isLoading: isFetchingProfile } = useGetProfileQuery();

  const user = profileData?.data?.user || cachedUser;

  if (isFetchingProfile && !user) {
    return <PageLoader />;
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <span className="eyebrow">Pengaturan Akun</span>
        <h1>Profil {roleLabel}</h1>
        <p>Kelola identitas utama Anda di platform URT.</p>
      </header>

      <nav className={styles.nav} aria-label="Menu akun">
        <Link to={profilePath} data-active={true}>
          Profil Pengguna
        </Link>
        <Link to={securityPath}>Keamanan & Sesi</Link>
        <Link to="/portal">Kembali ke Portal</Link>
      </nav>

      {user && !user.isEmailVerified && (
        <InlineNotice>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span>Email Anda ({user.email}) belum diverifikasi.</span>
            <ButtonLink
              to={`/verify-email?email=${encodeURIComponent(user.email)}`}
              variant="secondary"
            >
              Verifikasi Sekarang
            </ButtonLink>
          </div>
        </InlineNotice>
      )}

      {user ? (
        <div className={styles.profileColumns}>
          <aside className={styles.card}>
            <div className={styles.identity}>
              <span className={styles.profileAvatar}>
                {user.firstName[0]}
                {user.lastName[0]}
              </span>
              <h2>
                {user.firstName} {user.lastName}
              </h2>
              <span>{roleLabel}</span>
              <p>{user.email}</p>
              <span className={user.isEmailVerified ? styles.badgeSuccess : styles.badgeWarning}>
                {user.isEmailVerified ? 'Email Terverifikasi' : 'Email Belum Terverifikasi'}
              </span>
            </div>
            <dl className="reference-dl">
              <div>
                <dt>Bergabung Sejak</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString('id-ID')}</dd>
              </div>
              <div>
                <dt>Tempat Servis</dt>
                <dd>{business?.name || 'Belum terhubung'}</dd>
              </div>
            </dl>
            <ButtonLink to={securityPath} variant="secondary">
              Keamanan Akun
            </ButtonLink>
          </aside>
          <div className="reference-stack">
            <ProfileForm key={user.id} user={user} />
            {portal === 'technician' && businessId && (
              <TechnicianProfileSection businessId={businessId} />
            )}
          </div>
        </div>
      ) : (
        <InlineNotice>Data pengguna belum tersedia.</InlineNotice>
      )}
    </div>
  );
}
