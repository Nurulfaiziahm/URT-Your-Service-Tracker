import { Link } from 'react-router';
import logo from '../../assets/logo-urt.svg';

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} aria-label="URT — Beranda">
      <img src={logo} alt="URT — Your Service Tracker" width="106" height="48" />
    </Link>
  );
}
