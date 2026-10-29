import { useState, type FormEvent } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { customerPortalPath } from '../customer/customer-portal';
import { useGetBusinessByIdQuery, useUpdateBusinessMutation } from '../business/businessApi';
import type { Business } from '../business/types';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../business/Business.module.css';

interface SettingsFormProps {
  business: Business;
}

function SettingsForm({ business }: SettingsFormProps) {
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();

  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone || '');
  const [contactEmail, setContactEmail] = useState(business.contactEmail || '');
  const [address, setAddress] = useState(business.address || '');
  const [businessHours, setBusinessHours] = useState(business.businessHours || '');
  const [timezone, setTimezone] = useState(business.timezone || 'Asia/Jakarta');

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const publicUrl = `${window.location.origin}${customerPortalPath(business.slug)}/services/new`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Tautan tidak dapat disalin. Silakan salin secara manual.',
      });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatusMessage(null);

    try {
      await updateBusiness({
        businessId: business.id,
        body: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          contactEmail: contactEmail.trim().toLowerCase() || undefined,
          address: address.trim() || undefined,
          businessHours: businessHours.trim() || undefined,
          timezone: timezone.trim() || undefined,
        },
      }).unwrap();

      setStatusMessage({ type: 'success', text: 'Pengaturan tempat servis berhasil diperbarui.' });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setStatusMessage({
        type: 'error',
        text: apiErr.data?.error || apiErr.error || 'Gagal menyimpan perubahan pengaturan.',
      });
    }
  }

  return (
    <>
      <div className={styles.publicLinkCard}>
        <div className={styles.publicLinkInfo}>
          <strong>Tautan Portal Pelanggan</strong>
          <span>{publicUrl}</span>
        </div>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? 'Tersalin! ✓' : 'Salin Tautan'}
        </Button>
      </div>

      {statusMessage && <InlineNotice>{statusMessage.text}</InlineNotice>}

      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardHeader}>
          <h2>Informasi Operasional</h2>
          <p>Ubah detail kontak, alamat, dan jam operasional servis Anda.</p>
        </div>

        <TextInput
          label="Nama Tempat Servis"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className={styles.row}>
          <TextInput
            label="Nomor Telepon / WhatsApp"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextInput
            label="Email Kontak Bisnis"
            name="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
        </div>

        <TextInput
          label="Alamat Workshop / Toko"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <div className={styles.row}>
          <TextInput
            label="Jam Operasional"
            name="businessHours"
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
          />
          <TextInput
            label="Zona Waktu"
            name="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>

        <div className="actions">
          <Button type="submit" pending={isUpdating}>
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </>
  );
}

export default function OwnerSettingsPage() {
  const businessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading, isError } = useGetBusinessByIdQuery(businessId || '', {
    skip: !businessId,
  });

  const business = data?.data?.business;

  if (isError)
    return <InlineNotice>Pengaturan tidak dapat dimuat. Silakan coba lagi.</InlineNotice>;
  if (isLoading || !business) {
    return <PageLoader />;
  }

  return (
    <div className={`container page-content ${styles.container}`}>
      <header className={styles.heading}>
        <span className="eyebrow">Pengaturan Tempat Servis</span>
        <h1>{business.name}</h1>
        <p>Kelola identitas dan tautan publik tempat servis Anda.</p>
      </header>

      <SettingsForm key={business.id} business={business} />
    </div>
  );
}
