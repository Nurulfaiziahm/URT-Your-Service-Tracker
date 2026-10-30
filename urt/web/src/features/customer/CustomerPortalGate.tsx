import { Outlet, useLocation, useParams } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectSessionStatus } from '../auth/authSlice';
import { useGetMyBusinessesQuery, useGetPublicBusinessQuery } from '../business/businessApi';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import { CustomerPortalContext } from './customer-portal';

export function CustomerPortalGate() {
  const { businessSlug = '' } = useParams();
  const isServiceForm = useLocation().pathname.endsWith('/services/new');
  const status = useAppSelector(selectSessionStatus);
  const { currentData, isFetching, error, refetch } = useGetPublicBusinessQuery(businessSlug);
  const membership = useGetMyBusinessesQuery(undefined, { skip: status !== 'authenticated' || isServiceForm });
  const business = currentData?.data.business;

  if (status === 'loading' || (isFetching && !currentData) || membership.isLoading) {
    return <PageLoader />;
  }
  if (error || !business) {
    const missing = error && 'status' in error && error.status === 404;
    return <main className="container page-content"><EmptyState
      title={missing ? 'Tempat servis tidak ditemukan' : 'Portal belum dapat dimuat'}
      description="Periksa tautan dari tempat servis Anda atau coba kembali."
      action={missing
        ? <ButtonLink to="/customer">Portal Pelanggan</ButtonLink>
        : <Button onClick={() => refetch()}>Coba lagi</Button>}
    /></main>;
  }
  if (!isServiceForm && (membership.isError || status === 'unavailable')) {
    return <main className="container page-content"><EmptyState
      title="Akun pelanggan belum dapat dimuat"
      description="Coba kembali untuk memuat servis yang terhubung dengan akun Anda."
      action={<Button onClick={() => window.location.reload()}>Coba lagi</Button>}
    /></main>;
  }

  const hasMembership = status === 'authenticated' && Boolean(
    membership.currentData?.data.businesses.some(
      (item) => item.businessId === business.id && item.roles.includes('customer'),
    ),
  );
  return <CustomerPortalContext.Provider key={business.id} value={{ business, hasMembership }}>
    <Outlet />
  </CustomerPortalContext.Provider>;
}
