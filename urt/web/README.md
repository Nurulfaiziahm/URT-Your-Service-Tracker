# URT Web Application (Frontend SPA)

A modern, responsive Single Page Application (SPA) for **URT — Your Service Tracker**, built with **React 19**, **TypeScript**, **Vite**, **Redux Toolkit / RTK Query**, and **React Router v8**.

---

## 1. Quick Start

### Prerequisites
- **Node.js**: v20 or higher
- **URT Express API**: Running on `http://127.0.0.1:5000` (or configured proxy)

### Development Setup

1. **Install Dependencies**:
   ```bash
   cd "mern stack/web"
   npm install
   ```

2. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Default configuration:
   ```env
   VITE_API_BASE_URL=/api/v1
   # Optional Google OAuth client ID
   VITE_GOOGLE_CLIENT_ID=
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application runs at `http://localhost:5173`. API calls to `/api` are automatically proxied to `http://127.0.0.1:5000`.

4. **Lint and Type Check**:
   ```bash
   npm run lint   # Run ESLint
   npm run build  # Type-check with tsc -b and create production bundle
   ```

---

## 2. Architecture & File Structure

```text
mern stack/web/
├── public/                 # Static assets and favicon
├── src/
│   ├── app/                # App entry, router (AppRoutes), error boundaries
│   ├── redux/              # Single store, baseApi, baseQuery, hooks, sessionLifecycle
│   ├── styles/             # PRD tokens, reset.css, global.css
│   ├── layouts/            # PublicLayout, AuthLayout, PortalLayout, portal-navigation
│   ├── components/         # Shared UI: Button, TextInput, Brand, Feedback, Badges
│   ├── features/
│   │   ├── auth/           # Login, Register, VerifyEmail, ForgotPassword, ResetPassword, Guards
│   │   ├── account/        # Profile edit, Security (password, active devices, revocation)
│   │   ├── business/       # Business slice, Gateways (BusinessGate, RequireBusinessRole), settings
│   │   ├── public/         # Landing, PublicBusinessPage, TrackingPage, Legal, Unavailable
│   │   ├── owner/          # Dashboard, Tickets, NewTicket, TicketDetail, Customers, Technicians,
│   │   │                   # Services catalog, Invoices, InvoiceDetail, Reports, Subscription
│   │   ├── technician/     # Queue, Workload metrics, TechnicianTicketDetail
│   │   ├── customer/       # Dashboard, NewServiceRequest, CustomerTicketDetail
│   │   ├── tickets/        # ticketsApi, status, Stepper, Timeline, EstimateBreakdown,
│   │   │                   # EstimateEditor, DiagnosisForm, AssignmentModal, HandoverModal,
│   │   │                   # QCActionModal, TicketAttachments, PrintableTicketReceipt
│   │   ├── invoices/       # invoicesApi, InvoiceStatusBadge, RecordPaymentModal,
│   │   │                   # VoidInvoiceModal, PrintableInvoice
│   │   ├── dashboard/      # dashboardApi, stats & metrics types
│   │   └── reports/        # reportsApi, financial & SLA performance analytics
```

---

## 3. Canonical Route Mapping

### Public & Auth Routes
| Route | Component | Description |
| --- | --- | --- |
| `/` | `LandingPage` | Public homepage & feature showcase |
| `/portal` | `PortalSelectPage` | Workspace & portal role switcher |
| `/tracking/:ticketCode?` | `TrackingPage` | Public ticket tracking with secret code |
| `/b/:businessSlug` | `PublicBusinessPage` | Public store catalog and service request |
| `/b/:businessSlug/services/new` | `CustomerNewServicePage` | Authenticated first-time service submission |
| `/privacy`, `/terms` | `LegalPage` | Privacy policy & terms of service |
| `/login` | `LoginPage` | Email/password sign-in |
| `/register` | `RegisterPage` | Customer / Owner registration |
| `/verify-email` | `VerifyEmailPage` | OTP email verification |
| `/forgot-password` | `ForgotPasswordPage`| Recovery request |
| `/reset-password` | `ResetPasswordPage` | 2-step OTP password reset |

### Shared Account
| Route | Component | Description |
| --- | --- | --- |
| `/account/profile` | `AccountProfilePage` | Global profile edit & email verification banner |
| `/account/security` | `AccountSecurityPage`| Change password, active devices list, session revoke |

### Owner Portal (`/owner`)
| Route | Component | Description |
| --- | --- | --- |
| `/owner` | `OwnerDashboardPage` | Real-time metrics, active workload, recent tickets |
| `/owner/tickets` | `OwnerTicketsPage` | Ticket list with search and status filtering |
| `/owner/tickets/new` | `OwnerNewTicketPage` | Walk-in physical intake with customer picker |
| `/owner/tickets/:id` | `OwnerTicketDetailPage` | Full ticket detail, assignment, intake confirmation, handover, receipt printing |
| `/owner/customers` | `OwnerCustomersPage` | Customer directory, claim invitation, and CSV import |
| `/owner/technicians` | `OwnerTechniciansPage` | Technician team, invitations, workload |
| `/owner/services` | `OwnerServicesPage` | Repair service catalog CRUD |

| `/owner/transactions/:id`| `OwnerInvoiceDetailPage` | Invoice detail, recording payments, voiding, printing |
| `/owner/reports` | `OwnerReportsPage` | Revenue by payment method, completion volume, SLA compliance |
| `/owner/subscription` | `OwnerSubscriptionPage` | Subscription plan comparison & demo checkout |
| `/owner/settings` | `OwnerSettingsPage` | Store profile, hours, contacts, public slug |

### Technician Portal (`/technician`)
| Route | Component | Description |
| --- | --- | --- |
| `/technician`, `/technician/queue` | `TechnicianQueuePage` | Assigned ticket queue with workload metrics |
| `/technician/tickets/:id` | `TechnicianTicketDetailPage` | Diagnosis, estimate editor, repair & QC actions |

### Customer Portal (`/customer`)
| Route | Component | Description |
| --- | --- | --- |
| `/customer` | `CustomerDashboardPage` | Active service overview, decision alerts, history |
| `/customer/services/new` | `CustomerNewServicePage` | Online service request submission |
| `/customer/services/:id` | `CustomerTicketDetailPage` | Real-time status, estimate approval/rejection card, warranty |

---

## 4. Legacy Prototype Mapping

| Legacy Prototype Path | Modern SPA Canonical Route |
| --- | --- |
| `index.html` | `/` |
| `privacy.html`, `terms.html` | `/privacy`, `/terms` |
| `owner/login.html` | `/login` |
| `owner/register.html` | `/register` |
| `owner/beranda-owner.html` | `/owner` |
| `owner/tiket-servis.html` | `/owner/tickets` |
| `owner/pelanggan.html` | `/owner/customers` |
| `owner/teknisi.html` | `/owner/technicians` |
| `owner/layanan.html` | `/owner/services` |
| `owner/pembayaran.html` | `/owner/transactions` |
| `owner/laporan.html` | `/owner/reports` |
| `owner/subscription.html` | `/owner/subscription` |
| `owner/pengaturan.html` | `/owner/settings` |
| `teknisi/antrean.html` | `/technician/queue` |
| `pelanggan/pengajuan-servis.html` | `/customer/services/new` |
| `pelanggan/riwayat-servis.html` | `/customer` |

---

## 5. Production Deployment

### Building Static Assets
```bash
npm run build
```
The optimized bundle is placed in the `dist/` directory.

### Serving with Nginx / Reverse Proxy
Example Nginx server block with client-side routing fallback:
```nginx
server {
    listen 80;
    server_name urt.example.com;
    root /var/www/urt/dist;
    index index.html;

    # Client-side router fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Reverse proxy API requests to Express backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Acceptance Verification Checklist

- [x] **Authentication & CSRF**: Session restored on reload, in-memory tokens, device revocation.
- [x] **Business Multi-Tenancy**: Isolated business contexts, portal switcher, role gateways.
- [x] **Ticket Intake**: Customer self-submission & Owner walk-in intake with customer picker.
- [x] **Assignment & Queue**: Real-time technician assignment and workload metrics.
- [x] **Diagnosis & Estimates**: Internal technical findings vs. customer explanations, versioned estimate drafts & submissions.
- [x] **Customer Approval**: Immutable consent record with approve/reject actions.
- [x] **Repair, QC & Handover**: Enforced status transitions, QC inspection pass/fail, warranty generation, and device handover.
- [x] **Public Tracking**: Rate-limited, allowlisted tracking lookup requiring high-entropy secret.
- [x] **File Attachments**: Shared uploads via Cloudflare R2 with customer vs. staff visibility.
- [x] **Physical Receipts & Invoices**: Clean printable claim receipts and service invoices with `@media print`.
- [x] **Finance & Reports**: Invoice issuance, manual payment recording, unpaid invoice voiding, revenue breakdowns, and SLA performance reports.
- [x] **CSV Customer Import**: Client-side parsing, column validation, duplicate detection, and batch import.
- [x] **Type Safety & Lint**: Zero ESLint errors/warnings, production Vite build passes in `< 500ms`.
