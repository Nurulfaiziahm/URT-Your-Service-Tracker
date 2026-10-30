export type AuthPortal = 'owner' | 'customer' | 'technician';
export type AuthReturnLocation = { pathname?: string; search?: string; hash?: string };

export function authPortalFromPath(path: string): AuthPortal | undefined {
  if (/^\/owner(?:\/|$)/.test(path)) return 'owner';
  if (/^\/technician(?:\/|$)/.test(path) || path === '/invitations/technician') return 'technician';
  if (/^\/customer(?:\/|$)/.test(path) || /^\/b\/[^/]+\/(?:customer(?:\/|$)|services\/new$)/.test(path) || path === '/invitations/customer' || /^\/tracking(?:\/|$)/.test(path)) return 'customer';
}

export function authDestination(portal: AuthPortal, from?: AuthReturnLocation, fallback = `/${portal}`) {
  const path = from?.pathname || '';
  const technicianInvitation = path === '/technician/register' && Boolean(
    new URLSearchParams(from?.hash?.slice(1)).get('token') || new URLSearchParams(from?.search).get('token'),
  );
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || (/\/(?:login|register)$/.test(path) && !technicianInvitation)) return fallback;
  if (authPortalFromPath(path) !== portal) return fallback;
  return `${path}${from?.search || ''}${from?.hash || ''}`;
}
