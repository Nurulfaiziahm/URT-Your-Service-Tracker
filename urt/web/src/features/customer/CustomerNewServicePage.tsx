import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectUser } from '../auth/authSlice';
import { useGetMyBusinessesQuery, useGetPublicBusinessQuery } from '../business/businessApi';
import { useSubmitServiceRequestMutation } from '../tickets/ticketsApi';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, InlineNotice, PageLoader } from '../../components/feedback/Feedback';
import { CustomerServiceForm } from './CustomerServiceForm';
import { customerPortalPath, useCustomerPortal } from './customer-portal';
import type { ServiceRequestInput } from './service-request.types';
import type { ApiErrorBody } from '../../lib/api.types';
import styles from './CustomerServiceForm.module.css';

export default function CustomerNewServicePage() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const portal = useCustomerPortal();
  const user = useAppSelector(selectUser);
  const membership = useGetMyBusinessesQuery(undefined, { skip: Boolean(businessSlug) || !portal.isAuthenticated });
  const slug = businessSlug || membership.currentData?.data.businesses.find((item) => item.businessId === portal.businessId)?.slug || '';
  const { currentData, isFetching, error, refetch } = useGetPublicBusinessQuery(slug, { skip: !slug });
  const [submitServiceRequest] = useSubmitServiceRequestMutation();
  const [failure, setFailure] = useState('');
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
      navigate(
        `${customerPortalPath(result.data.businessSlug)}?ticketCode=${encodeURIComponent(result.data.ticketCode)}`,
        { replace: true },
      );
    } catch (error) {
      const response = error as { data?: ApiErrorBody };
      setFailure(response.data?.error || 'Layanan belum dapat menerima pengajuan. Silakan coba lagi.');
      throw error;
    }
  }

  return <div className={styles.page}>
    <header className={styles.heading}><span className="eyebrow">Layanan Pelanggan</span>
      <h1>Mulai Servis di {business.name}</h1><p>Isi formulir, dapatkan nomor tiket, lalu pantau servis Anda.</p></header>
    {failure && <InlineNotice type="error">{failure}</InlineNotice>}
    <CustomerServiceForm key={`${business.id}:${user?.id || 'guest'}`} signedIn={portal.isAuthenticated} returnPath={returnPath}
      initialCustomer={{ name: user ? `${user.firstName} ${user.lastName}`.trim() : '', phone: user?.phone || '', email: user?.email }} onSubmit={submit} />
  </div>;
}
