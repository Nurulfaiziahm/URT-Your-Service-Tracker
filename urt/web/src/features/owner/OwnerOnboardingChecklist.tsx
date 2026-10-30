import { useState } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useGetServicesQuery } from '../services/servicesApi';
import type { OwnerDashboardData } from '../dashboard/types';
import { Icon } from '../../components/ui/Icon';
import styles from './OwnerOnboardingChecklist.module.css';

interface OwnerOnboardingChecklistProps {
  data: OwnerDashboardData;
}

export function OwnerOnboardingChecklist({ data }: OwnerOnboardingChecklistProps) {
  const user = useAppSelector(selectUser);
  const businessId = data.business.id;
  const storageKey = `urt_owner_onboarding_dismissed_${businessId}`;

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    return localStorage.getItem(storageKey) === 'true';
  });

  const { data: servicesData } = useGetServicesQuery(
    { businessId, limit: 1 },
    { skip: !businessId },
  );

  const servicesCount = servicesData?.data?.length ?? 0;
  const hasTickets =
    data.stats.activeTickets > 0 ||
    data.stats.completedTotal > 0 ||
    data.recentTickets.length > 0;
  const hasTechnicians = data.stats.activeTechnicians > 0;
  const isSubscriptionActive = data.subscription?.status === 'active';
  const isEmailVerified = Boolean(user?.isEmailVerified);

  const steps = [
    {
      id: 'profile',
      title: 'Daftarkan Profil Usaha',
      desc: `Tempat servis "${data.business.name}" telah dibuat.`,
      done: true,
      actionText: 'Kelola Pengaturan',
      actionTo: '/owner/settings',
    },
    {
      id: 'email',
      title: 'Verifikasi Email Pemilik',
      desc: isEmailVerified
        ? 'Alamat email usaha Anda telah terverifikasi.'
        : 'Verifikasi email untuk menerima pemberitahuan dan aktivasi sistem.',
      done: isEmailVerified,
      actionText: isEmailVerified ? 'Lihat Akun' : 'Verifikasi Akun',
      actionTo: '/owner/profile',
    },
    {
      id: 'services',
      title: 'Tambahkan Katalog Layanan Servis',
      desc:
        servicesCount > 0
          ? `${servicesCount} layanan servis telah terdaftar.`
          : 'Tentukan jenis perbaikan, durasi garansi, dan perkiraan biaya awal.',
      done: servicesCount > 0,
      actionText: servicesCount > 0 ? 'Lihat Layanan' : '+ Tambah Layanan Baru',
      actionTo: servicesCount > 0 ? '/owner/services' : '/owner/services/new',
    },
    {
      id: 'technicians',
      title: 'Undang Teknisi Servis',
      desc: hasTechnicians
        ? `${data.stats.activeTechnicians} teknisi aktif terhubung.`
        : 'Kirim undangan email ke teknisi untuk mulai mengelola antrean perbaikan.',
      done: hasTechnicians,
      actionText: hasTechnicians ? 'Daftar Teknisi' : '+ Undang Teknisi',
      actionTo: hasTechnicians ? '/owner/technicians' : '/owner/technicians/new',
    },
    {
      id: 'tickets',
      title: 'Catat Tiket Servis Pertama',
      desc: hasTickets
        ? 'Tiket servis operasional telah mulai diproses.'
        : 'Input tanda terima perangkat servis baru dari pelanggan yang datang.',
      done: hasTickets,
      actionText: hasTickets ? 'Buka Daftar Tiket' : '+ Buat Tiket Baru',
      actionTo: hasTickets ? '/owner/tickets' : '/owner/tickets/new',
    },
    {
      id: 'subscription',
      title: 'Pilih Paket Langganan URT',
      desc: isSubscriptionActive
        ? `Paket ${data.subscription?.planName || 'Aktif'} sedang berjalan.`
        : 'Aktifkan paket langganan untuk menjaga kesinambungan akses operasional.',
      done: isSubscriptionActive,
      actionText: isSubscriptionActive ? 'Detail Langganan' : 'Pilih Paket Servis',
      actionTo: '/owner/subscription',
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  function handleDismiss() {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  }

  function handleRestore() {
    setIsDismissed(false);
    localStorage.removeItem(storageKey);
  }

  if (isDismissed) {
    return (
      <div className={styles.minimizedBanner}>
        <span>
          Panduan langkah awal usaha: <strong>{completedCount} dari {totalCount} langkah selesai</strong> ({progressPercent}%)
        </span>
        <button type="button" className={styles.showBtn} onClick={handleRestore}>
          Buka Panduan Langkah Awal
        </button>
      </div>
    );
  }

  return (
    <section className={styles.card} aria-label="Panduan Langkah Awal Usaha">
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h2>
            <Icon name="grid" />
            Langkah Awal Memulai Operasi Servis
          </h2>
          <p>
            Selesaikan tahapan berikut agar alur penerimaan tiket, penugasan teknisi, dan layanan pelanggan Anda berjalan lancar.
          </p>
        </div>
        <button
          type="button"
          className={styles.dismissBtn}
          onClick={handleDismiss}
          title="Sembunyikan panduan ini"
        >
          Sembunyikan
        </button>
      </header>

      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <span>{completedCount} dari {totalCount} langkah selesai</span>
          <span>{progressPercent}%</span>
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className={styles.checklistGrid}>
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`${styles.item} ${step.done ? styles.itemDone : ''}`}
          >
            <div
              className={`${styles.itemIcon} ${
                step.done ? styles.iconDone : styles.iconPending
              }`}
            >
              {step.done ? '✓' : idx + 1}
            </div>
            <div className={styles.itemContent}>
              <h3 className={styles.itemTitle}>{step.title}</h3>
              <p className={styles.itemDesc}>{step.desc}</p>
              <Link to={step.actionTo} className={styles.itemAction}>
                {step.actionText}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
