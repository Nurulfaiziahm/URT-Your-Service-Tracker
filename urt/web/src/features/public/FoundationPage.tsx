import { useLocation } from 'react-router';
import { portals, type PortalRole } from '../../layouts/portal-navigation';
import { EmptyState } from '../../components/feedback/Feedback';
import { ButtonLink } from '../../components/ui/Button';
import styles from './InfoPages.module.css';

export default function FoundationPage() {
  const { pathname } = useLocation();
  const role = pathname.split('/')[1] as PortalRole;
  const portal = portals[role];
  const title = portal?.items.find(([, path]) => path === pathname)?.[0] || 'Detail halaman';
  return (
    <div className={styles.foundation}>
      <header className={styles.heading}>
        <span className="eyebrow">{portal?.name}</span>
        <h1>{title}</h1>
        <p>{portal?.description}</p>
      </header>
      <EmptyState
        title="Ruang kerja sedang disiapkan"
        description="Tampilan ini memperkenalkan navigasi portal. Data dan tindakan servis akan tersedia setelah fitur dihubungkan."
        action={
          <ButtonLink to="/portal" variant="secondary">
            Lihat portal lainnya
          </ButtonLink>
        }
      />
    </div>
  );
}
