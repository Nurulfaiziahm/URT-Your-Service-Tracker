import { createContext, useContext } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { selectIsAuthenticated } from '../auth/authSlice';
import { selectSelectedBusinessId } from '../business/businessSlice';
import type { PublicBusiness } from '../business/types';

export const CustomerPortalContext = createContext<{
  business: PublicBusiness;
  hasMembership: boolean;
} | null>(null);

export function customerPortalPath(slug: string) {
  return `/b/${encodeURIComponent(slug)}/customer`;
}

export function useCustomerPortal() {
  const scope = useContext(CustomerPortalContext);
  const selectedBusinessId = useAppSelector(selectSelectedBusinessId);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  return {
    business: scope?.business,
    businessId: scope ? scope.business.id : selectedBusinessId,
    basePath: scope ? customerPortalPath(scope.business.slug) : '/customer',
    hasMembership: scope?.hasMembership ?? true,
    isAuthenticated,
  };
}
