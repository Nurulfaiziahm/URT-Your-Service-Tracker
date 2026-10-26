# URT backend implementation plan

Prepared: 26 October 2026. Status: phase-by-phase design for a university assignment and presentation; no backend code changed.

Companion: [React frontend implementation plan](./FRONTEND_IMPLEMENTATION_PLAN.md).

## 1. Objective and current state

Extend `mern stack/api` into the backend for a working university demonstration of URT's owner, technician, and customer portals. Keep Express, TypeScript, MongoDB/Mongoose, Redis, Zod, and the current authentication/session system. Reuse mail and private R2 storage only where those features are included in the presentation. Implement one connected repair-ticket workflow before expanding into reports and optional billing screens.

**Assignment scope:** use a fresh dedicated demo database and sample accounts/data. Existing-data conversion, migration scripts, backup/cutover work, and production deployment are outside this plan. Focus on working CRUD, role-based access, persisted ticket progress, and a repeatable presentation. Subscription displays, contact import, external email, Google sign-in, and cloud attachments are optional enhancements unless required by the marking criteria. The local demo must work without a live payment provider. Keep basic authentication, validation, and role checks in the demonstrated features.

This plan is based on the mounted routes in `api/src/app.ts`, auth/user/product/upload modules, Mongoose models, security/configuration code, mail and storage services, the existing frontend plan, `../prd.md`, `../README.md`, the prototype portals, and `../urt.sql`. The SQL file is a domain reference; the current API uses MongoDB. Existing models alone do not establish a working API feature.

| Area | Current state | Planned treatment |
| --- | --- | --- |
| Authentication | Password/Google sign-in, registration, refresh rotation, Redis device sessions, account status, OTP verification/recovery, password changes | Retain; extend safe profile/session responses for portal context |
| Browser security | CSRF session/token, credentialed CORS, HttpOnly refresh cookie, rate limits, Helmet | Retain and apply consistently to new browser routes |
| User roles | Global `user` / `admin` | Keep separate from business-level owner/technician/customer access |
| Profile | Name/email persist; phone accepted by schemas but not persisted or returned | Align validation, storage, service inputs, and serializers |
| Users | Global admin listing | Retain for existing admin use; do not expose it as a business customer directory |
| Products | Ecommerce model; validators/controllers use incompatible name, price, and stock shapes | Leave outside the assignment workflow; implement repair services separately |
| Orders/delivery | Ecommerce-oriented models without mounted operational routes | Leave outside the URT repair demo |
| Uploads | Private R2 images/PDFs, uploader/admin access, product references | Reuse; add ticket association, visibility, and reference handling |
| Mail | Template renderer, SMTP, welcome/verification/reset templates | Reuse; add URT-specific messages as features need them |
| Business operations | No mounted businesses, repair services, technician/customer directories, or ticket APIs | Implement in the phases below |
| Finance | No mounted repair invoices, reports, subscriptions, or payment integration | Demonstrate repair receipts/reports after the core workflow; subscription screens are optional demo data |

This is static inspection, not evidence of live availability. MongoDB/Redis state, credentials, SMTP delivery, Google sign-in, and R2 operation remain unverified.

## 2. Implementation principles

- Follow the existing route → validation → controller → service → Mongoose pattern. Reuse `protect`, `getAuthUser`, `asyncHandler`, `AppError`, and `ResponseHandler`.
- Put permission checks and state transitions in the service that performs the operation, so another controller cannot bypass them. Use a small shared business-access helper only when multiple modules actually need it.
- Keep one Express application and one demo MongoDB database. No microservices, generic repository layer, permission engine, event bus, background-job framework, or additional database is needed for the assignment.
- MongoDB stores business records. Redis continues to store sessions, CSRF, OTP, and existing account-security data. Do not use Redis as the authoritative ticket or payment store.
- Keep helpers and types small and tied to implemented features. Retain the installed dependency versions initially; upgrades are separate work unless a feature requires them.
- The user handles testing. Add no test files, fixtures, frameworks, or test scripts unless explicitly requested. Implementation can still run existing type/build checks and provide a manual acceptance checklist.
- This document proposes contracts. Endpoint paths, model fields, and business rules below are not claims about currently available behavior.

## 3. Identity, business context, and access

Use global `User` for identity and login. Derive portal access from concrete business relationships:

| Relationship | Stored representation | Meaning |
| --- | --- | --- |
| Owner | `Business.ownerId` references `User` | Can manage that business |
| Technician | `Technician.businessId` + `Technician.userId`, active status | Can work on authorized tickets in that business |
| Customer | `Customer.businessId` + optional `Customer.userId` | Business contact; a linked user can access that customer's tickets |
| Platform admin | Existing global `User.role = admin` | Existing platform privileges only; business access is not silently granted |

This avoids changing global identity roles every time someone uses a different business. A customer can have separate contact records at multiple service centers. The initial owner experience manages one business; multiple branches and complex organization administration remain out of scope.

Add authenticated `GET /api/v1/me/businesses` returning only the caller's accessible businesses and portal roles, for example `{ businessId, slug, name, roles: ['owner'] }`. Query concrete relationships; no generic membership framework is necessary. Keep existing `user.role` compatible and make the frontend use this business context for portal routing. A person with multiple roles can select an available portal.

Owner onboarding should be: existing registration/sign-in → authenticated business creation → business settings → operational portal. Do not accept a privileged role in public registration or create a password for an already existing identity. Technician access is granted by an owner-controlled invitation; customer self-submission links only to the authenticated user.

Business-protected paths use `/api/v1/businesses/:businessId/...`. Resolve and validate the business, relationship, resource ownership, and active status on every operation. Never trust body `ownerId`, actor IDs, calculated totals, or a client-selected role. Apply `businessId` in the database query itself and in related-record lookups/populates.

Default access rules:

- Owner: business settings, service catalog, customers, technician invitations, all business tickets, assignment, operational reports, repair invoices, and subscription overview/payment initiation.
- Technician: own profile, assigned ticket queue/details, diagnosis, estimates, repair/QC updates, and own completed work. No assignment to another technician, customer directory, business billing, or unrelated tickets.
- Customer: own profile and linked tickets, new service requests, customer-visible estimates/timeline/attachments, approval, and own receipts/history.
- Public visitor: sanitized business identity/service catalog and protected minimal tracking lookup. No private ticket details or approval.

Deactivating a technician must stop business access immediately, without depending on token expiry. Reject deactivation while active tickets remain assigned, or require explicit reassignment first. Archived customer/service records remain available in existing ticket history but cannot be used for new intake.

For scoped objects outside the caller's access, return a consistent 404 without revealing another customer's or business's record. Return 403 when an authenticated caller attempts an operation their known relationship does not permit.

## 4. Data model plan

Create models as their phase is implemented. Do not create all collections upfront.

| Model | Main fields and invariants |
| --- | --- |
| `User` (extend) | Existing identity/security fields; optional phone/address; safe provider capability flags in responses. Do not return password hashes, Google subject IDs, auth versions, or session secrets |
| `Business` | Owner ID, unique normalized slug, name, address, phone, contact email, business hours, timezone, currency, active status, timestamps |
| `Technician` | Business ID, optional user ID until invitation acceptance, display name, normalized invitation email, phone, specializations, pending/active/inactive status, invitation hash/expiry when pending |
| `Customer` | Business ID, optional linked user ID, name, normalized email, phone/WhatsApp, address, active/archived status, claim invitation hash/expiry when used |
| `Service` | Business ID, name, description, device categories, base price, estimated duration, active/archived status. Repair service, not ecommerce product |
| `ServiceTicket` | Business ID, ticket code, customer ID, assigned technician ID, requested service ID when selected, device/intake snapshot, complaint, status, diagnosis, estimate revisions and decisions, expected completion, final summary, timestamps, revision, tracking-secret hash, attachment references, timeline |
| `ServiceInvoice` | Business/ticket/customer IDs, invoice number, frozen charge lines, currency, total, issued/void state, sample receipt entries, balance, issue date, revision, `isDemo: true`. Separate settlement state: unpaid/partial/paid |
| `SubscriptionInvoice` (optional) | Business ID, invoice number, plan snapshot, covered period, price/currency, sample invoice state, `isDemo: true`; used only if subscription screens are presented |

Keep diagnosis, estimate revisions/approval, status, and timeline together in the ticket initially. These are one repair workflow and commonly change together. Store actual attachment bytes in R2 and retain stable upload keys in MongoDB. Add a dedicated collection only when independent query or growth needs justify it.

If subscription screens are included, store a sample plan/status and starts/ends at on the demo business. Use a small server-side list of presentation plans and seeded demo invoices. Do not add payment-provider integration or subscription expiry restrictions to the core assignment workflow.

Money rules: use safe nonnegative integer amounts in an explicitly defined unit. Initial IDR amounts can use whole rupiah; freeze currency/unit on estimates and invoices. Compute line totals, discounts if supported, totals, and balances on the server; validate overflow. Do not use floating-point calculations for billing or accept a client-calculated total as authoritative. Add taxes/discounts only when their rules are supplied.

Time rules: store event timestamps in UTC, return ISO strings, and use the business's IANA timezone for report boundaries. Store date-only targets with an explicit interpretation; do not silently treat the developer's local timezone as the business timezone. Initial product defaults may use `id-ID`/IDR, but the business timezone must be specified.

Snapshot customer/device identifiers, service descriptions, approved prices, and invoice details where later editing must not alter historical records. Keep internal diagnosis/notes distinct from customer-visible explanations. Public tracking uses a separate allowlist serializer, not the internal ticket object.

## 5. Database connection, indexes, and consistency

When updating database setup, follow the repository preference: a small typed cached `connectDB()` helper with `conn` and `promise`, explicit `dbName`, `bufferCommands: false`, and otherwise default connection settings. Reset a rejected connection promise so a later deliberate attempt can connect. Await startup before listening; keep graceful disconnect. Preserve compatibility with the current startup exports where useful. Database code stays exclusively in the Node API; it must not enter the React bundle. [Mongoose 8 connection options](https://mongoosejs.com/docs/8.x/docs/api/connection.html) document `dbName` and `bufferCommands`.

Create only indexes supporting the implemented queries:

- Business slug unique; owner ID for ownership lookup.
- Technician `(businessId, userId)` unique only when user ID is present; business/email uniqueness for invitation identity where appropriate. Pending records must not collide on missing user IDs.
- Customer `(businessId, userId)` unique only for linked accounts; business/contact search indexes as needed. An unverified contact email must not automatically grant account access.
- Service `(businessId, active)` and service-name search if used.
- Ticket `(businessId, ticketCode)` unique; `(businessId, status, createdAt)`; `(businessId, customerId, createdAt)`; `(businessId, technicianId, status, createdAt)`.
- Invoice number uniqueness within its business and invoice family; service invoice `(businessId, ticketId)` unique through a partial index for `state: 'issued'`, enforcing one active invoice while retaining voided invoices.
- For repair receipt entries embedded in one invoice, use an atomic conditional write that rejects an already-recorded operation ID; a unique multikey index alone does not prevent repeated values inside one document. See [MongoDB multikey uniqueness](https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/).

Use opaque MongoDB IDs for resources. Generate a readable ticket code on creation with enough randomness and a unique index; do not use `countDocuments() + 1`. If sequential legal invoice numbering becomes a requirement, specify it separately and use a small atomic counter, not ticket counts.

Use an explicit ticket `revision` for mutations that could overwrite work. An update should match business ID, resource ID, allowed prior state, and expected revision, then atomically update the data and append its timeline entry. Return 409 `TICKET_CHANGED` on a stale write. Apply equivalent scoped conflicts to invoices.

MongoDB guarantees atomicity for a single-document write; operations spanning multiple documents require a transaction when partial completion would violate a real invariant. See [MongoDB atomicity and transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/). Embedding approval/state/timeline keeps a core ticket update to one write. For an included feature that needs transactions, use a transaction-capable MongoDB instance; keep optional attachment coordination outside the demo if that setup is unavailable. Subscription settlement/entitlement transactions are outside the assignment scope.

R2 and SMTP calls cannot be part of a MongoDB transaction. Persist business state first, then send optional mail; preserve the state if mail fails. File operations need explicit reference/deletion coordination and cleanup, using the existing pattern rather than pretending an external object write rolls back with MongoDB.

## 6. API contract conventions

Retain `/api/v1` and the existing response envelopes:

```json
{ "success": true, "message": "Ticket created", "data": {} }
```

```json
{ "success": false, "error": "Ticket changed. Refresh and review it.", "code": "TICKET_CHANGED" }
```

Keep paginated list `data` as an array and `pagination` at the top level, matching `ResponseHandler.paginated`. Validation errors retain `{ details: [{ field, message }] }`. Use 201 for creation, 200 for reads/updates, and consistent 204 only when no body is returned.

For new lists: validate `page >= 1`, `limit` from 1 to 100, bounded search length, known status filters, valid dates/IDs, and allowlisted sorting with a deterministic secondary ID sort. Escape search input used in regular expressions. Apply business and actor scope before filtering/pagination. Do not pass raw query operators into Mongoose. Apply compatible limits to existing list routes when touched.

Use strict request schemas for new domain mutations to catch unknown/misspelled fields. Validate both shape and cross-record meaning: technician/customer/service must belong to the same business; assigned technician must be active; customer must own the ticket when approving.

Reuse existing errors and add domain-specific codes only when the frontend acts on them: `BUSINESS_FORBIDDEN`, `TICKET_CHANGED`, `INVALID_STATUS_TRANSITION`, `ESTIMATE_CHANGED`, `ESTIMATE_NOT_APPROVABLE`, `CUSTOMER_NOT_LINKED`, `TECHNICIAN_HAS_ACTIVE_TICKETS`, `UPLOAD_IN_USE`, `INVOICE_CHANGED`, `PAYMENT_ALREADY_RECORDED`. Do not introduce another error class hierarchy.

All existing browser writes still need CSRF, including anonymous sign-in/recovery and proposed public tracking POST requests. Protected routes also require the bearer token. Continue rotating tokens and cookies exactly as the existing auth contract describes.

## 7. Proposed endpoint inventory

All paths below are relative to `/api/v1`. These are new/proposed unless explicitly described as existing. In this table, `B` means `/businesses/:businessId`; `T` means `B/tickets/:ticketId`.

| Area | Method and path | Access and behavior |
| --- | --- | --- |
| Current auth | Existing `/auth/*` routes | Preserve registration/login/Google/refresh/OTP/recovery/password/device-session contracts |
| Profile | Existing `GET`, `PUT /auth/profile` | Canonical account profile; extend persisted contact fields and safe capability response |
| Business context | `GET /me/businesses` | Authenticated caller's available businesses and roles |
| Create business | `POST /businesses` | Authenticated owner onboarding; server assigns caller as owner |
| Business settings | `GET`, `PUT B` | Owner; other roles receive only their safe business context |
| Public business | `GET /public/businesses/:slug` | Sanitized identity/hours and active catalog; no staff/customer directory |
| Repair services | `GET`, `POST B/services`; `GET`, `PUT B/services/:serviceId` | Owner manages; authorized clients read the permitted active catalog; PUT supports archive/reactivation |
| Customers | `GET`, `POST B/customers`; `GET`, `PUT B/customers/:customerId` | Owner directory, manual contacts, updates/archive; scoped history via ticket filters |
| Customer invitation | `POST B/customers/:customerId/invitation`; `POST /customer-invitations/accept` | Owner issues; verified signed-in identity accepts single-use invitation and links contact |
| Technicians | `GET B/technicians`; `GET`, `PUT B/technicians/:technicianId` | Owner manages; technician can view/update permitted own profile fields |
| Technician invitation | `POST B/technicians/invitations`; `POST B/technicians/:technicianId/invitation`; `POST /technician-invitations/accept` | Owner creates/resends; matching verified signed-in identity accepts; supports existing users |
| Ticket intake | `POST B/tickets` | Customer submits for self; owner records walk-in for a business contact |
| Ticket list | `GET B/tickets` | Owner all business tickets; technician assigned only; customer own only; filters cannot expand scope |
| Ticket detail | `GET T` | Role-specific serializer and allowed actions |
| Intake corrections | `PUT T/intake` | Owner, expected revision; defined editable fields before diagnosis/approval; no arbitrary status change |
| Assignment | `PUT T/assignment` | Owner only; active technician from the same business; timeline preserved |
| Diagnosis | `PUT T/diagnosis` | Assigned technician; owner may read, not silently impersonate technician |
| Estimate draft | `PUT T/estimate-draft` | Assigned technician; validated lines and target completion |
| Submit estimate | `POST T/estimates` | Assigned technician; creates immutable numbered snapshot and moves to awaiting approval |
| Approval | `POST T/approval` | Linked customer; exact estimate version, decision, expected ticket revision, optional bounded reason |
| Status transitions | `POST T/transitions` | Actor, allowed transition, expected revision, required QC/completion fields; no free-form status patch |
| Device handover | `POST T/handover` | Owner confirms collection after completion with expected revision; records actor/time and agreed collection details |
| Timeline | `GET T/timeline` | Role-filtered events; internal notes excluded from customer response |
| Attach files | `POST T/attachments` | Authorized actor, uploaded file key, intended visibility, expected revision; validate ownership and references |
| Detach files | `DELETE T/attachments/:key` | Authorized editor; preserve appropriate history and release reference |
| Ticket attachment URL | `GET T/attachments/:key` | Authorized ticket viewer receives fresh signed URL only if allowed that attachment |
| Tracking access | `POST T/tracking-access` | Owner issues/rotates a separate tracking secret; returned once; current ticket revision required |
| Public tracking | `POST /public/tracking` | Ticket code, business context, and separate tracking secret; minimal status response; strict rate limiting |
| Dashboard | `GET B/dashboard` | Role-specific aggregates and recent authorized tickets |
| Service invoices | `POST T/invoice`; `GET B/invoices`; `GET B/invoices/:invoiceId` | Owner issues/lists; linked customer reads own invoice |
| Record service payment | `POST B/invoices/:invoiceId/payments` | Owner records confirmed receipt, method/reference, amount and operation ID; atomic duplicate/balance check |
| Void invoice | `POST B/invoices/:invoiceId/void` | Owner; unpaid invoices only initially; correction reason required |
| Reports | `GET B/reports/overview` | Owner; bounded date range, timezone-aware totals/trends/SLA |
| Subscription plans (optional) | `GET /subscription-plans` | Read of clearly identified presentation plans |
| Subscription state (optional) | `GET B/subscription`; `GET B/subscription/invoices` | Owner only; sample presentation data |
| Subscription invoice (optional) | `GET B/subscription/invoices/:invoiceId` | Owner; seeded sample invoice marked as demo data; no money is collected |
| Customer import | `POST B/customers/import/preview`; `POST B/customers/import` | Owner; dedicated CSV multipart preview then confirmed import, bounded rows/file size and explicit duplicate policy |

Get a missing service/technician/customer record through scoped queries; never fall back to a global ID lookup. Do not hard-delete operational records referenced by tickets. Owner/technician/customer histories use the scoped ticket list with terminal-state filters rather than separate duplicate history storage.

Existing `/users/profile` can delegate to the same profile service to avoid two divergent implementations. Leave unrelated `/products` and admin routes outside the assignment work. Repair service APIs should be independently usable without ecommerce product cleanup.

## 8. Ticket lifecycle and rules

Use canonical English machine values with Indonesian UI labels in the frontend. Proposed normal sequence:

```text
submitted -> waiting_diagnosis -> diagnosing -> awaiting_approval
          -> approved -> repairing -> quality_check -> completed
```

Explicit branches:

- `awaiting_approval -> rejected`: customer declines the submitted estimate; repair cannot start.
- `rejected -> diagnosing`: owner/assigned technician reopens for a revised diagnosis/estimate with reason; original estimate and rejection remain recorded.
- `quality_check -> repairing`: QC fails; record the result and work required.
- `submitted` or `waiting_diagnosis -> cancelled`: customer/owner cancellation before work starts, with reason.
- `rejected -> cancelled`: owner closes a declined repair and arranges device return.

Initial default: `completed` means QC passed and repair is ready for pickup, matching the prototype's customer tracking. Store `readyAt` and a separate `handedOverAt` event for actual collection; add `POST T/handover` for the owner when implementing pickup. This avoids treating repair completion and collection as the same timestamp. If the product chooses different terminal statuses, align both plans before wiring the UI.

Rules by stage:

1. **Submission/intake:** customer ID comes from an authorized account link or explicit owner-selected contact. Snapshot device category/brand/model, complaint, received accessories/condition where used, service selection, and intake method. Delivery/logistics is not an implemented subsystem.
2. **Assignment:** assigned technician must belong to the business and be active. If unassigned or reassigned, preserve actor/time/reason. Historical actions retain their original actor. Changes after estimate approval require an explicit allowed policy, not arbitrary edits.
3. **Diagnosis:** persist internal findings separately from the customer-facing explanation. An estimate cannot be submitted without the required explanation, valid charge lines, and a completion target if promised.
4. **Estimate:** maintain a mutable draft plus immutable submitted revisions. Each revision freezes labor/parts descriptions, quantities, unit amounts, totals, currency, expected finish, submitting actor, and time. Do not overwrite an approved estimate.
5. **Approval:** bind to the exact current estimate revision and authenticated customer, atomically recording decision/time and new status. Reject stale or repeated conflicting decisions. Identical already-applied decisions can return the existing result without a second event.
6. **Changes after approval:** new costs require a new estimate revision and renewed customer consent. Never silently increase the approved total. Keep prior approvals attached to their own versions.
7. **Repair/QC:** allow only the assigned technician to progress normal work; validate prior status and record QC pass/fail findings. No direct jump from submission to completed.
8. **Completion/history:** record final work summary, ready time, confirmed final charge basis, optional agreed warranty duration/terms, and later handover. Warranty is absent unless explicitly stored; do not manufacture a warranty period in the UI.
9. **Concurrency:** require `expectedRevision` for state-changing commands; update status, estimate/approval, revision, and timeline together. Return the updated resource and allowed next actions for the actor.

Customer-visible timeline events should explain service progress; internal staff notes remain private. Avoid a generic endpoint accepting arbitrary timeline content from the browser. Keep event payloads and input arrays bounded; reassess embedded history growth if real usage approaches document limits rather than introducing event storage upfront.

## 9. Customer and technician identity linking

Owners can record a walk-in contact without creating a global login or choosing a password. Use `Customer.userId` only after proof of ownership. Do not automatically link accounts based on an owner-entered email, an unverified Google email, or a matching phone number.

For a contact claim/invitation: generate a cryptographically random single-use token, store its hash and expiry on the pending record, and require a signed-in account with the matching verified email to accept. Consume the token and set the user relationship atomically. Resending invalidates the old token. Manual contacts with no email remain owner-managed until an explicit verified linking process is available.

Technician invitations follow the same bounded token mechanism. Acceptance attaches an existing registered identity or follows normal registration first; the invitation never changes global role or automatically links Google/local identities. The owner can update business-specific technician contact/specializations without changing that user's password, provider, or global account email.

For customer self-submission, reuse or create the `(businessId, userId)` customer record for that exact signed-in user. Do not claim a similar existing unlinked contact without the invitation proof. Keep business contact details separate from global profile editing; an owner must not overwrite the user's login identity.

## 10. Public tracking, files, and notifications

**Tracking:** use the readable ticket code plus a separate high-entropy tracking secret, storing only its hash. Return the secret to authorized recipients when issued; provide an owner-controlled rotation flow if lost. Send it in the lookup request body, not in API URLs or logs. Public responses contain only the agreed device summary, current stage, safe dates, and customer-visible progress. Omit contact details, internal notes, attachments, full estimates, invoices, and approval permissions. Rate-limit failed lookups and use uniform failure responses. The frontend tracking page must collect the required access information rather than imply ticket-code-only private access.

**Files (optional enhancement):** reuse `/uploads` for new demo images/PDFs. Add ticket references with explicit `customer` or `staff` visibility. A fresh signed URL requires both authorized ticket access and attachment visibility. Uploader ownership alone must not allow re-sharing a private file into an unrelated business. Reject files being deleted, missing from storage, or attached under an incompatible scope.

Extend reservation/reference counting and deletion checks to ticket attachments as well as products. Prevent deletion while referenced, and coordinate attach/detach against the same file record. Use a transaction where file reference changes and ticket updates must commit together. Generalize only the small shared reservation operation that products and tickets actually use. Existing MIME/size checks do not establish content safety; validate declared file type against supported content before serving ticket uploads as that type. Keep the bucket private and return expiring URLs.

**Mail:** keep `mailService.sendTemplate`. Add URT-branded welcome copy and only the templates needed for technician/customer invitations, ticket received, estimate ready, and repair ready. Send after the database operation succeeds; email failure must not undo an approved estimate or completed repair. `sendTemplate` currently returns `false` on failure, so callers must inspect its result if reporting delivery. A saved ticket is not evidence of delivered mail. Initial mail is best effort with explicit invite/resend actions; no queue/retry infrastructure is required without a delivery guarantee.

WhatsApp contact fields and a manually copied message draft can be supported without a WhatsApp API. Automated WhatsApp/SMS, push notifications, and an in-app notification feed are separate integrations and are not implied by a bell icon in the prototype.

## 11. Repair invoices, reports, and subscriptions

**Repair invoices:** freeze invoice lines from the approved charge basis and any subsequently approved revisions. Keep repair completion, invoice issue, payment settlement, and handover separate. The initial policy is one active issued service invoice per ticket; an unpaid invoice may be voided with a reason and replaced by a new numbered invoice, retaining the original. A partial unique index prevents two active invoices. Paid invoice corrections/refunds require an explicit rule before enabling those actions.

For the assignment, an owner records a sample repair receipt without transferring money. Mark demo invoices/receipts clearly. Include server time, actor, method, reference, amount, and a client operation ID. Atomically reject duplicate operation IDs and overpayments, calculate paid/balance values server-side, and prevent edits that erase receipt history. Live online payment collection is outside scope.

**Reports/dashboard:** build MongoDB aggregations over scoped tickets and invoices first; no cached reporting subsystem is initially necessary. Agree on these definitions before exposing percentages:

- Active tickets: nonterminal repair states; show rejected tickets separately so they do not disappear from operational attention.
- Technician workload: assigned tickets that require or await work, using the same status definitions as the queue.
- Completion volume: `readyAt` within the selected reporting period, rather than `updatedAt` or handover time.
- Revenue: confirmed repair receipts by their receipt timestamp, excluding URT subscription payments; describe this as cash received if that is the chosen metric.
- SLA: eligible completed tickets ready by the last customer-approved target, divided by eligible completed tickets in the period. Exclude tickets with no promised target consistently across dashboard and reports; zero eligible tickets returns no percentage rather than a misleading 0%/100%.
- Subscription days/status: calculate from server time and entitlement dates; do not trust a frontend progress bar.

Use the business timezone for date filters and groupings. Bound report date ranges and expose enough totals for the frontend to label charts accurately. Warranty/history views read stored completion terms and dates.

**Subscriptions (optional presentation feature):** show a seeded plan, remaining days, and sample invoice history through owner-scoped reads. Mark responses/invoices as demo data. Seed active/expired/pending examples only if useful to explain the screens; do not block the repair presentation based on a sample subscription date. Payment-provider setup, webhook handling, payment confirmation, renewals, and commercial entitlement enforcement are outside the assignment scope. QRIS/Virtual Account illustrations must be labeled as demonstrations and must not claim a real payment was processed.

## 12. Contact import

Use a dedicated owner-only CSV import route, not the image/PDF upload endpoint. Agree on column names, normalization, required fields, maximum file size/row count, and duplicate rules. Begin with CSV; XLSX/XLS support requires a current user requirement and a parser decision.

Preview validates rows and returns proposed new contacts plus row-numbered errors/duplicates without writing. Confirmed import revalidates the submitted file; preview is not proof that later input is unchanged. Default to creating valid new unlinked contacts and reporting duplicates; do not overwrite linked identities or silently merge service histories. Return created/skipped/failed counts and per-row reasons. Make re-import behavior explicit, and sanitize exported spreadsheet text if export is added.

## 13. Module structure and implementation sequence

Continue the existing structure, creating each module only as needed:

```text
src/models/                       # Existing models plus URT domain models
src/modules/auth/                 # Existing auth, profile capabilities
src/modules/business/             # Onboarding, context, settings
src/modules/customer/             # Business contacts, linking, import
src/modules/technician/           # Profiles, invitations, active assignment rules
src/modules/service/              # Repair catalog
src/modules/ticket/               # Intake, scope, assignment, diagnosis, estimates,
                                  # approval, transitions, timeline, tracking
src/modules/upload/               # Existing storage routes, shared references
src/modules/invoice/              # Repair billing and payment records
src/modules/report/               # Scoped dashboard/report aggregations
src/modules/subscription/         # Optional demo plan and sample invoice reads
src/lib/mail/templates/           # Only the templates used by implemented flows
```

Keep ticket diagnosis/estimate/approval in the ticket module initially; they do not each require a new service architecture. Implement optional modules only when their screens are part of the presentation.

| Phase | Implementation scope | Completion checkpoint / frontend unlocked |
| --- | --- | --- |
| 0. Demo foundation | Use a fresh demo database; finalize roles/statuses and fix account/profile inconsistencies | React can connect to consistent profile/context responses without depending on ecommerce modules |
| 1. Business foundation | Business model/onboarding/context/settings, scoped owner access, customer contacts, technician invitations/acceptance, repair catalog, indexes | Owner setup and real operational directories; technician/customer relationships established |
| 2. Ticket intake and scope | Ticket model, readable code, self/walk-in intake, lists/details, assignment, scoped serializers, revision checks | Customer submission, owner ticket management, and assigned technician queue connect to real data |
| 3. Complete repair workflow | Diagnosis, estimate draft/revisions, approval/rejection, transitions, QC, completion/handover, timeline, warranty fields when specified | One persisted ticket can complete the workflow across all three accounts, including declined/stale/QC-failed paths |
| 4. Portal support | Role dashboards, histories, public tracking, archive rules; attachments/email if included | All three core portals and public tracking work with permitted data |
| 5. Repair finance and reports | Invoice issue/read/void, recorded payments/duplicate prevention, revenue/volume/SLA aggregates | Receipts, business transactions, and meaningful owner reports |
| 6. Optional presentation extras | Sample subscription/plan/invoice reads and customer CSV import, only if required for presentation | Additional screens can be demonstrated without live payment integration |
| 7. Demo data and presentation rehearsal | Sample users/tickets, local startup, existing build/type checks, and the complete presentation walkthrough | A repeatable university demo using the real backend and database |

The first presentation milestone is phase 3's persisted repair workflow. Phases 4–5 enrich the demonstration with dashboards, tracking, receipts, and reports. Phase 6 is optional. Frontend work can proceed alongside each phase using the agreed request/response behavior; identify sample financial/subscription data clearly.

### Phase execution rules

All phases below are pending. File paths are relative to `api/`. Create each feature's `*.routes.ts`, `*.schema.ts`, `*.controller.ts`, and `*.service.ts` only when implementing that feature; add a separate type/serializer/helper file only when its use warrants it. Mount finished routes in `src/app.ts`, keeping nested business IDs available to controllers and services.

For each phase: implement the ordered steps, run the existing TypeScript/build checks relevant to the changes, and give the user its manual completion scenarios. The checkpoints below describe expected outcomes, not checks already performed. Do not add tests, test scripts, API documentation, OpenAPI artifacts, or Postman setup as phase deliverables.

```text
Core presentation:  0 -> 1 -> 2 -> 3 -> 7
Portal/reporting:                  3 -> 4 -> 5 -> 7
Demo subscriptions:     1 -> optional 6A -> 7
Contact import:         1 -> 6B -> 7
```

The numbered sequence is the default delivery order. Import and sample subscription displays depend on the business/customer foundation and can be skipped if not needed for grading. Use phase 7 to prepare and rehearse the features included in the presentation. Sample accounts can be prepared once their models exist; do not wait until the final phase to try the complete flow.

### Phase 0 — Prepare the assignment foundation

**Depends on:** existing API only. **Outcome:** consistent account/profile behavior and clear defaults for the domain work.

**Files to update:** `src/models/User.model.ts`, `src/types/common.ts`, existing auth/user schemas and services, their response types/controllers as needed, `src/core/config/database.ts`, `src/core/config/index.ts`, and `src/server.ts`. Change `.env.example` only for values actually introduced. Do not modify unrelated ecommerce modules.

**Implementation order:**

1. Trace the current profile fields from validation through persistence and response. Add optional phone/address fields with bounded validation, persist registration phone where accepted, and return only the agreed safe profile fields. Distinguish omitted fields from an explicit supported clearing operation.
2. Use one account-profile service and response shape for `/auth/profile` and the existing `/users/profile` compatibility path. Keep email-change verification reset behavior and existing Google account-linking rules.
3. Add safe account capability fields such as `hasPassword` and `canChangePassword` where the frontend needs them. Derive these using explicitly selected data: `password` has `select: false`, so an unselected field cannot establish that an account lacks a password. Never serialize the hash or raw provider identifier.
4. Implement the small cached `connectDB()` described in section 5, point it at a fresh dedicated demo database such as `urt_demo`, and preserve awaited startup/disconnect behavior. Leave pool sizes/timeouts at defaults. Use new demo records; do not convert existing SQL or MongoDB data.
5. Establish the defaults used by later code: global identity stays `user`/`admin`; business relationships grant portal access; IDR amounts use whole rupiah; the business supplies its timezone; completed repair means ready for pickup; handover is separate.
6. Leave ecommerce products/orders outside the repair catalog and the presentation workflow; implement repair `Service` APIs independently.

**Completion checkpoint:** a profile write returns the fields that were actually persisted, both profile URLs agree, Google-only capability flags are accurate, and database startup still works with the explicit database name. Existing sign-in, refresh, OTP, and device-session behavior is preserved for the user's verification.

**Frontend unlocked:** connected account/profile/security screens. Business portal routing remains pending phase 1.

### Phase 1 — Business setup and operational directories

**Depends on:** phase 0. **Outcome:** a business has an owner, a repair catalog, real customer contacts, and technicians linked to accounts.

**Files to create:** `src/models/Business.model.ts`, `Customer.model.ts`, `Technician.model.ts`, `Service.model.ts`; feature files under `src/modules/business/`, `customer/`, `technician/`, and `service/`. Add `business.access.ts` inside the business module once the directories need shared access checks. Add invitation templates under `src/lib/mail/templates/` and update mail data types only as used.

**1A. Business and access:**

1. Create business schema/indexes and authenticated create/read/update operations. Set `ownerId` from the authenticated user. Initial scope is one owned business per user; enforce this with a unique owner index so concurrent onboarding cannot create duplicates. Validate slug, timezone, currency, contact fields, and business hours.
2. Add `/me/businesses`, initially resolving ownership and then adding technician/customer relationships as those features land. Return the union of available portal roles rather than changing global `User.role`.
3. Add narrow business-access checks that return the actual owner/technician/customer relationships. Each operation decides which relationships authorize it; do not introduce a role priority that accidentally hides another valid permission.
4. Add the sanitized public business-by-slug response. Include only public identity, hours/contact information approved for publication, and active services.

**1B. Services and customers:**

5. Implement owner service create/list/detail/update/archive. Store base price and duration independently from ecommerce stock/products. Exclude archived services from new customer selection while retaining them in existing records.
6. Implement owner customer create/list/detail/update/archive, including pagination/search. Manual contacts initially have no global user ID. Keep owner-edited business contact fields separate from global login details.
7. Implement customer invitation/resend/accept. Store hashed single-use tokens with expiry, require a matching verified signed-in email at acceptance, consume and link atomically, and handle the unique linked-account constraint without merging existing histories. Resend replaces the previous token.

**1C. Technicians:**

8. Implement owner technician invitation/list/detail/edit/resend/accept. Existing users sign in before accepting; new users follow existing registration/verification first. Store specialization/contact information on the business technician record. Add explicit pending/active/inactive behavior.
9. Allow a technician to edit only permitted own business profile fields. Keep owner-controlled status/assignment privileges separate. Until tickets exist, deactivation has no assignments to check; extend it in phase 2 before assignment is enabled.
10. Deliver invitations with the existing mail service after persistence. Return a safe pending-invitation result and a resend option if delivery is unavailable; do not return the token hash or claim delivery when the mail service returns `false`. Add a small template-copy step to the build when enabling these templates so invitations also render from `dist/`.

**Endpoints:** section 7's business/context/public-business, services, customers/customer invitations, and technicians/technician invitations routes.

**Completion checkpoint:** an owner can register/sign in, create a business, add services and a walk-in contact, invite a technician, and see that accepted technician's business context. An invited customer can link the intended contact. Another business's IDs grant no access; expired, mismatched, or reused invitation tokens fail.

**Frontend unlocked:** business onboarding/settings, owner directories, service catalog, technician profile, and correct portal selection.

### Phase 2 — Ticket intake, assignment, and scoped reading

**Depends on:** phase 1. **Outcome:** customer submissions and owner walk-in intake create persisted tickets that only the correct people can read.

**Files to create:** `src/models/ServiceTicket.model.ts`, the core `src/modules/ticket/ticket.*` files, and ticket serializer/access helpers when used. **Files to update:** technician deactivation service, business context resolution as needed, and route mounts.

**Implementation order:**

1. Define the ticket fields used now: business/customer/service references, device/intake snapshots, complaint, assigned technician, canonical status, revision, creation/intake times, and initial timeline. Add estimate/diagnosis fields in phase 3 and attachment fields in phase 4 when their operations exist.
2. Create business-scoped uniqueness and list indexes. Generate a readable random ticket code with the unique constraint; a collision may generate a fresh code once, while other database errors propagate normally. Do not add generic retry machinery.
3. Implement owner walk-in intake using an existing customer from that business. Validate any selected service and reject archived records. Set actor, business ID, timestamps, and starting state on the server.
4. Implement customer self-submission: require an active target business, find/upsert the exact `(businessId, userId)` customer relationship, then create the ticket. A new customer does not yet have a relationship, so this entry route must authenticate the user and business before resolving/creating that relationship. Do not require pre-existing membership or claim an unlinked contact by matching email.
5. Implement role-scoped list/detail responses. Owner reads all business tickets; technician reads assigned tickets; linked customer reads own tickets. Apply scope before search, filters, count, sorting, pagination, or related data lookup. Return a useful initial `allowedActions` list.
6. Implement owner assignment/reassignment and limited intake corrections with expected revision. Match an active technician from the same business. Record actor/time and preserve prior assignments in the timeline. Accept intake into `waiting_diagnosis` explicitly; do not infer physical receipt merely from an online submission.
7. Extend technician deactivation to reject when that technician still has active assigned work, requiring explicit reassignment first. Assignment and deactivation must conditionally update the same technician record within their transaction so concurrent requests cannot assign work to an inactive technician. A transaction that only reads the technician and writes the ticket does not coordinate both operations.
8. Implement early cancellation from the defined states. Keep all normal repair/approval transitions unavailable until phase 3 implements their checks.

**Endpoints:** ticket creation/list/detail, intake corrections, assignment, timeline, and permitted early cancellation through the transition route.

**Operational dependency:** use transaction-capable MongoDB for coordinated assignment/deactivation before enabling both operations. Keep unrelated single-ticket changes as atomic document updates.

**Completion checkpoint:** a customer submits, the owner accepts intake and assigns it, and the chosen technician sees it. A different customer/unassigned technician cannot read it; foreign business/customer/service/technician IDs fail; stale reassignment returns 409. Customer self-submission works for a first-time visitor to the business.

**Frontend unlocked:** customer submission/list/detail, owner intake/ticket list/assignment, technician queue, and initial histories/timelines.

### Phase 3 — Diagnosis through completion

**Depends on:** phase 2. **Outcome:** the first complete repair workflow across owner, technician, and customer accounts.

**Files to update:** `ServiceTicket.model.ts`, ticket schemas/controllers/services/serializers, and technician access checks where needed. Add small ticket-local calculation/transition helpers only when used by these operations.

**Implementation order:**

1. Add diagnosis with separate staff findings and customer-facing explanation. Enforce assignment and allowed state for starting diagnosis and editing findings.
2. Add an estimate draft with bounded labor/parts lines, integer quantities and whole-rupiah unit amounts, currency, and promised finish when supplied. Calculate totals on the server and reject unsafe/overflowing amounts.
3. Implement estimate submission: require necessary diagnosis information, freeze a new numbered revision, move to `awaiting_approval`, and append the event in one conditional ticket update. Draft edits cannot change an already-submitted revision.
4. Implement customer approve/reject against `estimateVersion` and `expectedRevision`. Match authenticated linked customer, current pending revision, and prior state in the write. Preserve the original decision and reject stale/conflicting actions.
5. Implement the explicit transition table from section 8, including rejected repair closure/reopening and QC failure. Every transition specifies permitted actor, source/target state, required fields, and the generated timeline event; no endpoint accepts arbitrary state replacement.
6. For changed costs after approval, permit the assigned technician to submit a new estimate from `approved` or `repairing`, atomically moving back to `awaiting_approval`. Pause further repair/QC transitions until the new revision is approved. Preserve previous approvals; rejection follows the agreed rejected-ticket resolution path. A diagnosis edit alone never revokes or changes a price decision.
7. Implement repair start, QC findings, QC pass/fail, and completion summary. Set `readyAt` only after passing QC; final charge basis must come from an approved estimate. Save warranty only if actual agreed terms are supplied.
8. Implement owner handover as a separate revision-checked action after completion. Record collector details only where needed, actor, and `handedOverAt`; repeated confirmation must not duplicate the event. Payment is tracked independently when phase 5 lands.
9. Return updated ticket state and actor-specific allowed actions after successful writes. Keep internal notes out of customer responses. Ensure timeline/refetch shows the same persisted result across accounts.

**Endpoints:** diagnosis, estimate draft/submission, approval, full permitted transitions, timeline, and handover, alongside existing ticket reads.

**Completion checkpoint:** submit → receive → assign → diagnose → estimate → approve → repair → QC → ready → handover works with separate accounts. Rejection, revised-cost approval, failed QC, an obsolete estimate, and a stale write each have a defined result. No actor can skip approval or overwrite another revision.

**Frontend unlocked:** complete service detail/approval/technician workflow and completed repair history. This is the core product milestone; billing integrations are not required to demonstrate it.

### Phase 4 — Dashboards, tracking, files, and service mail

**Depends on:** phase 3. **Outcome:** the operational portals get real summaries, safe public tracking, and shared ticket attachments.

Dashboard/history/tracking are the main presentation features here. Attachment and email steps are optional and can be skipped when those services are not included in the assignment.

**Files to create/update:** dashboard handlers under `src/modules/report/`, public tracking handlers within the ticket module, `ServiceTicket.model.ts`, `src/models/File.model.ts`, existing upload middleware/service and product-image reference helpers where shared behavior is needed, `src/core/security/rate-limiter.ts`, mail types/templates/renderer, and route mounts. Use small feature files; do not create a public-API framework.

**Implementation order:**

1. Add role-specific dashboard aggregates and recent tickets using the same access scope and status definitions as ticket lists. Reuse the ticket list for filtered history; do not create a second history store.
2. Complete archive rules for customers/services/technicians now that tickets reference them. Preserve historical snapshots and prevent invalid new intake/assignments.
3. Add hashed random tracking secrets and owner-controlled issuance/rotation through `POST T/tracking-access`. Generate on authorized request for demo tickets. Return the new secret only at issuance, never in routine ticket lists. Rotation invalidates the old secret.
4. Implement `POST /public/tracking` with business context, ticket code, secret verification, uniform lookup failure, strict rate limiting, and an allowlisted response. It remains subject to the current browser CSRF behavior. Exclude private notes, attachments, identity data, invoices, and approval actions.
5. Extend uploads to ticket association and visibility. Validate size, supported content/type, upload ownership, business context, and whether the file is already reserved/deleting. A file's business scope is fixed on first ticket association; subsequent attachments cannot move it to another business.
6. Implement attach/detach/reference updates and fresh download URLs. Authorize through the ticket relationship and attachment visibility. Coordinate file references and ticket revision atomically with transactions where both records must change together. Keep existing product references working and block deletion while any reference remains.
7. Add ticket-received, estimate-ready, and repair-ready templates and post-persistence calls. Keep business state successful when SMTP fails. Use Indonesian URT copy, IDR formatting, and explicit business timezone/date data; the current renderer defaults to ecommerce branding, USD, and US dates and must be aligned for these messages.
8. Extend phase 1's build template-copy step to include the service templates. Check runtime path resolution and the built renderer's branding/date/currency behavior.

**Operational dependency:** transaction-capable MongoDB is required before enabling transactional attachment/reference changes. R2/SMTP configuration is required for the corresponding feature, while dashboard/tracking work can proceed independently.

**Completion checkpoint:** dashboard counts match scoped tickets; public lookup exposes only safe fields and old secrets stop working after rotation. If included, attachment permissions/deletion rules work and service mail renders from the built application with correct business formatting.

**Frontend unlocked:** populated dashboards, public tracking, shared files, accurate service messages, and history/receipt data for print layouts.

### Phase 5 — Repair invoices, receipts, and reports

**Depends on:** phases 3–4. **Outcome:** authoritative repair charges and payment records feed business reports.

**Files to create:** `src/models/ServiceInvoice.model.ts`, feature files under `src/modules/invoice/`, and reporting operations under `src/modules/report/`. **Files to update:** ticket response fields where invoice links are required and route mounts.

**Implementation order:**

1. Add invoice fields, unique business invoice number, and the partial unique index for one active issued invoice per ticket. Freeze customer/business details and charge lines from the approved estimate revision; changing the catalog/profile later cannot rewrite an issued invoice.
2. Implement invoice issue/detail/list with owner/customer scope. Issue only from the agreed completed repair state and approved charge basis. Return an existing active invoice for a duplicate issue attempt or a clear conflict; never create a second active invoice.
3. Implement owner recording of sample receipts with amount, method, reference, operation ID, actor, and server time. Label these as demo records; no money is transferred. Atomically enforce revision, allowed invoice state, duplicate operation ID, and remaining balance while appending the receipt. Do not trust client settlement flags/totals.
4. Implement unpaid invoice void/reissue with a reason. Freeze old invoices, retain the old number, and issue a fresh numbered replacement. Keep paid/partially paid correction and refunds unavailable until the user supplies the policy.
5. Return printable invoice/receipt data. The React print layout consumes the same authoritative values; PDF generation is optional later work, not a prerequisite.
6. Add owner report aggregates for confirmed repair receipts, ready/completed volume, status distribution, technician workload, and agreed SLA. Use validated date ranges and the business timezone; exclude subscription receipts from repair revenue.
7. Extend dashboards with invoice/report values only when the underlying record exists. No data or no eligible SLA denominator returns an honest empty/null result, not a sample metric.

**Endpoints:** service invoice issue/list/detail/void, payment recording, report overview, and enriched dashboard.

**Completion checkpoint:** an approved completed repair produces a stable invoice; recording a receipt twice cannot double the payment; concurrent payments cannot overpay the invoice; another customer cannot read it. Report totals reconcile with stored receipts and ready dates for the selected business/date range.

**Frontend unlocked:** service transactions, invoice/receipt printing, cash-received reports, revenue trends, and SLA metrics.

### Phase 6A — Optional subscription presentation screens

**Depends on:** business ownership from phase 1. **Outcome:** sample plan and invoice information can be shown during the presentation without collecting money.

**Files to create only if included:** `src/models/SubscriptionInvoice.model.ts` and read handlers under `src/modules/subscription/`. **Files to update:** demo business plan fields, demo data script, and route mounts.

**Implementation order:**

1. Define a small set of sample presentation plans and mark them as demo data.
2. Add owner-scoped plan overview and sample invoice list/detail reads. Seed the business's plan and representative invoice records through the demo data script.
3. Calculate remaining days from server time; use relative demo dates so the prepared example does not expire before presentation day.
4. Keep displayed payment instructions/statuses explicitly illustrative. Do not add payment confirmation, provider credentials, webhook routes, or subscription restrictions that interrupt the repair demonstration.

**Completion checkpoint:** the owner sees consistent sample plan/invoice information, another account cannot see those business invoices, and the screens clearly identify the payment information as a demonstration.

**Frontend unlocked:** optional subscription overview, plan comparison, and sample invoice history. Live checkout/payment processing is outside scope.

### Phase 6B — Optional customer contact import

**Depends on:** phase 1 customer management. **Outcome:** owners can preview and import contacts without granting login access or corrupting history.

**Files to create/update:** import handlers, schemas, and the dedicated multipart middleware under `src/modules/customer/`; existing customer service; route mounts. A CSV parser dependency is justified only when implementing agreed CSV behavior; do not hand-parse CSV with string splitting or add Excel support pre-emptively.

**Implementation order:**

1. Finalize CSV headers, field normalization, row/file limits, and duplicate rules. Support quoted separators/newlines and an optional UTF-8 BOM through the selected small parser.
2. Implement owner-only preview without database writes. Return parsed counts, proposed valid contacts, duplicate indicators, and row-numbered validation errors without exposing another business's contacts.
3. Implement confirmed import by parsing/revalidating the supplied file again. Create only valid unlinked business contacts. Preserve linked records and report existing contacts as skipped according to the agreed policy.
4. Return deterministic created/skipped/failed results for partial imports; re-import must not silently create duplicate contacts. Enforce the agreed stable import identity with an appropriate database uniqueness constraint. Rows without a reliable identity need manual review rather than automatic merging.

**Completion checkpoint:** preview creates no records; accepted rows persist after confirmation; malformed rows and duplicate contacts have clear outcomes; repeated/concurrent imports follow the duplicate rule; no import links a global identity or merges ticket history.

**Frontend unlocked:** customer import preview, confirmation, and row-level results. XLSX/XLS remains a separate decision.

### Phase 7 — Demo data and presentation rehearsal

**Depends on:** the core workflow through phase 3 plus the additional phases included in the assignment. **Outcome:** the React app and backend support a predictable presentation with prepared sample data.

**Files to create/update only as needed:** a small `src/scripts/seed-demo.ts`, a `seed:demo` command in `package.json`, local configuration values, and existing build asset handling. The seed script prepares application data; it is not a test fixture or test runner. Do not create data-conversion or production rollout scripts.

**Implementation order:**

1. Prepare one demo business, an owner, a technician, and at least two linked customers using the actual models. Use sample identities and passwords hashed through the existing model behavior. Mark only deliberately seeded demo accounts as email-verified so the main walkthrough does not depend on SMTP.
2. Seed a few services and tickets at useful stages: waiting diagnosis, waiting approval, repair/QC, rejected, and completed. Use dates relative to the seed run and consistent estimates/timeline records. Add demo receipts/reports and optional subscription records only if those modules are included.
3. Make the seed command safe to rerun without duplicating accounts/tickets. Any explicit reset must be limited to identified sample records in the dedicated demo database; never drop unrelated databases or collections. Do not reset the data automatically on server startup.
4. Confirm local MongoDB and Redis startup, API/frontend ports, allowed frontend origin, and sign-in for each sample role. Configure SMTP/Google/R2 only for features actually being demonstrated. Keep secrets in the API environment.
5. Run existing build/type checks and check built template assets if email is included. Keep the core ticket walkthrough usable with password login and prepared accounts even when optional external services are unavailable.
6. Rehearse: customer submits → owner assigns → technician diagnoses/estimates → customer approves → technician repairs/QCs/completes → owner records handover. Show dashboard/history changes and the invoice/report if included. Use a second customer account to demonstrate access isolation.

**Completion checkpoint:** the prepared data loads repeatably, the three roles can complete the live persisted workflow, dashboards/history reflect actual records, and optional financial screens identify sample data clearly. The presentation can run locally without converting old data, deploying to production, or connecting a payment provider.

## 14. Local demo setup

Use a dedicated MongoDB database such as `urt_demo`, the existing Redis dependency, and fixed local API/frontend ports. Keep validated environment loading and the existing auth/CSRF behavior. Create required model indexes on the fresh demo data; existing-data inspection/conversion and production rollout are outside this assignment.

Store business settings in MongoDB and credentials only in the API environment. Prepare password-based sample accounts for the walkthrough; Google, SMTP, and R2 are needed only if their respective features are included. If email is included, ensure the compiled runtime contains the `.hbs` templates.

Sample data should cover the screens being presented and remain consistent with the implemented ticket rules. Clearly label sample receipts/subscription information. Hosting can be considered separately if the university requires a public link; it is not a prerequisite for the local presentation.

## 15. User-owned verification and open decisions

No tests were added or executed for this planning task. Later implementation should run existing applicable build/type checks and hand off these manual scenarios to the user:

- Existing auth, CSRF bootstrap/rotation, Google/local identity conflict, email OTP/recovery, device revocation, and session expiry still behave correctly.
- Owner onboarding yields only the caller's business; wrong-business IDs, forged customer/technician IDs, global role injection, and unassigned ticket access fail.
- Invitations require matching verified identity, expire, are single-use, and cannot be reused after resend or acceptance.
- Customer submission and owner walk-in intake persist; customer self-submission cannot claim an unrelated contact by email.
- Full diagnosis → versioned estimate → approve/reject → repair → QC → ready/handover lifecycle works across separate sessions; stale writes and revised prices cannot bypass consent.
- Internal notes are absent from customer/public responses; public tracking requires its separate secret. If uploads are included, staff attachments stay private and file attach/delete races cannot delete referenced uploads.
- Invoices preserve approved amounts, payment retries do not create duplicate receipts, and balances/reports match recorded payments and business timezone.
- Optional subscription screens show scoped sample data and do not claim a real payment or block the core presentation based on sample expiry dates.
- If mail/uploads are included, failures do not undo ticket actions or falsely report delivery; templates exist in the compiled build and unavailable SMTP/R2 has defined feedback.
- If CSV import is included, preview writes nothing; confirmation revalidates; duplicates and row errors are reported; linked identity/history is preserved.

Before implementing optional features, decide which screens the marking criteria require, the demo business timezone, any warranty terms, and whether CSV import or external email/uploads will be shown. Sample plan prices are presentation values; real payment processing, production policies, and existing-data conversion are outside scope. These decisions do not block the core service-ticket demonstration.
