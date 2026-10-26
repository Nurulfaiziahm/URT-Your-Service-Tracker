# URT application data documentation

This document describes the current React, Express, and MongoDB application under `urt/`. The repository also contains older PHP pages and a SQL dump (`urt.sql`); those are a separate legacy implementation and are not the data layer used by the React portal.

## Data sources

| Source | Use in the application |
| --- | --- |
| MongoDB | Main persistent application data. Mongoose connects to the configured Mongo URI and selects database `urt_demo` (`urt/api/src/core/config/database.ts`). The URI is supplied by environment configuration; credentials belong in deployment secrets or an ignored `.env`, never in this document. |
| Express REST API | React reads and updates MongoDB records through `/api/v1/...` endpoints. The frontend uses RTK Query (`urt/web/src/redux/baseApi.ts` and feature `*Api.ts` files). |
| Redis | Ephemeral authentication/session, OTP, and account-security state; it is not the primary business-record database. |
| Cloudflare R2 | Private file/image object storage. MongoDB stores metadata/references; API upload endpoints return short-lived download URLs. |
| Google Identity Services | Optional external identity provider for sign-in. The API verifies the browser credential and stores the app's Google identity reference on the user record. |
| SMTP | Optional outbound email for verification, password recovery, and service notifications. It is an outbound integration, not a source of application records. |
| Static frontend content | Legal/public copy and assets are held in source files (for example `urt/web/src/features/public/legal-content.ts` and `urt/web/public/`). No JSON fixture file is used as the portal's live business-data store. `urt/api/src/seeds/packages.seed.ts` supplies package seed data. |

## Main MongoDB records and fields

All Mongoose records have MongoDB `_id` identifiers; API serializers generally expose these as `id`. Most models also have `createdAt` and `updatedAt` timestamps. References such as `businessId`, `customerId`, and `ownerId` link related records.

| Record | Important fields (actual schema) |
| --- | --- |
| User | `firstName`, `lastName`, `email`, optional `phone`/`address`, `role` (`user` or `admin`), `status` (`active`, `inactive`, `suspended`), `isEmailVerified`; password hash and Google identity are authentication details. |
| Business | `ownerId`, `name`, `slug`, optional `address`, `phone`, `contactEmail`, `businessHours`, `timezone`, `currency`, and `isActive`. |
| Customer | `businessId`, optional linked `userId`, `name`, optional `email`, `phone`, `address`, and `status` (`active` or `archived`). |
| Service | `businessId`, `name`, optional `description`, `category`, `basePrice` (whole-number IDR amount), optional `estimatedDuration`, and `status` (`active` or `archived`). |
| Service ticket | `businessId`, `ticketCode`, `customerId`, optional assigned technician/service IDs, `device` snapshot, `complaint`, `intakeMethod` (`walk_in` or `online`), `status`, `revision`, diagnosis, estimate draft/revisions, work summary, quality check, warranty, handover, attachments, timeline, and lifecycle dates. Ticket statuses: `submitted`, `waiting_diagnosis`, `diagnosing`, `awaiting_approval`, `approved`, `rejected`, `repairing`, `quality_check`, `completed`, `cancelled`. |
| Technician | Business membership/profile and invitation details, including display name, contact information, and specializations (see `urt/api/src/models/Technician.model.ts`). |
| Invoice / subscription | Service invoices, business subscriptions, and subscription payments are persisted in their own MongoDB models. See `urt/api/src/models/ServiceInvoice.model.ts`, `BusinessSubscription.model.ts`, and `SubscriptionPayment.model.ts`. |
| File metadata | Upload metadata and object references are stored separately from binary file content, which resides in private R2 storage (`urt/api/src/models/File.model.ts`). |

Ticket subfields include device `category`, `brand`, `model`, optional `serialNumber`, `accessories`, and `condition`; estimate lines include `description`, `type` (`part` or `labor`), `quantity`, `unitPrice`, and `total`. Timeline events record status/action, actor, optional note, public visibility, and timestamp. Customer-facing serialization hides staff-only timeline notes/findings and estimate drafts.

## API used for the ticket list

The API is mounted under `/api/v1`. The main list endpoint is:

```http
GET /api/v1/businesses/{businessId}/tickets?page=1&limit=20&q=&status=&customerId=&technicianId=
Authorization: Bearer <access-token>
```

It requires an authenticated user with owner, technician, or customer access to that business. Pagination/filter parameters are optional. The Express handler returns a paginated response envelope (exact metadata follows the shared `PaginatedResponse` type); ticket objects are serialized from MongoDB and include populated customer/service/technician summaries when available.

Example response shape (illustrative values; no credentials):

```json
{
  "success": true,
  "data": [
    {
      "id": "66a100000000000000000001",
      "businessId": "66a100000000000000000010",
      "ticketCode": "URT-2026-0001",
      "customerId": "66a100000000000000000020",
      "customer": { "id": "66a100000000000000000020", "name": "Amina Putri", "email": "amina@example.com", "phone": "+628123456789" },
      "device": { "category": "Phone", "brand": "Example", "model": "Model A", "accessories": [], "condition": "Screen damaged" },
      "complaint": "Screen is cracked",
      "intakeMethod": "walk_in",
      "status": "waiting_diagnosis",
      "revision": 1,
      "estimateRevisions": [],
      "attachments": [],
      "timeline": [],
      "allowedActions": ["assign_technician", "correct_intake", "cancel", "start_diagnosis"],
      "createdAt": "2026-10-26T08:30:00.000Z",
      "updatedAt": "2026-10-26T08:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "pages": 1
}
```

The API's shared response helper and pagination type are authoritative for envelope metadata; refer to `urt/api/src/modules/ticket/ticket.controller.ts`, `urt/api/src/modules/ticket/ticket.serializer.ts`, and `urt/web/src/lib/api.types.ts` when changing this contract.

## Repeated list rendering

The reusable ticket list is rendered in `urt/web/src/features/tickets/TicketTable.tsx`. It receives the `tickets: ServiceTicket[]` property and maps every record into a table row keyed by its API `id`:

```tsx
{tickets.length ? (
  tickets.map((ticket) => (
    <tr key={ticket.id}>
      <td><Link to={`${path}/${ticket.id}`}>{ticket.ticketCode}</Link></td>
      <td>{ticket.device.brand} {ticket.device.model}</td>
      <td><TicketStatusBadge status={ticket.status} /></td>
    </tr>
  ))
) : (
  <tr><td colSpan={9}>Belum ada tiket servis.</td></tr>
)}
```

The actual table conditionally shows customer, technician, complaint, service, date, and estimate total columns by portal role and history mode.

## Related API routes

Ticket create/list/detail and updates are under `/api/v1/businesses/{businessId}/tickets`. The router also defines endpoints for assignment, intake edits, diagnosis, estimates, approval, status transitions, handover, invoice issuance, timeline, tracking access, and attachments. Public tracking uses `POST /api/v1/public/tracking` with the tracking lookup fields defined by `publicTrackingSchema`; it is rate limited and does not expose staff-only fields.

Other feature APIs are mounted under `/api/v1/auth`, `/users`, `/uploads`, `/packages`, `/me/businesses`, `/businesses`, `/public/businesses`, `/customer-invitations`, and `/technician-invitations` (see `urt/api/src/app.ts`).
