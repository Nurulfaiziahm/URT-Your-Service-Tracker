import { useState } from 'react';
import { useParams } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { selectSelectedBusinessId } from '../business/businessSlice';
import { useGetSubscriptionPaymentQuery, useConfirmDemoSubscriptionPaymentMutation } from '../subscription/subscriptionApi';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState, InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { toastAdded } from '../../components/feedback/toastSlice';
import type { ApiErrorBody } from '../../lib/api.types';
import { formatRupiah } from '../tickets/currency';
import styles from '../subscription/SubscriptionPayment.module.css';

const statusLabels = { pending: 'Menunggu konfirmasi', paid: 'Lunas', failed: 'Pembayaran gagal', expired: 'Kedaluwarsa' };
const formatDate = (value: string) => new Date(value).toLocaleString('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function OwnerSubscriptionPaymentPage() {
  const businessId = useAppSelector(selectSelectedBusinessId) || '';
  const { id = '' } = useParams();
  const dispatch = useAppDispatch();
  const { currentData: data, isLoading, isFetching, error, refetch } = useGetSubscriptionPaymentQuery(
    { businessId, paymentId: id }, { skip: !businessId || !id },
  );
  const [confirmPayment, { isLoading: confirming, data: confirmation }] = useConfirmDemoSubscriptionPaymentMutation();
  const [confirmationError, setConfirmationError] = useState('');
  const payment = confirmation?.data.payment.id === id ? confirmation.data.payment : data?.data.payment;
  const paid = payment?.status === 'paid';
  const pending = payment?.status === 'pending';
  const demoAvailable = data?.data.demoConfirmationAvailable;
  const instructions = data?.data.instructions.replace(/\\r\\n|\\n/g, '\n');

  async function confirm() {
    setConfirmationError('');
    try {
      await confirmPayment({ businessId, paymentId: id }).unwrap();
    } catch (err) {
      const result = err as { data?: ApiErrorBody };
      setConfirmationError(result.data?.error || 'Konfirmasi belum berhasil. Silakan coba lagi.');
    }
  }

  async function copyReference() {
    if (!payment) return;
    try {
      await navigator.clipboard.writeText(payment.reference);
      dispatch(toastAdded({ type: 'success', message: 'Nomor referensi berhasil disalin.' }));
    } catch {
      dispatch(toastAdded({ type: 'error', message: 'Referensi tidak dapat disalin. Pilih dan salin nomor pada invoice.' }));
    }
  }

  if (isLoading || !businessId) return <PageLoader />;
  if (!payment || error) return (
    <EmptyState title="Invoice belum dapat ditampilkan" description="Periksa tautan invoice dan tempat servis yang sedang dipilih."
      action={<Button onClick={() => refetch()} variant="secondary">Coba lagi</Button>} />
  );

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <ButtonLink to="/owner/subscription" variant="ghost" size="small">Langganan Saya</ButtonLink>
          <h1>Invoice Langganan</h1>
          <p>Rincian paket, pembayaran, dan aktivasi langganan URT.</p>
        </div>
        <Button variant="secondary" onClick={() => window.print()}><span className={styles.buttonLabel}><Icon name="print" /> Cetak Invoice</span></Button>
      </header>

      {paid && <section className={styles.success} role="status">
        <Icon name="circleCheck" width="28" height="28" />
        <div><strong>Pembayaran berhasil dikonfirmasi</strong><p>Invoice ini sudah lunas. Lihat paket dan masa aktif terbaru di halaman langganan.</p></div>
        <ButtonLink to="/owner/subscription" variant="success" size="small">Lihat Langganan</ButtonLink>
      </section>}

      <div className={styles.grid}>
        <article className={styles.invoice}>
          <div className={styles.invoiceHeader}>
            <div className={styles.brand}><span>URT</span><div><strong>Your Service Tracker</strong><small>INVOICE LANGGANAN</small></div></div>
            <StatusBadge label={statusLabels[payment.status]} tone={payment.status === 'paid' ? 'success' : payment.status === 'failed' || payment.status === 'expired' ? 'danger' : 'warning'} />
          </div>
          <div className={styles.reference}>
            <span>Nomor referensi</span>
            <div><strong>{payment.reference}</strong><button type="button" onClick={() => void copyReference()} aria-label="Salin nomor referensi"><Icon name="copy" /></button></div>
          </div>
          <dl className={styles.dates}>
            <div><dt>Tanggal invoice</dt><dd>{formatDate(payment.createdAt)}</dd></div>
            <div><dt>{paid ? 'Dikonfirmasi pada' : 'Berlaku sampai'}</dt><dd>{formatDate(payment.paidAt || payment.expiresAt)}</dd></div>
          </dl>
          <section className={styles.package}>
            <span className={styles.packageIcon}><Icon name="shield" width="24" height="24" /></span>
            <div><span>Paket pilihan Anda</span><h2>{payment.package.name}</h2><p>{payment.package.billingInterval === 'year' ? 'Langganan tahunan · 12 bulan' : 'Langganan bulanan · 1 bulan'}</p></div>
          </section>
          <ul className={styles.benefits}>
            <li><Icon name="check" /> Tiket servis tanpa batas</li>
            <li><Icon name="check" /> {payment.package.maxTechnicians == null ? 'Teknisi tanpa batas' : `Hingga ${payment.package.maxTechnicians} akun teknisi`}</li>
            <li><Icon name="check" /> Portal teknisi & pelanggan</li>
          </ul>
          <div className={styles.lineItem}><span>Harga paket</span><strong>{formatRupiah(payment.amount)}</strong></div>
          <div className={styles.total}><div><span>{paid ? 'Total dibayarkan' : 'Total pembayaran'}</span><small>{payment.currency} · {demoAvailable || payment.paymentMethod === 'demo' ? 'Simulasi pembayaran' : 'Pembayaran manual'}</small></div><strong>{formatRupiah(payment.amount)}</strong></div>
          <p className={styles.invoiceNote}>Simpan nomor referensi ini untuk memeriksa riwayat langganan Anda.</p>
        </article>

        <aside className={styles.paymentPanel}>
          <section className={styles.confirmCard}>
            <span className={styles.demoBadge}>{demoAvailable ? 'MODE PRESENTASI' : 'PEMBAYARAN MANUAL'}</span>
            <h2>{paid ? 'Paket siap digunakan' : pending ? 'Aktifkan paket Anda' : 'Invoice sudah ditutup'}</h2>
            <p>{paid ? 'Kelola tiket, teknisi, dan pelanggan dari dashboard pemilik.' : pending ? 'Konfirmasi invoice untuk melanjutkan aktivasi langganan.' : 'Pilih paket kembali untuk membuat invoice pembayaran baru.'}</p>
            <ol className={styles.steps}>
              <li data-complete="true"><span><Icon name="check" /></span><div><strong>Invoice dibuat</strong><small>Paket dan harga sudah tersimpan</small></div></li>
              <li data-complete={paid}><span>{paid ? <Icon name="check" /> : '2'}</span><div><strong>Konfirmasi pembayaran</strong><small>{paid ? 'Pembayaran sudah tercatat' : 'Selesaikan melalui tombol di bawah'}</small></div></li>
              <li data-complete={paid}><span>{paid ? <Icon name="check" /> : '3'}</span><div><strong>Langganan aktif</strong><small>Akses fitur sesuai paket pilihan</small></div></li>
            </ol>
            {pending && demoAvailable && <>
              <div className={styles.demoNotice}><Icon name="shield" /><p><strong>Khusus demonstrasi.</strong> Tombol ini mensimulasikan pembayaran dan langsung mengaktifkan paket. Tidak ada uang yang dipindahkan.</p></div>
              <Button full pending={confirming} onClick={() => void confirm()}><span className={styles.buttonLabel}><Icon name="check" /> Konfirmasi Pembayaran Demo</span></Button>
            </>}
            {pending && !demoAvailable && <InlineNotice>Gunakan instruksi pembayaran manual. Konfirmasi demo tidak tersedia di lingkungan ini.</InlineNotice>}
            {paid && <ButtonLink full to="/owner">Buka Dashboard</ButtonLink>}
            {!paid && !pending && <ButtonLink full to="/owner/subscription/plans">Pilih Paket Kembali</ButtonLink>}
            {confirmationError && <InlineNotice type="error">{confirmationError}</InlineNotice>}
            <Button variant="ghost" full pending={isFetching} disabled={confirming} onClick={() => void refetch()}>Periksa Status</Button>
          </section>
          {pending && instructions && <details className={styles.instructions}>
            <summary>Instruksi pembayaran manual</summary>
            <p>{instructions}</p>
          </details>}
          <p className={styles.help}><Icon name="clock" /> {paid ? 'Pembayaran tercatat dalam riwayat langganan.' : 'Invoice berlaku selama 24 jam sejak dibuat.'}</p>
        </aside>
      </div>
    </div>
  );
}
