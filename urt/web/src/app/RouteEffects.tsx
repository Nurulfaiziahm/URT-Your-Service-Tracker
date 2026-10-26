import { useEffect } from 'react';
import { useLocation } from 'react-router';

export function RouteEffects() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    document.title =
      pathname === '/'
        ? 'URT — Your Service Tracker'
        : `${pathname.startsWith('/privacy') ? 'Kebijakan Privasi' : pathname.startsWith('/terms') ? 'Syarat & Ketentuan' : 'Portal & Pelacakan'} — URT`;
    if (hash) {
      const target = () => document.getElementById(hash.slice(1));
      const node = target();
      if (node) {
        node.scrollIntoView();
        return;
      }
      // Route content may be lazy-loaded after this effect.
      const observer = new MutationObserver(() => {
        const element = target();
        if (element) {
          element.scrollIntoView();
          observer.disconnect();
        }
      });
      observer.observe(document.getElementById('root')!, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);
  return null;
}
