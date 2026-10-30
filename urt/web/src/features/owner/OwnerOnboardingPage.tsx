import logo from '../../assets/logo-urt.svg';
import registrationStyles from '../auth/RegisterPage.module.css';
import { Icon } from '../../components/ui/Icon';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppDispatch } from '../../redux/hooks';
import { useCreateBusinessMutation } from '../business/businessApi';
import { selectBusiness } from '../business/businessSlice';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { InlineNotice } from '../../components/feedback/Feedback';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from '../business/Business.module.css';

export default function OwnerOnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [createBusiness, { isLoading }] = useCreateBusinessMutation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('Senin - Sabtu 09:00 - 18:00');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleNameChange(val: string) {
    setName(val);
    // Auto-generate slug suggestion if slug hasn't been manually heavily edited
    const suggestedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(suggestedSlug);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setErrorMessage(
        'Format tautan (slug) tidak valid. Gunakan huruf kecil, angka, dan tanda hubung (-).',
      );
      return;
    }

    try {
      const res = await createBusiness({
        name: name.trim(),
        slug: cleanSlug,
        phone: phone.trim() || undefined,
        contactEmail: contactEmail.trim().toLowerCase() || undefined,
        address: address.trim() || undefined,
        businessHours: businessHours.trim() || undefined,
        timezone: timezone.trim() || 'Asia/Jakarta',
        currency: 'IDR',
      }).unwrap();

      const created = res.data.business;
      dispatch(selectBusiness({ businessId: created.id, portal: 'owner' }));
      navigate('/owner', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as { data?: ApiErrorBody; error?: string };
      setErrorMessage(
        apiErr.data?.error ||
          apiErr.error ||
          'Gagal mendaftarkan tempat servis. Pastikan tautan (slug) belum digunakan tempat servis lain.',
      );
    }
  }

  return (
    <div className={registrationStyles.page}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <div className={registrationStyles['register-layout']}>
        <aside className={registrationStyles['register-sidebar']}>
          <div>
            <div className={registrationStyles['brand-badge']}>
              <Link to="/">
                <img src={logo} alt="URT" className={registrationStyles['brand-logo-img']} />
              </Link>
              <div>
                <strong>Your Service Tracker</strong>
                <p>UNTUK PEMILIK USAHA</p>
              </div>
            </div>
            <div className={registrationStyles['sidebar-badge']}>PEMILIK USAHA</div>
            <h1 className={registrationStyles['sidebar-title']}>
              Bangun operasi servis
              <br />
              yang lebih rapi.
            </h1>
            <p className={registrationStyles['sidebar-desc']}>
              Hubungkan teknisi dan pelanggan dalam satu tempat. Kelola perjalanan servis dengan
              lebih mudah.
            </p>
            <div className={registrationStyles['feature-list']}>
              {(
                [
                  {
                    icon: 'ticket',
                    title: 'Kelola tiket servis',
                    text: 'Catat perangkat dan pantau setiap tahap perbaikan.',
                  },
                  {
                    icon: 'people',
                    title: 'Hubungkan seluruh tim',
                    text: 'Teknisi dan pelanggan terhubung dalam satu alur kerja.',
                  },
                  {
                    icon: 'chart',
                    title: 'Pantau performa usaha',
                    text: 'Lihat ringkasan dan laporan operasional.',
                  },
                ] as const
              ).map((feature) => (
                <div className={registrationStyles['feature-item']} key={feature.icon}>
                  <div className={registrationStyles['feature-icon-box']}>
                    <Icon name={feature.icon} />
                  </div>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p>URT — Your Service Tracker</p>
        </aside>
        <main id="main-content" tabIndex={-1} className={registrationStyles['register-main']}>
          <header className={registrationStyles['register-topbar']}>
            <nav className={registrationStyles.stepper} aria-label="Tahapan pendaftaran">
              <span className={registrationStyles['step-item']}>✓ Data Akun</span>
              <span className={registrationStyles['stepper-line']} />
              <span
                className={`${registrationStyles['step-item']} ${registrationStyles.active}`}
                aria-current="step"
              >
                2 Data Usaha
              </span>
              <span className={registrationStyles['stepper-line']} />
              <span className={registrationStyles['step-item']}>3 Akses Portal</span>
            </nav>
          </header>
          <div className={registrationStyles['register-content']}>
            <div className={styles.container}>
              <header className={styles.heading}>
                <span className="eyebrow">LANGKAH 2 DARI 3</span>
                <h1>Daftarkan Tempat Servis Anda</h1>
                <p>
                  Lengkapi informasi bisnis Anda untuk mulai mengelola tiket, teknisi, dan layanan.
                </p>
              </header>

              {errorMessage && <InlineNotice>{errorMessage}</InlineNotice>}

              <form
                className={`${styles.card} ${registrationStyles['onboarding-form-card']}`}
                onSubmit={handleSubmit}
              >
                <div className={styles.cardHeader}>
                  <h2>Identitas Bisnis</h2>
                  <p>
                    Informasi ini akan ditampilkan pada bukti servis dan halaman pelanggan Anda.
                  </p>
                </div>

                <div className={styles.row}>
                  <TextInput
                    label="Nama Tempat Servis"
                    name="name"
                    placeholder="Contoh: Service Center Elektronik Jaya"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                  />
                  <TextInput
                    label="Tautan Akses Publik (Slug)"
                    name="slug"
                    placeholder="contoh: elektronik-jaya"
                    required
                    hint="Akan menjadi tautan publik: /b/elektronik-jaya"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  />
                </div>

                <div className={styles.row}>
                  <TextInput
                    label="Nomor Telepon / WhatsApp Tempat Servis"
                    name="phone"
                    type="tel"
                    placeholder="08123456789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <TextInput
                    label="Email Kontak Bisnis"
                    name="contactEmail"
                    type="email"
                    placeholder="kontak@tokoservis.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <TextInput
                  label="Alamat Workshop / Toko"
                  name="address"
                  placeholder="Jl. Perintis Kemerdekaan No. 12, Jakarta"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div className={styles.row}>
                  <TextInput
                    label="Jam Operasional"
                    name="businessHours"
                    placeholder="Senin - Sabtu 09:00 - 18:00"
                    value={businessHours}
                    onChange={(e) => setBusinessHours(e.target.value)}
                  />
                  <TextInput
                    label="Zona Waktu Operasional"
                    name="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    hint="Contoh: Asia/Jakarta (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT)"
                  />
                </div>

                <div className="actions">
                  <Button type="submit" pending={isLoading}>
                    Simpan & Buka Portal Pemilik
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
