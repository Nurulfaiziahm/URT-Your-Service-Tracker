import { useState } from 'react';
import { useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useGetMyBusinessesQuery, useGetPublicBusinessQuery } from '../business/businessApi';
import { useSubmitServiceRequestMutation } from '../tickets/ticketsApi';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { CustomerServiceForm } from './CustomerServiceForm';
import { customerPortalPath, useCustomerPortal } from './customer-portal';
import { serviceTrackingPath, type ServiceRequestInput, type ServiceRequestReceipt } from './service-request.types';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './CustomerServiceForm.module.css';

export default function CustomerNewServicePage() {
  const { businessSlug } = useParams();
  const portal = useCustomerPortal();
  const user = useAppSelector(selectUser);
  const membership = useGetMyBusinessesQuery(undefined, { skip: Boolean(businessSlug) || !portal.isAuthenticated });
  const slug = businessSlug || membership.currentData?.data.businesses.find((item) => item.businessId === portal.businessId)?.slug || '';
  const { currentData, isFetching, error, refetch } = useGetPublicBusinessQuery(slug, { skip: !slug });
  const [submitServiceRequest] = useSubmitServiceRequestMutation();
  const [receipt, setReceipt] = useState<ServiceRequestReceipt | null>(null);
  const [failure, setFailure] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [showAccountOffer, setShowAccountOffer] = useState(true);
  const business = currentData?.data.business;

  if ((isFetching && !currentData) || membership.isLoading) return <PageLoader />;
  if (!business || error) return <EmptyState title="Tempat servis belum dapat dimuat"
    description="Buka tautan atau pindai QR dari tempat servis tujuan Anda."
    action={slug ? <Button onClick={() => refetch()}>Coba lagi</Button> : <ButtonLink to="/portal">Kembali</ButtonLink>} />;

  const returnPath = `/b/${encodeURIComponent(business.slug)}/customer/services/new`;
  async function submit(input: ServiceRequestInput) {
    setFailure('');
    try {
      const result = await submitServiceRequest({ slug, body: input }).unwrap();
      setReceipt(result.data);
    } catch (error) {
      const response = error as { data?: ApiErrorBody };
      setFailure(response.data?.error || 'Layanan belum dapat menerima pengajuan. Silakan coba lagi.');
      throw error;
    }
  }

  if (receipt) {
    const trackingPath = serviceTrackingPath(receipt);
    return <div className={styles.page}><section className={`${styles.card} ${styles.success}`} aria-live="polite">
      <span className="eyebrow">Pengajuan berhasil</span>
      <h1>Tiket berhasil dibuat</h1>
      <p>{business.name}</p>
      <p>Nomor tiket Anda</p>
      <div className={styles.ticket}>{receipt.ticketCode}</div>
      <ButtonLink to={trackingPath}>Lacak Servis</ButtonLink>
      <p className={styles.note}>Simpan tautan pelacakan pribadi ini untuk membuka status servis tanpa akun.</p>
      <Button variant="secondary" onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${trackingPath}`);
          setCopyMessage('Tautan pelacakan disalin.');
        } catch { setCopyMessage('Buka Lacak Servis lalu simpan alamat halaman tersebut.'); }
      }}>Salin Tautan Pelacakan</Button>
      <p role="status">{copyMessage}</p>
      {portal.isAuthenticated && receipt.ticketId && <ButtonLink variant="secondary" to={`${customerPortalPath(receipt.businessSlug)}/services/${receipt.ticketId}`}>Lihat di Portal Saya</ButtonLink>}
      {!portal.isAuthenticated && showAccountOffer && <div className={styles.optional}>
        <strong>Ingin menyimpan riwayat servis Anda?</strong>
        <p className={styles.note}>Buat akun untuk pengajuan berikutnya. Tiket ini tetap dapat dilacak melalui tautan di atas.</p>
        <div className={styles.actions}><ButtonLink to="/customer/register" state={{ from: { pathname: trackingPath.split('#')[0], hash: trackingPath.slice(trackingPath.indexOf('#')) } }}>Buat Akun</ButtonLink>
          <Button variant="ghost" onClick={() => setShowAccountOffer(false)}>Nanti Saja</Button></div>
      </div>}
    </section></div>;
  }

  return <div className={styles.page}>
    <header className={styles.heading}><span className="eyebrow">Layanan Pelanggan</span>
      <h1>Mulai Servis di {business.name}</h1><p>Isi formulir, dapatkan nomor tiket, lalu pantau servis Anda.</p></header>
    {failure && <InlineNotice type="error">{failure}</InlineNotice>}
    <CustomerServiceForm key={`${business.id}:${user?.id || 'guest'}`} signedIn={portal.isAuthenticated} returnPath={returnPath}
      initialCustomer={{ name: user ? `${user.firstName} ${user.lastName}`.trim() : '', phone: user?.phone || '', email: user?.email }} onSubmit={submit} />
  </div>;
}
