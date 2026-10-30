# Customer service requests

Customers open `/b/:slug/customer/services/new` from the owner's shared link or QR.
The three steps collect contact details, device details, and confirmation. An account
is optional. Signed-in customers receive safe profile autofill.

## API

Customer submissions are automatically assigned to an active, account-linked
technician in the same business with the fewest open tickets. Ties use creation
time and ID. Without an eligible technician, the ticket remains submitted and
unassigned for later staff assignment. Assignment does not bypass physical intake.
Technician dashboard and queue pages refresh every ten seconds and on focus or
reconnection, so submissions from a separate customer session become visible.

The owner customer directory shows service complaints and assigned technicians.
Contact editing is disabled. Owners can remove unlinked fictitious contacts with
`DELETE /businesses/:businessId/customers/:customerId`; account-linked contacts are
protected. Removal hides the contact and cancels pending claim invitations while
preserving historical ticket references.

Customer login and registration preserve the shop return path. Portal and tracking
navigation returns to the customer portal instead of the marketing landing page.
Technicians can prepare a customer-facing service update and open WhatsApp at the
customer's normalized number. The technician sends the prepared message in
WhatsApp; opening the composer does not count as delivery.

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

### Service agreement, repair and QC

Owners can select `Hapus Tiket Anonim` in ticket details only when the customer
contact has no linked account. The DELETE endpoint checks current ownership,
business scope, ticket revision and account linkage independently of the button.
Deletion records an internal audit entry, clears the deadline, and removes the
ticket from portal reads, queues, dashboard totals, reports and public tracking
or approval access. Existing customer contacts and financial records are retained.
Registered customers' tickets cannot be deleted. Run `npm run test:ticket-deletion`
in `api` and `npm run test:service-flow` in `web` to verify the restriction.

The assigned technician can accept submitted devices, record a diagnosis, then
submit itemized pricing with separate repair/QC durations and a target pickup
date/time. Customers must approve the current estimate before repair starts.
While the technician types internal findings, the diagnosis form fills an editable
customer draft using recognized device/component terms. Raw internal text and
measurements are not copied. Unknown terms produce a neutral draft for review;
this is a local template helper, not an AI diagnosis. Editing the customer text
preserves that wording until the technician selects `Gunakan Draf Otomatis`.
Saved explanations are also preserved when reopening the form.

Estimate items use a full-width description above quantity, unit price and
subtotal. New items are selected from the shop's catalog, with fixed descriptions
and prices. Technicians can create missing items from the estimate
form; these immediately appear in the owner's catalog. Owners manage edits,
deletion, and difficulty tariffs (low/medium/high/complex). A difficulty tariff is
charged once, at quantity one. Totals combine catalog price times quantity with
the selected difficulty charge; no prices are inferred from diagnosis notes.
Owners set each difficulty price in a dedicated section on the Services page.
The technician's selection starts empty and is required for both saving a draft
and submitting an estimate. The API rejects missing selections with
`DIFFICULTY_REQUIRED`; a configured zero-price tier is valid. A live receipt shows
item subtotals, the difficulty charge and the overall total alongside the editor
on desktop and above the save/submit buttons on mobile.

Catalog selections store item identifiers and a price snapshot. Saving or sending
an estimate rechecks business scope, active status and current prices; changed
prices return a conflict requiring a fresh selection. Deleting or editing catalog
items does not rewrite submitted estimates or customer approvals. Legacy manual
estimate lines remain readable; new saves and submissions must include a valid
catalog difficulty tariff alongside any manual lines.

`GET /businesses/:businessId/services` supports `entryType`, search and pagination.
`scope=catalog` searches services and parts together while excluding difficulty
tariffs before pagination, so owner and technician catalog searches need no type filter.
Owners/technicians may POST ordinary catalog items; only owners may create
difficulty tariffs, PUT edits or DELETE items. Public business service listings
exclude parts and difficulty charges. Deletion archives the item and removes it
from catalog reads while preserving quote history. Service JSON includes its
`id` so owner edit links and updates use valid identifiers. Run
`npm run test:catalog-pricing` in `api` and `npm run test:service-flow` in `web`.

Repair completion starts QC; only a technician-confirmed QC pass marks the device
ready for pickup. Passing an estimate deadline never advances a stage.

The technician queue sorts by the earliest active deadline before pagination.
Dashboard reminders and the notification bell show assigned tickets overdue or
due within 24 hours. Queue/dashboard/customer ticket data refresh every ten seconds;
countdowns refresh each minute. Legacy estimates without durations remain readable.

WhatsApp opens a prepared message for manual sending only when requesting pricing
approval or announcing pickup. Both messages include the shop's customer portal
URL. Approval messages also include itemized prices, repair/QC estimates, the pickup
target and a private approval link. The private link works without an account,
expires after seven days, and becomes unusable when the estimate version changes.
Only a hash of its random token is stored. Approval requires the current ticket
revision and pending estimate; repeated decisions cannot change a recorded approval.

Run `npm run test:ticket-workflow` in `api` for workflow/deadline/access checks,
`node --test scripts/customer-navigation.test.mjs scripts/service-timing.test.mjs`
in `web` for WhatsApp URLs and priority boundaries, and `npm run test:service-flow`
in `web` for the integrated browser flow. These use synthetic records; they never
send messages to a real WhatsApp contact.

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
