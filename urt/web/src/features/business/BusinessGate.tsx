import { useEffect, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { useGetMyBusinessesQuery } from './businessApi';
import {
  selectBusiness,
  selectSelectedBusinessId,
} from './businessSlice';
import type { BusinessRole } from './types';
import { CustomerWelcomeOnboarding } from '../customer/CustomerWelcomeOnboarding';
import { PageLoader, EmptyState } from '../../components/feedback/Feedback';
import { Button, ButtonLink } from '../../components/ui/Button';

export function BusinessGate() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const selectedBusinessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading, error, refetch } = useGetMyBusinessesQuery();

  const businesses = useMemo(() => data?.data?.businesses || [], [data]);
  const requestedRole = location.pathname.split('/')[1] as BusinessRole;

  useEffect(() => {
    if (businesses.length > 0) {
      const exists = businesses.find((b) => b.businessId === selectedBusinessId);
      if (!exists || !exists.roles.includes(requestedRole)) {
        // Auto-select the first business matching the requested role or first available
        const matching =
          businesses.find((b) => b.roles.includes(requestedRole));
        if (!matching) return;
        dispatch(
          selectBusiness({
            businessId: matching.businessId,
            portal: matching.roles.includes(requestedRole) ? requestedRole : matching.roles[0],
          }),
        );
      }
    }
  }, [businesses, selectedBusinessId, requestedRole, dispatch]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Gagal memuat informasi tempat servis"
          description="Terjadi kendala saat memeriksa akses tempat servis Anda."
          symbol="!"
          action={<Button onClick={() => refetch()}>Coba lagi</Button>}
        />
      </main>
    );
  }

  if (businesses.length === 0) {
    if (location.pathname.startsWith('/owner')) {
      return <Navigate to="/owner/onboarding" replace />;
    }

    if (location.pathname.startsWith('/customer')) {
      return <CustomerWelcomeOnboarding />;
    }

    return (
      <main className="container page-content">
        <EmptyState
          title="Belum Terhubung dengan Tempat Servis"
          description={
            location.pathname.startsWith('/technician')
              ? 'Akun Anda belum terdaftar sebagai teknisi di tempat servis manapun. Minta pemilik tempat servis untuk mengirimkan undangan melalui email Anda.'
              : 'Belum ada tiket atau tempat servis yang terhubung dengan akun Anda.'
          }
          symbol="ℹ"
          action={
            <ButtonLink to="/portal" variant="secondary">
              Pilih Portal Lain
            </ButtonLink>
          }
        />
      </main>
    );
  }

  return <Outlet />;
}
