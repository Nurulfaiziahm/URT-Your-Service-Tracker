import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectAuth } from './authSlice';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import { Button } from '../../components/ui/Button';
import { authPortalFromPath } from './auth-routing';
import { useGetAuthPortalsQuery } from './authApi';

export function RequireAuth() {
  const { status, user } = useAppSelector(selectAuth);
  const location = useLocation();
  const portal = authPortalFromPath(location.pathname);
  const needsPortal = Boolean(portal) && !location.pathname.startsWith('/invitations/');
  const access = useGetAuthPortalsQuery(user?.id || '', { skip: status !== 'authenticated' || !needsPortal });

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (status === 'unavailable') {
    return (
      <main className="container page-content">
        <EmptyState
          title="Layanan sedang tidak dapat dijangkau"
          description="Koneksi ke server terputus atau layanan sedang dalam pemeliharaan. Silakan coba lagi."
          symbol="!"
          action={<Button onClick={() => window.location.reload()}>Coba lagi</Button>}
        />
      </main>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to={portal ? `/${portal}/login` : '/portal?auth=login'} state={{ from: location }} replace />;
  }

  if (needsPortal && access.isFetching) return <PageLoader />;
  if (needsPortal && (access.isError || !access.currentData)) return <EmptyState title="Portal belum dapat diperiksa" description="Coba kembali untuk memeriksa akses akun Anda." action={<Button onClick={() => access.refetch()}>Coba lagi</Button>} />;
  if (needsPortal && portal && !access.currentData?.data.portals.includes(portal)) {
    return <EmptyState title="Akses Terbatas" description="Akun ini tidak memiliki peran yang diperlukan untuk portal ini."
      action={<Button onClick={() => window.location.assign(`/${portal}/login`)}>Masuk dengan akun yang sesuai</Button>} />;
  }

  return <Outlet />;
}
