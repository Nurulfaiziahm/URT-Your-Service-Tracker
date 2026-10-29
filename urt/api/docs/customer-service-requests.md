# Customer service requests

Customers open `/b/:slug/customer/services/new` from the owner's shared link or QR.
The three steps collect contact details, device details, and confirmation. An account
is optional. Signed-in customers receive safe profile autofill.

## API

`POST /api/v1/public/businesses/:slug/service-requests`

```json
{
  "customer": { "name": "Example Customer", "phone": "081234567890" },
  "device": { "category": "Laptop", "brand": "Asus" },
  "complaint": "Screen does not turn on"
}
```

Email, model, condition, and accessories are optional. Contact names, WhatsApp
numbers, device category, brand, and complaint are validated. The normal CSRF
bootstrap/session, global API limiter, dedicated intake limiter, and active-shop
subscription check apply. A supplied bearer token must pass the existing auth guard.

The 201 receipt includes `ticketCode`, `businessSlug`, and a random `trackingSecret`.
Only its SHA-256 hash is stored on the existing ticket. A signed-in receipt also
includes `ticketId` for the authenticated portal.

Guest submissions create unlinked Customer contacts. Existing phone numbers or
email addresses never authorize linking or access to earlier tickets. Signed-in
submissions reuse the contact scoped to the verified user and business. Existing
owner and authenticated ticket routes retain their authentication requirements.

The receipt's tracking link puts the access credential in the URL fragment, keeping
it out of HTTP URL logs. The tracking page submits it to the existing protected
public lookup, which returns the existing allowlisted progress response. Keep the
link private. No credentials or contact form data are persisted in browser storage.

Optional signup after submission is offered for future requests. It does not
automatically claim guest records. Existing customer invitations remain available
for verified account linking; the guest tracking link continues to work without signup.

## Model compatibility

- Existing Customer records already support an absent `userId`.
- Device model defaults to an empty string when omitted; existing values stay valid.
- Guest timeline entries have no User actor ID. Staff entries still require one.
- Existing ticket code generation and ticket lifecycle are reused.
- No data migration is required. Deploy the backend and frontend together.

## Verification

From `urt/api`:

```sh
npm run build
npm run test:service-requests
```

From `urt/web`:

```sh
npm run build
npm run test:customer-portal
npm run test:service-flow
```

The browser check requires Edge/Chrome on Windows, or `URT_TEST_BROWSER` pointing
to a Chromium executable. Tests use synthetic configuration and in-memory model
boundaries and do not connect to real MongoDB, Redis, or SMTP services.

The repository's original API `npm test` is currently blocked by the missing
`tsconfig.test.json`; these scoped checks do not depend on that missing setup.

## Files changed for this flow

Backend (under `urt/api`):

- `src/modules/ticket/service-request.controller.ts`, `service-request.service.ts`
- `src/modules/ticket/ticket.service.ts`, `ticket.schema.ts`, `ticket.serializer.ts`
- `src/modules/business/business.routes.ts`
- `src/models/ServiceTicket.model.ts`
- `src/core/security/rate-limiter.ts`
- `tests/service-requests.test.mjs`, `tests/helpers/service-request-fixture.mjs`
- `package.json`, this document

Frontend (under `urt/web`):

- `src/features/customer/CustomerServiceForm.tsx`, `CustomerServiceForm.module.css`
- `src/features/customer/CustomerNewServicePage.tsx`, `CustomerPortalGate.tsx`, `CustomerDashboardPage.tsx`
- `src/features/customer/service-request.types.ts`
- `src/features/tickets/ticketsApi.ts`, `types.ts`
- `src/features/public/TrackingPage.tsx`
- `src/features/auth/LoginPage.tsx`, `RegisterPage.tsx`
- `src/features/owner/OwnerDashboardPage.tsx`, `OwnerSettingsPage.tsx`
- `src/app/router.tsx`
- `scripts/check-service-flow.mjs`, `scripts/check-customer-portal.mjs`, `package.json`
