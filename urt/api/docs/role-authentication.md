# Role-specific authentication

## Browser entry points

| Portal | Register | Login |
| --- | --- | --- |
| Owner | `/owner/register` | `/owner/login` |
| Customer | `/customer/register` | `/customer/login` |
| Technician | Invitation activation only | `/technician/login` |

There is no public technician registration page or API. Generic `/login` and
`/register` browser URLs redirect using a known return role, or open explicit role
selection. Return paths cannot switch portal or point to an external origin.
Owner page styling is retained. Customer and technician logins have their own
labels, links, and destinations; technician login has no registration link.
Password recovery preserves the originating portal.

Guest service submission remains public at `/b/:slug/customer/services/new`.
Its login and optional signup links target customer routes. Account creation is
not required to obtain or track a ticket.

## Identity and authorization

The existing User, session rotation, password hashing, CSRF and rate-limit systems
are reused. New signup records a server-assigned `registrationPortal`. It does
not assign business ownership or technician membership. User's global `role`
remains `user`/`admin`; business permissions still use concrete relationships.

Owner/customer registration is public. Technician entitlement requires an active
Technician record linked to the authenticated User. Owner/customer signup does
not grant the other portal. A person with multiple genuine business roles can
explicitly enter each eligible portal, without automatic cross-role fallback.

`GET /api/v1/auth/portals` returns server-derived eligibility for protected browser
routes. Business creation also checks owner eligibility; existing business resource
guards continue enforcing business ownership and membership on the API.
Switching accounts clears cached API data and business selection.

Legacy accounts keep eligibility derived from existing relationships. A legacy
account with no relationship and no signup metadata can choose owner/customer
onboarding on its first explicit role login, which records its signup intent.
No destructive account migration or duplicate account store is introduced.

## API routes

- `POST /api/v1/auth/owner/register`
- `POST /api/v1/auth/customer/register`
- `POST /api/v1/auth/{owner|customer|technician}/login`
- `POST /api/v1/auth/{owner|customer|technician}/google` reuses Google verification;
  technician Google sign-in cannot create a new account.
- Legacy `/auth/register` and `/auth/google` use customer semantics for compatibility.
  Legacy `/auth/login` does not create a session without an explicit portal.

## Technician invitation lifecycle

Owner invitation creation, resend, expiry, seat checks and authenticated acceptance
are reused. New links put the token in a fragment; existing query-token links also
work. Invitation tokens are no longer printed by invitation creation/resend logs.

1. Owner creates an invitation using the existing protected technician route.
2. `/technician/invite/accept#token=...` inspects the token via
   `POST /api/v1/technician-invitations/inspect`.
   `/technician/invite/accept/:token` and existing `/invitations/technician` links
   also work. Generated links use fragments to keep tokens out of HTTP URL logs.
3. A new recipient sets a password using
   `POST /api/v1/technician-invitations/activate` with token/password/confirmation.
   Email comes from the valid invitation, never from a caller-supplied identity.
4. The User is created through the existing password-hashing model. Possession of
   the emailed invitation verifies this new account's email. Existing acceptance
   rules link and activate the Technician record and consume the invitation.
5. The recipient signs in normally at `/technician/login`.

For an existing account, activation never overwrites its password. The recipient
signs in with existing credentials and invitation proof, then uses the existing
verified-email acceptance flow. Pending invitation proof permits this sign-in but
does not grant technician portal access before acceptance. The acceptance response
now includes the membership expected by the existing frontend.

## Checks and deployment

Build the API before running compiled API checks:

```sh
cd urt/api
npm run build
npm run test:auth-portals
npm run test:password-recovery
npm run test:service-requests
```

From `urt/web`:

```sh
npm run build
npm run test:auth-routing
npm run test:customer-portal
npm run test:service-flow
```

The browser test uses headless Edge/Chrome and synthetic in-memory records. API
auth tests replace persistence and session issuance boundaries; they exercise real
routes, validation, password comparison, portal checks, invitation activation,
acceptance and business authorization without real email/database writes.

Deploy/restart the API and web app together. The original `npm test` remains
blocked by the repository's missing `tsconfig.test.json`.

## Password recovery for every role

Owner, customer and activated technician accounts with passwords use their own
`/{role}/forgot-password` and `/{role}/reset-password` browser routes. Their login
pages link to the matching recovery page. Recovery never redirects to owner login
from another role, and authentication screens omit the home link.

The API provides `POST /api/v1/auth/{owner|customer|technician}/forgot-password`,
`verify-reset-otp`, and `reset-password`. Existing generic recovery API routes
retain customer semantics only; generic browser routes require a known role or
show role selection. All existing CSRF, validation and rate limits remain applied.

One email contains a six-digit code (5 minutes) and a reset link (15 minutes).
Verifying the code exchanges it for a single-use reset credential and invalidates
the original link. Five incorrect codes invalidate the grant. New requests have
a 60-second cooldown and supersede older grants for that account and role.
Redis stores hashed credentials and consumes them atomically. A grant is bound to
the user, portal and password version; wrong-role use cannot consume it.
Existing model hooks hash the replacement password and existing session storage
revokes old sessions. No recovery passwords, codes or tokens are logged.

Mail uses existing `MAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and the first `ALLOWED_ORIGINS` entry for the
web link. Configure these on the backend; SMTP secrets never belong in the web
bundle. `ALLOWED_ORIGINS` must point to the deployed web origin.

SMTP availability is checked identically for every address. Global mail outages
return 503. Otherwise the public response is identical for unknown addresses,
wrong roles, pending technicians and cooldowns. Account-specific lookup/delivery
runs after acceptance to avoid timing-based enumeration. Delivery failures are
observed and invalidate the credential; the response never promises delivery.
Graceful shutdown drains pending deliveries within the existing shutdown timeout.

`test:password-recovery` exercises real API handlers, templates and Nodemailer
against an isolated local SMTP server, with model/Redis persistence boundaries
replaced. It covers all roles, code/link paths, expiry, replay, concurrent use,
wrong-role access, inactive technician accounts, cooldowns and provider rejection.
The browser service-flow check covers recovery navigation and both UI entry paths.
Real Redis Lua execution, Render environment configuration and actual inbox
delivery still require deployment verification.

After deploying API and web together:

1. Check backend mail configuration is present/enabled without copying secret
   values. Confirm the first allowed origin is the production web origin.
2. For each role, open its login page, choose forgot password, and submit an
   existing password account of that role (technician must already be activated).
3. Confirm receipt of the six-digit code and role-specific link. Test code entry
   and opening the email link while the reset page is already open.
4. Set a new password, follow the matching login link, and verify old credentials
   fail/new credentials work. Reusing a consumed link or code must fail.
5. Invite a new technician as owner, activate through the emailed link, and sign
   in at `/technician/login`. Check that no public technician signup is offered.
6. Inspect backend logs for SMTP connection/authentication/delivery failures using
   only sanitized error codes; do not copy recovery codes, tokens or passwords.

Files changed for recovery/activation completion:

- API: `src/modules/auth/password-recovery.service.ts`, `auth.service.ts`,
  `auth.controller.ts`, `auth.routes.ts`, `auth.schema.ts`;
  `src/lib/redis/account-security.store.ts`; `src/lib/mail/config.ts`,
  `mailer.service.ts`, `types.ts`, `templates/reset-password.hbs`;
  `src/modules/technician/technician.service.ts`; `src/server.ts`;
  `tests/password-recovery.test.mjs`, `tests/helpers/smtp-fixture.mjs`,
  `tests/helpers/service-request-fixture.mjs`; `package.json`; this document.
- Web: `src/app/router.tsx`; `src/features/auth/LoginPage.tsx`,
  `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `LegacyRecoveryRedirect.tsx`,
  `authApi.ts`, `types.ts`; `src/features/technicians/TechnicianAcceptInvitationPage.tsx`;
  `src/layouts/AuthLayout.tsx`; `src/redux/baseQuery.ts`;
  `scripts/check-service-flow.mjs`.

## Files changed for this task

Backend (`urt/api`):

- `src/models/User.model.ts`
- `src/modules/auth/portal-access.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auth.schema.ts`
- `src/modules/business/business.controller.ts`
- `src/modules/technician/technician.service.ts`, `technician.controller.ts`, `technician.routes.ts`, `technician.schema.ts`
- `tests/auth-portals.test.mjs`, `tests/helpers/service-request-fixture.mjs`, `package.json`
- `docs/role-authentication.md`

Frontend (`urt/web`):

- `src/app/router.tsx`
- `src/features/auth/auth-routing.ts`, `LegacyAuthRedirect.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `RequireAuth.tsx`, `authApi.ts`, `types.ts`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- `src/features/business/BusinessGate.tsx`
- `src/features/technicians/TechnicianAcceptInvitationPage.tsx`, `techniciansApi.ts`
- `src/features/customer/CustomerServiceForm.tsx`, `CustomerNewServicePage.tsx`
- `src/features/public/PortalSelectPage.tsx`, `LandingPage.tsx`, `TrackingPage.tsx`
- `src/layouts/PublicLayout.tsx`, `PortalLayout.tsx`
- `src/redux/baseQuery.ts`, `sessionLifecycle.ts`
- `scripts/auth-routing.test.mjs`, `check-customer-portal.mjs`, `check-service-flow.mjs`, `package.json`
