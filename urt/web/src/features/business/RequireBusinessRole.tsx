import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../../redux/hooks';
import { useGetMyBusinessesQuery } from './businessApi';
import { selectSelectedBusinessId } from './businessSlice';
import type { BusinessRole } from './types';
import { EmptyState, PageLoader } from '../../components/feedback/Feedback';
import { ButtonLink } from '../../components/ui/Button';

export function RequireBusinessRole({ role }: { role: BusinessRole }) {
  const selectedBusinessId = useAppSelector(selectSelectedBusinessId);
  const { data, isLoading } = useGetMyBusinessesQuery();

  if (isLoading) {
    return <PageLoader />;
  }

  const businesses = data?.data?.businesses || [];
  const currentBusiness = businesses.find((b) => b.businessId === selectedBusinessId) || businesses[0];

  if (!currentBusiness) {
    if (role === 'owner') {
      return <Navigate to="/owner/onboarding" replace />;
    }
    return (
      <main className="container page-content">
        <EmptyState
          title="Akses Belum Tersedia"
          description="Anda belum memiliki akses ke portal ini."
          symbol="!"
          action={<ButtonLink to="/portal">Kembali ke Pemilihan Portal</ButtonLink>}
        />
      </main>
    );
  }

  const hasRole = currentBusiness.roles.includes(role);

  if (!hasRole) {
    return (
      <main className="container page-content">
        <EmptyState
          title="Akses Terbatas"
          description={`Akun Anda tidak memiliki peran sebagai ${role} pada tempat servis "${currentBusiness.name}".`}
          symbol="403"
          action={
            <ButtonLink to="/portal" variant="secondary">
              Pilih Portal yang Tersedia
            </ButtonLink>
          }
        />
      </main>
    );
  }

  return <Outlet />;
}
