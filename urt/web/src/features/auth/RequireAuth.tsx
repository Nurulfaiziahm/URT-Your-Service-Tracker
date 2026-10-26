import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { selectAuth } from './authSlice';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import { Button } from '../../components/ui/Button';

export function RequireAuth() {
  const { status } = useAppSelector(selectAuth);
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
