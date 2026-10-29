import { useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { useAppSelector } from '../redux/hooks';
import { selectUser } from '../features/auth/authSlice';
import { useLogoutMutation } from '../features/auth/authApi';
import { useGetMyBusinessesQuery } from '../features/business/businessApi';
import { selectSelectedBusinessId } from '../features/business/businessSlice';
import { useCustomerPortal } from '../features/customer/customer-portal';
import { EmailVerificationBanner } from '../features/auth/EmailVerificationBanner';
import { Icon, type IconName } from '../components/ui/Icon';
import logo from '../assets/logo-urt.svg';
import { portals, type PortalRole } from './portal-navigation';
import styles from './PortalLayout.module.css';

const icons: Record<string, IconName> = {
  Beranda: 'home',
  'Tiket servis': 'ticket',
  Pelanggan: 'people',
  Teknisi: 'tool',
  Layanan: 'tool',
  Transaksi: 'wallet',
  Laporan: 'chart',
  Langganan: 'wallet',
  Pengaturan: 'settings',
  Profil: 'user',
  'Antrean servis': 'ticket',
  'Riwayat servis': 'clock',
  'Pengajuan servis': 'ticket',
};

export function PortalLayout({ role }: { role: PortalRole }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const portal = portals[role];
  const user = useAppSelector(selectUser);
  const businessId = useAppSelector(selectSelectedBusinessId);
  const customerPortal = useCustomerPortal();
  const { data } = useGetMyBusinessesQuery(undefined, { skip: !user });
  const business = (role === 'customer' && customerPortal.business)
    || data?.data?.businesses.find((item) => item.businessId === businessId);
  const [logout, { isLoading }] = useLogoutMutation();
  const initials = user ? `${user.firstName[0] || ''}${user.lastName[0] || ''}` : 'P';
  const portalPath = role === 'customer' ? customerPortal.basePath : `/${role}`;
  const profile = `${portalPath}/profile`;
  const navigation = (
    <nav className={styles.nav} aria-label={`Navigasi ${portal.name}`}>
      {portal.items.map(([label, to]) => (
        <NavLink
          key={to}
          to={role === 'customer' ? to.replace('/customer', portalPath) : to}
          end={to === `/${role}`}
          title={collapsed ? label : undefined}
          onClick={() => dialog.current?.close()}
        >
          <Icon name={role === 'owner' && label === 'Beranda' ? 'grid' : role === 'owner' && label === 'Teknisi' ? 'people' : icons[label] || 'ticket'} />
          <span>{label}</span>
        </NavLink>
      ))}
      {user ? <button
        className={styles.logout}
        onClick={() => {
          dialog.current?.close();
          void logout();
        }}
        disabled={isLoading}
      >
        <Icon name="logout" />
        <span>Keluar</span>
      </button> : <NavLink to={`/${role}/login`} state={{ from: { pathname: portalPath } }}>
        <Icon name="user" /><span>Masuk / Daftar</span>
      </NavLink>}
    </nav>
  );
  const brand = (
    <>
      <Link className={styles.brandLogo} to="/" aria-label="URT Beranda">
        <img src={logo} alt="URT — Your Service Tracker" />
      </Link>
      <div className={styles.brandCopy}>
        <strong>Your Service Tracker</strong>
        <span>{portal.name.toUpperCase()}</span>
      </div>
    </>
  );
  const identity = (
    <Link to={profile} className={styles.identity} onClick={() => dialog.current?.close()}>
      <span className={styles.avatar}>{initials}</span>
      <span>
        <strong>
          {user ? `${user.firstName} ${user.lastName}` : 'Pelanggan'}
        </strong>
        <small>
          {portal.label} {business && `• ${business.name}`}
        </small>
      </span>
    </Link>
  );
  const collapseButton = (
<button
          type="button"
          className={styles.collapse}
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          <Icon name={role === 'owner' ? 'chevronLeft' : 'collapse'} />
          <span>{collapsed ? 'Perluas Menu' : 'Ciutkan Menu'}</span>
        </button>
  );
  return (
    <div className={styles.layout} data-role={role} data-collapsed={collapsed}>
      <a className="skip-link" href="#main-content">
        Lewati ke konten utama
      </a>
      <aside data-portal-sidebar className={styles.sidebar}>
        <div className={styles.brand}>{brand}</div>
        {role !== 'owner' && collapseButton}
        {navigation}
        {role === 'owner' && collapseButton}
        {identity}
      </aside>
      <dialog ref={dialog} className={styles.mobileDialog} aria-label={`Menu ${portal.name}`}>
        <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
          Tutup ×
        </button>
        <div className={styles.brand}>{brand}</div>
        {navigation}
        {identity}
      </dialog>
      <div className={styles.main}>
        <header data-portal-topbar className={styles.topbar}>
          <button
            type="button"
            className={styles.menu}
            aria-label="Buka menu navigasi"
            aria-haspopup="dialog"
            onClick={() => dialog.current?.showModal()}
          >
            <Icon name="menu" />
          </button>
          <div className={styles.systemStatus}>
            <span className={styles.roleChip}>
              {role === 'owner' ? 'PEMILIK USAHA' : role === 'technician' ? 'TEKNISI' : 'PELANGGAN'}
            </span>
            <span className={styles.onlineDot} aria-hidden="true" />
            <span>{role === 'owner' ? (business ? 'Sistem Online' : 'Menghubungkan…') : business?.name || portal.name}</span>
          </div>
          <div className={styles.topbarActions}>
            <Link to="/portal?auth=login" className={styles.switchPortal}>
              Pilih portal
            </Link>
            <div className={styles.notification}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Pemberitahuan"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Icon name="bell" />
              </button>
              {notificationsOpen && (
                <div className={styles.notificationPanel} role="status">
                  Perkembangan servis dapat dilihat melalui halaman tiket Anda.
                </div>
              )}
            </div>
            <Link
              to={profile}
              className={`${styles.avatar} ${styles.avatarOutline}`}
              aria-label="Buka profil"
            >
              {initials}
            </Link>
          </div>
        </header>
        <EmailVerificationBanner />
        <main id="main-content" tabIndex={-1} className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
