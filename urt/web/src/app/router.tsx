import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { PortalLayout } from '../layouts/PortalLayout';
import { RequireAuth } from '../features/auth/RequireAuth';
import { BusinessGate } from '../features/business/BusinessGate';
import { RequireBusinessRole } from '../features/business/RequireBusinessRole';
import { PageLoader } from '../components/feedback/Feedback';

const LandingPage = lazy(() => import('../features/public/LandingPage'));
const PortalSelectPage = lazy(() => import('../features/public/PortalSelectPage'));
const TrackingPage = lazy(() => import('../features/public/TrackingPage'));
const LegalPage = lazy(() => import('../features/public/LegalPage'));
const UnavailablePage = lazy(() => import('../features/public/UnavailablePage'));
const FoundationPage = lazy(() => import('../features/public/FoundationPage'));
const PublicBusinessPage = lazy(() => import('../features/public/PublicBusinessPage'));

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/RegisterPage'));
const VerifyEmailPage = lazy(() => import('../features/auth/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/ResetPasswordPage'));

const AccountProfilePage = lazy(() => import('../features/account/AccountProfilePage'));
const AccountSecurityPage = lazy(() => import('../features/account/AccountSecurityPage'));

const OwnerDashboardPage = lazy(() => import('../features/owner/OwnerDashboardPage'));
const OwnerOnboardingPage = lazy(() => import('../features/owner/OwnerOnboardingPage'));
const OwnerSettingsPage = lazy(() => import('../features/owner/OwnerSettingsPage'));
const OwnerTechniciansPage = lazy(() => import('../features/owner/OwnerTechniciansPage'));
const OwnerCustomersPage = lazy(() => import('../features/owner/OwnerCustomersPage'));
const OwnerServicesPage = lazy(() => import('../features/owner/OwnerServicesPage'));
const OwnerTicketsPage = lazy(() => import('../features/owner/OwnerTicketsPage'));
const OwnerNewTicketPage = lazy(() => import('../features/owner/OwnerNewTicketPage'));
const OwnerTicketDetailPage = lazy(() => import('../features/owner/OwnerTicketDetailPage'));
const OwnerInvoicesPage = lazy(() => import('../features/owner/OwnerInvoicesPage'));
const OwnerInvoiceDetailPage = lazy(() => import('../features/owner/OwnerInvoiceDetailPage'));
const OwnerReportsPage = lazy(() => import('../features/owner/OwnerReportsPage'));
const OwnerSubscriptionPaymentPage = lazy(() => import('../features/owner/OwnerSubscriptionPaymentPage'));
const OwnerSubscriptionPage = lazy(() => import('../features/owner/OwnerSubscriptionPage'));

const ServiceHistoryPage = lazy(() => import('../features/tickets/ServiceHistoryPage'));
const TechnicianDashboardPage = lazy(
  () => import('../features/technician/TechnicianDashboardPage'),
);
const TechnicianQueuePage = lazy(() => import('../features/technician/TechnicianQueuePage'));
const TechnicianTicketDetailPage = lazy(
  () => import('../features/technician/TechnicianTicketDetailPage'),
);

const CustomerDashboardPage = lazy(() => import('../features/customer/CustomerDashboardPage'));
const CustomerNewServicePage = lazy(() => import('../features/customer/CustomerNewServicePage'));
const CustomerTicketDetailPage = lazy(
  () => import('../features/customer/CustomerTicketDetailPage'),
);

const TechnicianAcceptInvitationPage = lazy(
  () => import('../features/technicians/TechnicianAcceptInvitationPage'),
);
const CustomerAcceptInvitationPage = lazy(
  () => import('../features/customers/CustomerAcceptInvitationPage'),
);

const OwnerCustomerDetailPage = lazy(() => import('../features/owner/OwnerCustomerDetailPage'));

const OwnerTechnicianDetailPage = lazy(() => import('../features/owner/OwnerTechnicianDetailPage'));

const OwnerServiceDetailPage = lazy(() => import('../features/owner/OwnerServiceDetailPage'));

const CustomerApprovalPage = lazy(() => import('../features/customer/CustomerApprovalPage'));
const TechnicianEstimatePage = lazy(() => import('../features/technician/TechnicianEstimatePage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="portal" element={<PortalSelectPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="owner/register" element={<RegisterPage />} />
        <Route path="tracking/:ticketCode?" element={<TrackingPage />} />
        <Route path="privacy" element={<LegalPage document="privacy" />} />
        <Route path="terms" element={<LegalPage document="terms" />} />
        <Route element={<PublicLayout />}>
          <Route path="forbidden" element={<UnavailablePage kind="forbidden" />} />
          <Route path="b/:businessSlug" element={<PublicBusinessPage />} />

          {/* Shared Account & Invitation Pages (works without business membership) */}
          <Route element={<RequireAuth />}>
            <Route path="account/profile" element={<AccountProfilePage />} />
            <Route path="account/security" element={<AccountSecurityPage />} />
            <Route path="invitations/technician" element={<TechnicianAcceptInvitationPage />} />
            <Route path="invitations/customer" element={<CustomerAcceptInvitationPage />} />
            <Route path="b/:businessSlug/services/new" element={<CustomerNewServicePage />} />
          </Route>

          <Route path="*" element={<UnavailablePage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="owner/onboarding" element={<OwnerOnboardingPage />} />
        </Route>
        {/* Dedicated Auth Layout */}
        <Route element={<AuthLayout />}>
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Guarded Portal Routes */}
        <Route element={<RequireAuth />}>
          <Route element={<BusinessGate />}>
            {/* Owner Portal */}
            <Route element={<RequireBusinessRole role="owner" />}>
              <Route path="owner" element={<PortalLayout role="owner" />}>
                <Route index element={<OwnerDashboardPage />} />
                <Route path="tickets" element={<OwnerTicketsPage />} />
                <Route path="tickets/new" element={<OwnerNewTicketPage />} />
                <Route path="tickets/:id" element={<OwnerTicketDetailPage />} />
                <Route path="settings" element={<OwnerSettingsPage />} />
                <Route path="technicians" element={<OwnerTechniciansPage />} />
                <Route path="technicians/new" element={<OwnerTechniciansPage />} />
                <Route path="technicians/:id" element={<OwnerTechnicianDetailPage />} />
                <Route path="technicians/:id/edit" element={<OwnerTechnicianDetailPage />} />
                <Route path="customers" element={<OwnerCustomersPage />} />
                <Route path="customers/new" element={<OwnerCustomersPage />} />
                <Route path="customers/:id" element={<OwnerCustomerDetailPage />} />
                <Route path="customers/:id/edit" element={<OwnerCustomerDetailPage />} />
                <Route path="services" element={<OwnerServicesPage />} />
                <Route path="services/new" element={<OwnerServicesPage />} />
                <Route path="services/:id" element={<OwnerServiceDetailPage />} />
                <Route path="services/:id/edit" element={<OwnerServiceDetailPage />} />
                <Route path="transactions" element={<OwnerInvoicesPage />} />
                <Route path="transactions/:id" element={<OwnerInvoiceDetailPage />} />
                <Route path="reports" element={<OwnerReportsPage />} />
                <Route path="subscription" element={<OwnerSubscriptionPage />} />
                <Route path="subscription/plans" element={<OwnerSubscriptionPage />} />
                <Route path="subscription/payments/:id" element={<OwnerSubscriptionPaymentPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="security" element={<AccountSecurityPage />} />
                <Route path="*" element={<FoundationPage />} />
              </Route>
            </Route>

            {/* Technician Portal */}
            <Route element={<RequireBusinessRole role="technician" />}>
              <Route path="technician" element={<PortalLayout role="technician" />}>
                <Route index element={<TechnicianDashboardPage />} />
                <Route path="queue" element={<TechnicianQueuePage />} />
                <Route path="history" element={<ServiceHistoryPage role="technician" />} />
                <Route path="tickets/:id" element={<TechnicianTicketDetailPage />} />
                <Route path="tickets/:id/estimate" element={<TechnicianEstimatePage />} />
                <Route path="tickets/:id/estimate/sent" element={<TechnicianEstimatePage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="security" element={<AccountSecurityPage />} />
                <Route path="*" element={<FoundationPage />} />
              </Route>
            </Route>

            {/* Customer Portal */}
            <Route element={<RequireBusinessRole role="customer" />}>
              <Route path="customer" element={<PortalLayout role="customer" />}>
                <Route index element={<CustomerDashboardPage />} />
                <Route path="history" element={<ServiceHistoryPage role="customer" />} />
                <Route path="services/new" element={<CustomerNewServicePage />} />
                <Route path="services/:id" element={<CustomerTicketDetailPage />} />
                <Route path="services/:id/approval" element={<CustomerApprovalPage />} />
                <Route path="profile" element={<AccountProfilePage />} />
                <Route path="security" element={<AccountSecurityPage />} />
                <Route path="*" element={<FoundationPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
