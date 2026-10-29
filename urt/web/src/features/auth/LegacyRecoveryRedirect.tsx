import { Navigate, useLocation } from 'react-router';
import { authPortalFromPath, type AuthPortal } from './auth-routing';

export function LegacyRecoveryRedirect({ action }: { action: 'forgot-password' | 'reset-password' }) {
  const location = useLocation();
  const state = location.state as { portal?: AuthPortal; from?: { pathname?: string } } | null;
  const candidate = state?.portal || authPortalFromPath(state?.from?.pathname || '');
  const portal = candidate && ['owner', 'customer', 'technician'].includes(candidate) ? candidate : null;
  return <Navigate to={portal ? `/${portal}/${action}${location.hash}` : '/portal?auth=login'} state={location.state} replace />;
}
