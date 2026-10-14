# URT --- Product Requirements Document (PRD)

**Product:** URT --- Your Service Tracker\
**Document:** Product Requirements Document + UI/Design System
Specification\
**Version:** 1.0\
**Status:** In Development\
**Primary Language:** Indonesian for product UI; English for product
documentation\
**Design Reference:** URT design assets, UI prototype, component/state
references, and responsive layout specifications

------------------------------------------------------------------------

## 1. ROLE --- ROLE & PERSONA

URT is a service-management and service-tracking platform connecting
service-center owners, technicians, and customers in one structured
workflow.

### 1.1 Service Center Owner / Manager

**Role:** Business owner or manager of a small-to-medium service center.

**Goals** - Manage service operations in one place. - Monitor incoming
and ongoing service tickets. - Manage customers and technicians. -
Configure services and pricing. - Monitor transactions and operational
reports. - Provide a more professional customer experience.

**Pain Points** - Service records are scattered across WhatsApp,
notebooks, and spreadsheets. - Difficult to know the current status of
every device. - Difficult to monitor technician workload. - Customer
information is not consistently organized. - Manual follow-ups consume
operational time. - Service and transaction information can become
inconsistent.

**Primary Tasks** - Create and manage service records. - Assign or
manage technicians. - Review customer and ticket information. - Monitor
service progress. - Manage services and pricing. - Review transactions
and reports. - Manage subscription/account settings.

------------------------------------------------------------------------

### 1.2 Technician

**Role:** Technician responsible for diagnosing, estimating, repairing,
and completing service tickets.

**Goals** - See assigned and available service tickets. - Understand
device and customer information quickly. - Record diagnosis and repair
information. - Create service estimates. - Update service status. -
Complete and review service history.

**Pain Points** - Service requests may contain incomplete information. -
Customer communication is scattered. - Manual status updates are easy to
forget. - Previous service records are difficult to find. - Repeatedly
checking messages interrupts technical work.

**Primary Tasks** - Login to the technician portal. - View dashboard and
service queue. - Open ticket details. - Perform and record diagnosis. -
Create cost/time estimates. - Update service progress. - Complete
tickets. - Review service history and profile.

------------------------------------------------------------------------

### 1.3 Customer

**Role:** Customer who submits a device for repair and wants visibility
into its progress.

**Goals** - Submit a service request easily. - Understand the initial
service information. - See diagnosis and estimated cost. - Approve or
reject the estimate. - Track service progress without repeatedly
contacting the service center. - Review completed service history.

**Pain Points** - Does not know whether the device has been checked. -
Has to repeatedly ask the service center for updates. - Diagnosis and
cost can be unclear. - Completion time is uncertain. - Service
information can be lost inside chat conversations.

**Primary Tasks** - Register or login. - Submit a service request. -
View service details. - Review diagnosis and estimate. - Approve
service. - Track service status. - Review service history. - Manage
profile.

------------------------------------------------------------------------

## 2. CONTEXT --- DESIGN CONTEXT

### 2.1 Product Background

Many small and medium service centers still manage service operations
using notebooks, spreadsheets, and WhatsApp conversations. This creates
fragmented information and makes it difficult for owners, technicians,
and customers to share the same service status.

URT transforms this process into a structured digital workflow.

### 2.2 Design Problem

The product must make service information understandable and actionable
for three different roles without creating unnecessary complexity.

The interface must answer these questions quickly:

-   What service needs attention?
-   What is the current status?
-   Who is responsible?
-   What has already been diagnosed?
-   What is the estimated cost?
-   Is customer approval required?
-   What should happen next?

### 2.3 Design Goals

1.  **Clarity** --- Important information must be easy to scan.
2.  **Simplicity** --- Common tasks should require minimal interaction.
3.  **Transparency** --- Customers should understand service progress.
4.  **Efficiency** --- Owners and technicians should manage operational
    data quickly.
5.  **Consistency** --- Components, states, spacing, and terminology
    should remain consistent.
6.  **Responsiveness** --- Interfaces must adapt to desktop, tablet, and
    mobile.
7.  **Accessibility** --- Text, controls, states, and hierarchy must
    remain understandable.
8.  **Data focus** --- Visual decoration must not compete with
    operational information.

### 2.4 Prototype and Design Assets as References

The supplied URT design assets and prototype are part of the product
specification.

They define: - visual language, - color tokens, - typography
hierarchy, - spacing, - sizing, - border radius, - elevation, - motion
timing, - responsive grid behavior, - button states, - atomic UI
components, - tracker/status presentation, - portal-oriented dashboard
patterns.

The implementation should use these assets as the visual source of truth
unless a later design decision explicitly supersedes them.

------------------------------------------------------------------------

# 3. CONSTRAINTS --- USER STORIES & SCOPE

## 3.1 Customer User Stories

### Registration and Access

-   As a customer, I want to create an account so that I can manage my
    service requests.
-   As a customer, I want to login so that I can access my service
    information.
-   As a customer, I want the registration process to be simple so that
    I do not abandon it.

### Service Request

-   As a customer, I want to submit a service request so that the
    service center can process my device.
-   As a customer, I want to provide the initial problem description so
    that the technician has useful context.
-   As a customer, I want to see my submitted service information so
    that I can verify it.

### Diagnosis and Approval

-   As a customer, I want to see the technician's diagnosis so that I
    understand the problem.
-   As a customer, I want to see the estimated cost and service time
    before repair.
-   As a customer, I want to approve or reject the estimate.

### Tracking

-   As a customer, I want to track my service status so that I do not
    need to repeatedly contact the service center.
-   As a customer, I want to know the latest service update.
-   As a customer, I want to review completed services.

------------------------------------------------------------------------

## 3.2 Technician User Stories

### Access

-   As a technician, I want to login securely so that I can access my
    work.
-   As a technician, I want to see my dashboard so that I understand
    today's workload.

### Queue and Ticket

-   As a technician, I want to see the service queue so that I know
    which tickets require action.
-   As a technician, I want to open ticket details so that I can
    understand the device and customer issue.
-   As a technician, I want to update the ticket status so that the
    service center and customer see accurate progress.

### Diagnosis and Estimate

-   As a technician, I want to record a diagnosis so that the service
    problem is documented.
-   As a technician, I want to create an estimate so that the customer
    can make an informed decision.
-   As a technician, I want to record repair information so that the
    service history is complete.

### Completion

-   As a technician, I want to mark a ticket as completed so that the
    service workflow can close.
-   As a technician, I want to view completed tickets so that I can
    review previous work.

------------------------------------------------------------------------

## 3.3 Owner User Stories

### Dashboard

-   As an owner, I want to see operational metrics so that I understand
    the current state of the business.
-   As an owner, I want to see recent tickets so that I can identify
    work requiring attention.

### Service Management

-   As an owner, I want to manage service tickets so that operations are
    organized.
-   As an owner, I want to manage services and pricing so that
    technicians and customers receive consistent information.

### Customer Management

-   As an owner, I want to view customer information so that I can
    manage service relationships.
-   As an owner, I want to see a customer's service history.

### Technician Management

-   As an owner, I want to manage technician accounts so that the right
    people can access operational tasks.
-   As an owner, I want to view technician information and workload.

### Transactions and Reports

-   As an owner, I want to view transactions so that financial activity
    is organized.
-   As an owner, I want to view reports so that I can evaluate
    operations.

### Subscription

-   As an owner, I want to manage my subscription so that the business
    can continue using the platform.

------------------------------------------------------------------------

## 3.4 In Scope

### Customer Portal

-   Registration
-   Login
-   Customer dashboard
-   Service request
-   Service detail
-   Diagnosis and estimate
-   Approval
-   Service tracking
-   Service history
-   Customer profile

### Technician Portal

-   Login
-   Technician dashboard
-   Service queue
-   Ticket detail
-   Diagnosis
-   Estimate
-   Service summary
-   Service history
-   Completed tickets
-   Technician profile

### Owner Portal

-   Owner dashboard
-   Service management
-   Customer management
-   Technician management
-   Service management
-   Transactions
-   Reports
-   Subscription management
-   Owner profile
-   Business information

### Platform

-   Authentication
-   Role-based access
-   Service ticket lifecycle
-   Status tracking
-   Customer approval
-   Operational data management
-   Responsive UI
-   Reusable design system

------------------------------------------------------------------------

## 3.5 Out of Scope

The following are outside the initial product scope:

-   Physical device repair itself.
-   Device delivery or logistics management.
-   Third-party marketplace integration.
-   Advanced accounting/ERP functionality.
-   AI-based automatic diagnosis.
-   Advanced enterprise multi-branch management.
-   Advanced business intelligence and predictive analytics.
-   Automated procurement and supplier management.

These may be considered in future versions.

------------------------------------------------------------------------

# 4. DELIVERABLES --- SUCCESS CRITERIA

## 4.1 Product Success Criteria

The product is successful when:

1.  All three roles can access the appropriate portal.
2.  The service workflow is connected from request to completion.
3.  Service status can be tracked clearly.
4.  Customers can understand progress without repeatedly contacting the
    service center.
5.  Technicians can manage tickets from diagnosis through completion.
6.  Owners can monitor and manage operational activity.
7.  Service data is presented consistently across the product.
8.  Navigation contains no intentional dead ends or broken links.
9.  UI states are consistent with the URT Design System.
10. The prototype can progressively evolve into a working CSS/JavaScript
    application and later connect to backend and database services.

------------------------------------------------------------------------

## 4.2 UX Success Criteria

### Customer

-   A customer can find the current service status quickly.
-   A customer can understand the diagnosis and estimate.
-   Approval actions are clearly differentiated from secondary actions.
-   Tracking information is visible without unnecessary navigation.

### Technician

-   A technician can identify pending tickets quickly.
-   Ticket details are easy to scan.
-   Diagnosis and estimate actions are clearly separated.
-   Completed tickets remain accessible through history.

### Owner

-   Dashboard information is scannable.
-   Operational actions are visually prioritized.
-   Tables and cards support quick comparison.
-   Sidebar navigation clearly indicates the current section.

------------------------------------------------------------------------

# 5. SERVICE WORKFLOW

The primary service lifecycle is:

``` text
Customer
   ↓
Service Request
   ↓
Service Ticket
   ↓
Technician Review
   ↓
Diagnosis
   ↓
Estimate
   ↓
Customer Approval
   ↓
Repair
   ↓
Quality Check
   ↓
Completed
   ↓
Service History
```

## 5.1 Service Statuses

  -----------------------------------------------------------------------
  Status                  Meaning                 Semantic Color
  ----------------------- ----------------------- -----------------------
  Pengajuan               Customer submitted a    Neutral
                          service request         

  Menunggu Diagnosis      Ticket is waiting for   Neutral
                          technician diagnosis    

  Diagnosis               Technician is checking  Info / neutral
                          the device              

  Menunggu Persetujuan    Estimate is waiting for Warning
                          customer approval       

  Disetujui               Customer approved the   Success
                          service                 

  Dalam Pengerjaan        Repair is in progress   Success

  QC                      Repair is undergoing    Info
                          quality checking        

  Selesai                 Service has been        Success
                          completed               
  -----------------------------------------------------------------------

Status colors must communicate state, not act as decoration.

------------------------------------------------------------------------

# 6. PORTAL INFORMATION ARCHITECTURE

## 6.1 Customer

``` text
Login
└── Beranda Pelanggan
    ├── Pengajuan Servis
    ├── Detail Servis
    ├── Persetujuan Servis
    ├── Tracking Servis
    ├── Riwayat Servis
    └── Profil Pelanggan
```

## 6.2 Technician

``` text
Login
└── Beranda
    ├── Antrean Servis
    ├── Detail Tiket
    ├── Estimasi Servis
    ├── Ringkasan Servis
    ├── Riwayat Servis
    ├── Tiket Selesai
    └── Profil
```

## 6.3 Owner

``` text
Login
└── Beranda Owner
    ├── Layanan
    ├── Pelanggan
    ├── Teknisi
    ├── Transaksi
    ├── Laporan
    ├── Langganan
    ├── Profil
    └── Pengaturan / Business
```

------------------------------------------------------------------------

# 7. URT DESIGN SYSTEM / UI SPECIFICATION

## 7.1 Design Direction

URT uses a minimal, professional, data-oriented interface.

Primary visual characteristics: - Neutral light canvas. - Dark navy for
navigation and strong text. - Blue for primary actions and focus. -
Green, orange, and red for tracker states. - Thin borders. - Moderate
corner radius. - Low-to-moderate elevation. - Strong typographic
hierarchy. - Compact operational controls. - Large whitespace around
major sections.

The interface should feel like a modern SaaS operations platform rather
than a consumer social application.

------------------------------------------------------------------------

# 8. COLOR TOKENS

## 8.1 Color Primitives

  Token          Value       Usage
  -------------- ----------- -------------------------------------
  Navy / 950     `#0F172A`   Strong navigation, primary headings
  Navy / 800     `#1E293B`   Secondary dark surfaces
  Slate / 600    `#475569`   Secondary text
  Slate / 400    `#94A3B8`   Muted text
  Slate / 200    `#E2E8F0`   Borders
  Slate / 50     `#F8FAFC`   Main canvas / soft surfaces
  Blue / 600     `#2563EB`   Primary action
  Blue / 700     `#1D4ED8`   Hover / stronger action
  Green / 600    `#16A34A`   Success / active
  Orange / 600   `#EA580C`   Warning
  Red / 600      `#DC2626`   Danger / destructive
  Purple / 600   `#7C3AED`   Information

## 8.2 Semantic Colors

  Semantic Token     Value       Meaning
  ------------------ ----------- ----------------------------------
  Action / Primary   `#2563EB`   Primary action and focus
  Surface / Canvas   `#F8FAFC`   Main page background
  Surface / Card     `#FFFFFF`   Cards and content containers
  Text / Strong      `#0F172A`   Main headings and important text
  Text / Muted       `#94A3B8`   Supporting text
  Border / Default   `#E2E8F0`   Borders and dividers
  Status / Success   `#16A34A`   Successful/active states
  Status / Warning   `#EA580C`   Attention required
  Status / Danger    `#DC2626`   Error or destructive state
  Status / Info      `#7C3AED`   Informational state

### Color Usage Rule

Use the primary palette approximately as:

``` text
60% — light/neutral surfaces
30% — navy/dark structural elements
10% — blue accent/actions
```

Green, orange, red, and purple are reserved primarily for semantic
states.

------------------------------------------------------------------------

# 9. TYPOGRAPHY

The design uses a modern sans-serif hierarchy.

## 9.1 Typography Scale

  Level             Size   Weight Usage
  --------------- ------ -------- ------------------------------------
  Display           36px      700 Large documentation/hero heading
  Page Title        28px      700 Main page title
  Section Title     20px      700 Section heading
  Card Title        16px      700 Card heading
  Body              14px      400 Standard content
  Small             12px      400 Supporting text
  Micro / Label     11px      700 Labels, metadata, uppercase labels

## 9.2 Typography Rules

-   Use `#0F172A` for strong headings.
-   Use `#475569` for secondary body content.
-   Use `#94A3B8` for muted metadata.
-   Avoid excessive font-weight variation.
-   Keep labels short and action-oriented.
-   Use sentence case for most UI labels.
-   Use uppercase only for small metadata/micro labels where
    appropriate.

------------------------------------------------------------------------

# 10. SPACING SYSTEM

Base unit: **4px**.

Recommended scale:

  Token     Value
  ------- -------
  04          4px
  08          8px
  12         12px
  16         16px
  20         20px
  24         24px
  28         28px
  32         32px
  40         40px

Use the scale consistently rather than creating arbitrary spacing
values.

Typical application: - Icon-to-text: 8px - Input internal spacing:
12--16px - Card padding: 20--24px - Section gap: 24--40px - Desktop page
margins: approximately 80px where appropriate - Mobile page margins:
approximately 16px

------------------------------------------------------------------------

# 11. COMPONENT SIZING

  Component         Size
  -------------- -------
  Icon              18px
  Control / SM      32px
  Control / MD      40px
  Control / LG      48px
  Avatar            36px
  Top bar           68px
  Sidebar          260px

Primary action buttons may use approximately **44px** height in larger
form/action contexts.

------------------------------------------------------------------------

# 12. BORDER RADIUS

The system uses restrained rounded corners.

  Token     Radius Usage
  ------- -------- ----------------------
  SM           6px Small controls
  MD           8px Inputs/buttons
  LG          12px Cards
  XL          16px Larger containers
  Pill       999px Status chips / pills

Default component radius: approximately **8--12px**.

Use larger radii only where the component requires stronger grouping.

------------------------------------------------------------------------

# 13. BORDER

Default border:

``` text
1px solid #E2E8F0
```

Emphasized border:

``` text
2px solid #2563EB
```

Borders should remain subtle and should not visually dominate content.

------------------------------------------------------------------------

# 14. ELEVATION

Elevation is used sparingly.

  Level     Usage           Example
  --------- --------------- ---------------------
  Level 0   No shadow       Page canvas, tables
  Level 1   Light shadow    Cards
  Level 2   Medium shadow   Dropdowns
  Level 3   Strong shadow   Modals

Reference shadow patterns:

``` text
Card:
0 8px 24px / approximately 4% opacity

Floating:
0 16px 40px / approximately 10% opacity
```

Elevation should establish hierarchy, not decoration.

------------------------------------------------------------------------

# 15. MOTION

Motion should be short, functional, and unobtrusive.

  Timing       Duration Easing                         Usage
  ---------- ---------- ------------------------------ ------------------------
  Instant         100ms linear                         Micro feedback
  Fast            160ms cubic-bezier(0.2, 0, 0, 1)     Hover / pressed
  Standard        240ms cubic-bezier(0.2, 0, 0, 1)     Panels / dropdowns
  Slow            320ms cubic-bezier(0.4, 0, 0.2, 1)   Modal/page transitions

Avoid excessive animation in operational screens.

------------------------------------------------------------------------

# 16. RESPONSIVE GRID

## Desktop

Breakpoint:

``` text
≥ 1200px
```

Grid:

``` text
12 columns
24px gutter
80px margin
```

## Tablet

Breakpoint:

``` text
768px–1199px
```

Grid:

``` text
8 columns
20px gutter
32px margin
```

## Mobile

Breakpoint:

``` text
≤ 767px
```

Grid:

``` text
4 columns
16px gutter
16px margin
```

### Responsive Rules

-   Desktop content should use a constrained maximum width where
    appropriate.
-   Cards may use multiple columns on desktop.
-   Dense card layouts should collapse into one column on mobile when
    readability would otherwise suffer.
-   Tables should remain usable through responsive strategies such as
    horizontal scrolling, condensed columns, or mobile-specific
    presentation.
-   Sidebar navigation should adapt to mobile rather than simply
    shrinking.
-   Primary actions must remain accessible without horizontal scrolling.

------------------------------------------------------------------------

# 17. BUTTON SYSTEM

Buttons are divided into:

1.  Primary
2.  Secondary
3.  Tertiary / Ghost
4.  Destructive
5.  Icon-only
6.  Sidebar Item
7.  Pagination
8.  Filter
9.  Table Action

## 17.1 Primary

Purpose: - Main action for a page or form.

Example:

``` text
Simpan Perubahan
```

Visual: - Blue background. - White text. - Medium radius. - Strong
contrast.

States:

``` text
Default → Blue 600
Hover   → Blue 700
Pressed → darker blue state
```

The pressed state must not change the component size.

------------------------------------------------------------------------

## 17.2 Secondary

Purpose: - Supporting actions.

Example:

``` text
Batalkan
```

Visual: - White/light surface. - Border. - Dark text.

Pressed state can use a subtle filled background.

------------------------------------------------------------------------

## 17.3 Tertiary / Ghost

Purpose: - Low-priority actions.

Example:

``` text
Lihat detail
```

Visual: - No strong border or background by default. - Dark text. -
Hover/pressed feedback through a subtle surface.

------------------------------------------------------------------------

## 17.4 Destructive

Purpose: - High-risk actions.

Example:

``` text
Hapus Data
```

Visual: - Red semantic color. - White text. - Destructive icon may
precede label.

Rule:

> Destructive actions that permanently affect data should require
> confirmation.

------------------------------------------------------------------------

## 17.5 Icon-only

Purpose: - Compact supporting controls.

Requirements: - Accessible label/tooltips where the icon meaning is not
obvious. - Consistent icon size. - Visible focus state.

------------------------------------------------------------------------

## 17.6 Sidebar Item

Purpose: - Portal navigation.

States:

``` text
Default
Hover
Active / Pressed
```

The active item should be visually obvious without relying only on
color.

------------------------------------------------------------------------

## 17.7 Pagination

Pagination controls use the same sizing and state principles as other
controls.

Active page: - Primary blue background. - White text.

------------------------------------------------------------------------

## 17.8 Filter

Filters are secondary operational controls.

Example:

``` text
☰ Filter
```

Use a compact control with a clear selected state.

------------------------------------------------------------------------

## 17.9 Table Action

Table actions such as:

``` text
Kelola →
```

should remain visually lighter than the primary page action.

------------------------------------------------------------------------

# 18. ATOMS

The supplied atom reference establishes three major groups.

## 18.1 Actions & Input

Includes: - Primary button - Secondary button - Text input - Input
label - Supporting/help text - Inline edit control

Example:

``` text
Simpan perubahan   →
Batal
```

Input example:

``` text
Nama tracker
[ Peluncuran website                         ✎ ]
Nama singkat agar mudah ditemukan.
```

------------------------------------------------------------------------

## 18.2 Tracker Status

Status chips:

``` text
● Aktif
● Peringatan
● Gagal
```

Recommended semantic mapping:

``` text
Aktif       → Green 600
Peringatan  → Orange 600
Gagal       → Red 600
```

Status color should communicate condition only.

------------------------------------------------------------------------

## 18.3 Utility

Utility controls include: - Search - Notifications - More actions -
Checkboxes - Dividers

Examples:

``` text
Cari
Notifikasi
Lainnya

☑ Tampilkan aktivitas selesai
☐ Hanya milik saya
```

------------------------------------------------------------------------

# 19. UI PATTERNS

## 19.1 Cards

Cards are the main grouping component for: - metrics, - ticket
summaries, - customer information, - technician information, - service
details, - dashboard widgets.

Card properties: - White surface. - 1px default border. - 8--12px
radius. - Level 1 elevation where needed. - Consistent internal padding.

------------------------------------------------------------------------

## 19.2 Tables

Tables should prioritize: - clear headers, - readable rows, - status
visibility, - concise actions, - predictable alignment.

Table actions should not compete with the primary page action.

------------------------------------------------------------------------

## 19.3 Forms

Forms should: - group related fields, - use clear labels, - provide
supporting text when needed, - show validation near the relevant
field, - distinguish required fields, - avoid unnecessary fields.

For customer registration, minimize friction because excessive form
length can cause abandonment.

------------------------------------------------------------------------

## 19.4 Status Tracker

The tracker is a core URT pattern.

It should communicate:

``` text
Current status
Previous status
Next expected status
Latest update
```

The tracker should remain understandable even when viewed quickly.

------------------------------------------------------------------------

## 19.5 Dashboard

Dashboard hierarchy:

``` text
Page title
↓
Key metrics
↓
Attention-required items
↓
Recent / active service data
↓
Secondary information
```

Do not overload the dashboard with decorative charts that do not support
operational decisions.

------------------------------------------------------------------------

# 20. CONTENT AND TERMINOLOGY

Use consistent product terminology.

Preferred:

-   Tempat Servis
-   Pelanggan
-   Teknisi
-   Tiket Servis
-   Pengajuan Servis
-   Diagnosis
-   Estimasi
-   Persetujuan
-   Dalam Pengerjaan
-   QC
-   Selesai
-   Riwayat Servis

Avoid using "bengkel" as the primary product term because URT is
designed for broader service centers including laptop, mobile phone,
computer, and electronics services.

------------------------------------------------------------------------

# 21. ACCESSIBILITY REQUIREMENTS

The implementation should target practical accessibility.

Requirements: - Semantic HTML. - Visible keyboard focus. - Sufficient
text/background contrast. - Form controls with accessible labels. -
Buttons must have clear action labels. - Icon-only buttons need
accessible names. - Do not communicate important status using color
alone. - Preserve logical heading hierarchy. - Avoid ambiguous links
such as "Klik di sini". - Interactive elements must be keyboard
accessible.

------------------------------------------------------------------------

# 22. NAVIGATION AND FLOW REQUIREMENTS

Every interactive control must have a valid destination or defined
action.

Rules: - No intentional dead-end links. - Avoid `href="#"` for real
navigation. - Do not nest interactive elements incorrectly. - Back
navigation should be available where users can reasonably need it. -
Login pages should lead to the appropriate role portal. - Portal
navigation must remain consistent. - Completed service records must
remain reachable from history. - Customer tracking must remain
accessible after approval. - Owner actions must lead to the correct
detail or management page.

------------------------------------------------------------------------

# 23. TECHNICAL PRODUCT SCOPE

The project is intended to evolve through the following stages:

### Phase 1 --- Prototype

-   Semantic HTML.
-   Page structure.
-   Navigation.
-   User flows.
-   UI prototype.

### Phase 2 --- Frontend

-   CSS implementation.
-   Design tokens.
-   Responsive layout.
-   Reusable components.
-   JavaScript interactions.

### Phase 3 --- Backend

-   Authentication.
-   Role-based authorization.
-   Service ticket API.
-   Customer management.
-   Technician management.
-   Owner management.

### Phase 4 --- Database

Core entities may include:

``` text
User
Role
Business
Customer
Technician
Service
ServiceTicket
Diagnosis
Estimate
Approval
ServiceStatus
Transaction
Subscription
```

### Phase 5 --- Integration

-   Connect frontend to backend.
-   Persist service data.
-   Synchronize service status.
-   Implement authentication and authorization.
-   Validate end-to-end workflows.

### Phase 6 --- Deployment

-   Production configuration.
-   Security hardening.
-   Monitoring.
-   Backup.
-   Performance optimization.

------------------------------------------------------------------------

# 24. NON-FUNCTIONAL REQUIREMENTS

## Performance

-   Common pages should load quickly.
-   Avoid unnecessary JavaScript.
-   Use reusable CSS/components.
-   Optimize images and assets.

## Reliability

-   Service status should not be lost during normal operations.
-   User actions should provide clear success/error feedback.

## Security

-   Authentication must be protected.
-   Role-based access must prevent unauthorized portal access.
-   Sensitive customer and service information must not be exposed to
    other users.

## Maintainability

-   Use consistent naming.
-   Separate reusable styles and scripts.
-   Prefer design tokens over hard-coded repeated values.
-   Keep components modular.

## Responsiveness

-   Desktop, tablet, and mobile layouts must follow the responsive grid
    specification.

------------------------------------------------------------------------

# 25. ACCEPTANCE CRITERIA

A feature is considered complete when:

-   The intended user role can access it.
-   The user can complete the intended task.
-   The interface follows URT design tokens.
-   Responsive behavior works on supported breakpoints.
-   Loading, success, empty, error, and relevant interaction states are
    considered.
-   Navigation has a valid destination.
-   Form fields have clear labels and validation.
-   Status uses the correct semantic color.
-   Buttons use the correct hierarchy.
-   No critical interaction creates a dead end.
-   The implementation does not conflict with the established prototype
    unless the design decision is documented.

------------------------------------------------------------------------

# 26. DESIGN QA CHECKLIST

Before approving a screen:

### Visual

-   [ ] Correct canvas/background color
-   [ ] Correct typography scale
-   [ ] Correct spacing
-   [ ] Correct border color
-   [ ] Correct radius
-   [ ] Correct button hierarchy
-   [ ] Correct status colors
-   [ ] Correct elevation

### Interaction

-   [ ] Default state
-   [ ] Hover state
-   [ ] Pressed state
-   [ ] Focus state
-   [ ] Disabled state where applicable
-   [ ] Loading state where applicable
-   [ ] Error state where applicable
-   [ ] Success feedback where applicable

### Responsive

-   [ ] Desktop
-   [ ] Tablet
-   [ ] Mobile
-   [ ] No unintended horizontal overflow
-   [ ] Navigation remains usable
-   [ ] Cards collapse appropriately

### Accessibility

-   [ ] Semantic headings
-   [ ] Form labels
-   [ ] Keyboard focus
-   [ ] Accessible names for icon buttons
-   [ ] Status is not communicated by color alone

------------------------------------------------------------------------

# 27. PROJECT SUCCESS DEFINITION

URT will be considered successful for the initial product when the
prototype has evolved into a coherent working service-management
platform where:

``` text
Customer
   ↓
Service Request
   ↓
Ticket
   ↓
Technician
   ↓
Diagnosis
   ↓
Estimate
   ↓
Customer Approval
   ↓
Repair
   ↓
QC
   ↓
Completed
   ↓
History
```

and:

-   customers can understand and track their service,
-   technicians can manage their assigned work,
-   owners can manage service-center operations,
-   the three portals share one consistent design language,
-   the UI follows the URT Design System,
-   the product works responsively,
-   navigation is complete,
-   the implementation can continue into a production-oriented frontend
    and backend.

------------------------------------------------------------------------

# 28. DESIGN SOURCE OF TRUTH

The current design reference consists of:

1.  **URT Design Tokens**
    -   colors,
    -   typography,
    -   spacing,
    -   sizing,
    -   radius,
    -   elevation,
    -   motion.
2.  **URT Button States**
    -   default,
    -   hover,
    -   pressed,
    -   primary,
    -   secondary,
    -   tertiary/ghost,
    -   destructive,
    -   icon-only,
    -   sidebar,
    -   pagination,
    -   filter,
    -   table actions.
3.  **URT Atoms**
    -   actions/input,
    -   tracker status,
    -   utility controls.
4.  **URT Responsive Grid**
    -   desktop,
    -   tablet,
    -   mobile.
5.  **URT Prototype**
    -   portal layouts,
    -   navigation,
    -   service workflows,
    -   customer flow,
    -   technician flow,
    -   owner flow.

When implementation and prototype conflict, the team should document the
decision and update the design source of truth rather than introducing
inconsistent one-off styles.

------------------------------------------------------------------------

# 29. VERSIONING

**Current version:** 1.0

Future changes should update: - PRD requirements, - design tokens, -
component states, - user flows, - acceptance criteria, - implementation
notes.

Major product changes should increment the PRD version.

------------------------------------------------------------------------

## Final Product Principle

> **URT should make service operations structured for service centers
> and transparent for customers, while keeping the interface simple
> enough for daily operational use.**
