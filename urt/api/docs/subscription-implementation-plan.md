# Subscription backend

## Implemented

The backend has a package catalog, business subscriptions, separate subscription
payments, owner billing endpoints, date-based expiry checks, and simple
technician limit checks. The frontend is unchanged.

| Package code | Charge (IDR) | Period | Technician seats | Tickets |
| --- | ---: | --- | --- | --- |
| monthly | 99,000 | Calendar month | 3 | Unlimited |
| annual | 999,000 | Calendar year | Unlimited | Unlimited |

Run `npm run seed:packages` from `mern stack/api` to upsert these two catalog
records into `urt_demo`. Package features match the landing page. The annual
package additionally includes inventory, priority support, financial export, and
branded receipts. These flags describe entitlements; features without existing
backend operations (such as inventory and branded receipts) are not implemented
by this subscription work.

## Required configuration

- Standalone MongoDB is supported. Checkout and technician operations use ordinary
  Mongoose reads and writes; no transactions, database sessions, or replica set
  setup is required for this presentation project.
- Set `SUBSCRIPTION_PAYMENT_INSTRUCTIONS` to real manual payment instructions
  in the API environment and restart the server. Checkout returns
  `503 PAYMENT_NOT_CONFIGURED` when it is empty. No account numbers are invented.
No payment provider was configured. The initial flow supports **manual payments**;
real payment settlement and provider webhooks remain future integration work.
Owners can confirm a simulated payment for the presentation when NODE_ENV is
not production; this does not move money.
Existing CSRF and bearer-token protection applies to billing writes. The demo confirmation action activates the stored package for the presentation.

## API contract

All paths below are relative to `/api/v1`. Responses use the existing
`{ success, data, message? }` envelope. Errors use
`{ success: false, error, code }`. Dates are UTC ISO strings.

| Method and path | Access | Response data / effect |
| --- | --- | --- |
| GET /packages | Public | `{ packages: [...] }`, active catalog sorted by sortOrder then code. Each item has id, code, name, description, price, currency, billingInterval, features, maxTechnicians, entitlement flags, and isPopular. |
| GET /businesses/:businessId/subscription | Business owner | `{ subscription: ... }` with status (`unpaid`, `active`, `expired`), planName, package snapshot, period dates, daysRemaining, occupiedTechnicianSeats, and any unexpired pendingPayment. |
| POST /businesses/:businessId/subscription/checkout | Business owner | Body `{ "packageCode": "monthly", "paymentMethod": "manual" }`. Creates a 24-hour pending payment. Returns 201 with `{ payment, instructions }`. Prices and entitlements come from the database. |
| GET /businesses/:businessId/subscription/payments?page=1&limit=20 | Business owner | Paginated payment history scoped to the business. |

Pagination accepts page >= 1 and limit 1–100. Paginated responses contain the
payment array in `data` and the usual top-level `pagination` object.

Payment serialization includes id, businessId, reference, package snapshot,
amount, currency, paymentMethod, effective status, expiresAt, paidAt, and
createdAt. There is currently no payment-settlement endpoint or webhook route.

Important errors:

- 400 `VALIDATION_ERROR`: invalid body/query, unexpected body fields, invalid
  method (only `manual` is supported), or invalid amount/currency shape.
- 401: authentication required; 403: incorrect business role.
- 403 `SUBSCRIPTION_REQUIRED`: no currently active subscription for a paid write.
- 404 `PACKAGE_NOT_FOUND`: package is missing or inactive.
- 409 `PAYMENT_PENDING`: another checkout remains pending. Existing pending
  details are returned by the subscription read endpoint. Expired pending
  payments are released automatically when starting checkout.
- 409 `ACTIVE_PACKAGE_CHANGE`: an active subscription can only renew the same
  package. Select a different package after expiry in this initial version.
- 409 `TECHNICIAN_LIMIT_REACHED`: active plus pending unexpired invitations would
  exceed the purchased technician limit.
- 503 `PAYMENT_NOT_CONFIGURED`: set manual payment instructions as described above.

## Subscription and renewal rules

BusinessSubscription is unique by businessId. It stores packageId, the purchased
package snapshot, and currentPeriodStart/currentPeriodEnd. Effective status is
calculated on every read and paid operation; no expiry scheduler is required.
SubscriptionPayment is separate from ServiceInvoice (repair-customer billing).
Only one stored pending payment is allowed per business, enforced by a unique
partial index and a check before creating checkout.

Demo confirmation activates or extends the subscription using the saved invoice
snapshot. Real payment settlement requires a provider or manual verification workflow. There is no automatic charge,
proration, or refund implementation.

Each checkout freezes its price and package entitlements. The payment record
retains that purchase snapshot. Active same-package renewals preserve the
existing subscription entitlements for the extended continuous term; a new term
after expiry adopts the checkout snapshot. Catalog changes alone never alter
paid access. Duplicate successful confirmation returns the paid record without
extending the period again. Mismatched duplicate confirmations still fail.

Checkout and technician mutations use sequential checks before saving. Resending
or accepting an invitation excludes its existing seat from the capacity check,
so it does not count twice. Expired invitations do not occupy seats. There is no
transaction rollback or cross-request seat locking: concurrent technician
requests can exceed the limit. This tradeoff keeps the presentation app simple.
Email sending happens after the invitation is saved.

## Access enforcement

- No subscription means unpaid. Existing businesses are also unpaid until a
  demo payment is confirmed; no automatic paid plan or
  silent trial is granted.
- Service, customer, ticket, and repair-invoice operational writes require an
  active subscription. This includes authenticated customer self-submission.
- Login, business onboarding/settings, catalog/billing, existing record reads,
  public tracking, and customer invitation acceptance remain available. Existing
  customer invitations can be claimed to read prior service history.
- Technician invitations, resends, acceptance, reactivation, and profile writes
  check the subscription before saving. Active technicians and
  pending invitations whose expiry is still in the future occupy seats.
  Expired/revoked invitations and inactive technicians do not occupy seats.
- Deactivation remains available after subscription expiry so the owner can
  reduce seats before buying monthly access. Existing safeguards against
  deactivating a technician with unfinished tickets still apply.
- An owner cannot directly activate a never-accepted pending invitation; the
  recipient must accept using their verified matching email account.
- Monthly checkout and payment confirmation both recheck occupied seats.
  Reducing a limit never deletes technicians or tickets.
- Owner dashboard subscription data is now read from stored subscription state;
  the previous hardcoded annual package and 328 remaining days are removed.

## Remaining frontend/provider work

Replace the owner page's Starter/Pro/Enterprise demo cards with GET /packages,
connect checkout and billing/history views, and handle unpaid/expired states.
The landing page has the correct two packages but is still hardcoded. Implement
provider-specific checkout and signed webhook verification only after selecting
a provider; no settlement endpoint is currently exposed.

Before enabling this backend against existing deployed businesses, communicate
the unpaid-by-default behavior or perform an explicitly authorized migration.
No subscription records, paid history, or demo activations are fabricated here.

## Verification

TypeScript compilation is the implementation check. MongoDB topology was read
without modifying the server. No test files/frameworks/scripts were added, and
application/payment testing is left to the user as requested.

## Demo invoice and payment confirmation

- GET `/api/v1/businesses/:businessId/subscription/payments/:paymentId` returns
  `{ payment, instructions, demoConfirmationAvailable }`. Instructions normalize
  literal escaped newlines. This endpoint loads an invoice directly, independent
  of history pagination or navigation state.
- POST `/api/v1/businesses/:businessId/subscription/payments/:paymentId/confirm-demo`
  accepts no payment details; the invoice controls the amount and package.
  Returns `{ payment, subscription }`. Both endpoints require the authenticated
  owner of the specified business.
- Demo confirmation is disabled when NODE_ENV is production, returning
  `403 DEMO_PAYMENT_DISABLED`. Missing invoices return `404 PAYMENT_NOT_FOUND`;
  expired/failed invoices return `409 PAYMENT_NOT_PENDING`.
- Confirmation validates expiry, current-package renewal rules, and occupied
  technician seats before activating the subscription. It uses calendar-month
  or calendar-year arithmetic with UTC month-end clamping. An active same-package
  renewal extends the existing end date; an expired plan starts from now.
- A paid invoice returns its existing result on repeated confirmation. The
  subscription remembers lastPaymentId to avoid extending the period again if
  the payment write needs to be retried after the subscription was saved.
- Successful demo payments are stored with paymentMethod `demo` and paidAt.
  This is a simple sequential demo flow, without transactions or a payment gateway.
- The invoice page uses the direct endpoint, renders paid/pending/expired states,
  provides a clearly labeled demo button, and refreshes subscription, history,
  dashboard, and business-membership caches after confirmation.
