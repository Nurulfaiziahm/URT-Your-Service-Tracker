export function customerPortalReturn(from?: { pathname?: string; hash?: string }) {
  const path = from?.pathname || '';
  const scope = path.match(/^\/b\/([a-zA-Z0-9%-]+)\/(?:customer(?:\/|$)|services\/new$)/);
  if (scope) return `/b/${scope[1]}/customer`;
  const business = path.startsWith('/tracking') ? new URLSearchParams(from?.hash?.slice(1)).get('business') : null;
  return business && /^[a-zA-Z0-9-]+$/.test(business) ? `/b/${encodeURIComponent(business)}/customer` : '/customer';
}
