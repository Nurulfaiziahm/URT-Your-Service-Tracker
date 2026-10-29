import { Navigate, useLocation } from 'react-router';
import { authPortalFromPath, type AuthReturnLocation } from './auth-routing';

export function LegacyAuthRedirect({ mode }: { mode: 'login' | 'register' }) {
  const location = useLocation();
  const state = location.state as { from?: AuthReturnLocation } | null;
  const portal = authPortalFromPath(state?.from?.pathname || '');
  if (!portal) return <Navigate to={`/portal?auth=${mode}`} state={location.state} replace />;
  if (portal === 'technician' && mode === 'register') {
    return <Navigate to="/technician/login" state={location.state} replace />;
  }
  return <Navigate to={`/${portal}/${mode}`} state={location.state} replace />;
}
