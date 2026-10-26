# Frontend UI restoration

Reference: the repository's original HTML and CSS. Changes are in `web/`; backend files and credentials were left untouched.

## Changes by area

| Area | Reference | Restoration |
| --- | --- | --- |
| Portal shells | `owner/css/owner.css`, `teknisi/css/style-teknisi.css`, `pelanggan/style-customer.css` | Role-specific sidebar widths, colors, typography, content spacing, active navigation, line icons, profile initials, desktop collapse and mobile menu. Removed the preview banner from connected portal pages. |
| Login and recovery | `owner/login.html` | Centered 420px white card, logo, heading, fields and supporting links instead of the split marketing layout. |
| Registration | `registrasi.html`, `owner/register.html` | Separate centered customer registration and split owner registration layouts. Business onboarding follows the owner registration frame. |
| Dashboards | Original owner, technician and customer dashboard pages | Distinct role-specific summary cards, ticket tables, featured service, progress panels, subscription information and portal links. |
| Directories | `owner/pelanggan.html`, `owner/teknisi.html`, `owner/layanan.html` | Dedicated add, detail and edit routes; search, status filters, summary counts, compact actions and pagination. Customer and technician details include related tickets. Invitation and CSV import flows retained. |
| Ticket queue and history | Technician queue/history and customer service history pages | Separate dashboard, queue and history screens. Restored tabular layouts, filters, real counts, detail links and pagination. |
| Ticket details | Original ticket/service detail pages | Main and side columns for device, diagnosis, estimates, customer information, workflow, warranty and activity. Localized timeline actions and corrected approval progress stage. |
| Technician estimates | `teknisi/estimasi.html`, `teknisi/ringkasan-terkirim.html` | Dedicated estimate editor and submitted summary routes using saved server revisions. Diagnosis remains accessible on ticket details. |
| Customer approval | `pelanggan/persetujuan-servis.html`, approval result pages | Dedicated review route with diagnosis, device and cost panels; approved/rejected result presentation follows the saved decision. |
| Profiles | Original owner, technician and customer profile pages | Identity card alongside editable account details. Technician specializations use the existing technician API. Security stays inside the selected portal. |
| Reports | `owner/laporan.html` | Summary cards, volume and status charts, date filters, financial totals and technician performance table. |
| Subscription | `owner/langganan.html`, `owner/subscription.html`, subscription payment/invoice pages | Overview, server-provided package cards, payment history, dedicated invoice/instruction view and paid state. Removed hardcoded fictional plans and simulated payment success. |
| Tracking | `tracking_result.html` | Standalone logo/navigation, centered result card, device information, progress and public activity. Existing access-code requirements retained. |
| Policies | `privacy.html`, `terms.html` | Standalone title header, centered document card, section separators and footer; removed the generic site shell and extra contents sidebar. |
| Shared controls | Original control styling | Compact table actions, consistent field sizing, resolved CSS tokens, native dialogs with focus management and Escape support, inline copy feedback and styled confirmations. |
| Printing | Ticket receipt and invoice references | Print the selected document with its own branding and headings; hide portal navigation and preview actions. |

## Added routes

- `/owner/{customers,technicians,services}/new`
- `/owner/{customers,technicians,services}/:id`
- `/owner/{customers,technicians,services}/:id/edit`
- `/technician/tickets/:id/estimate`
- `/technician/tickets/:id/estimate/sent`
- `/customer/services/:id/approval`
- `/owner/subscription/plans`
- `/owner/subscription/payments/:id`
- `/{owner,technician,customer}/security`

Customer, technician and service detail queries use the existing business-scoped GET endpoints. Subscription queries and checkout reuse the current `/packages` and business subscription endpoints through RTK Query. No new dependencies were added.

## Adaptations to the current backend

- Registration retains the first/last name fields required by the real account contract.
- Public tracking retains its business slug and secret and displays only public response fields.
- Reports show real period totals and status distribution. The current report response has no daily or weekly series, so the prototype's weekly graph was not filled with invented values.
- Subscription checkout supports the backend's manual payment method. Packages, prices, invoices, payment states and activation come from the server. QRIS and virtual-account simulations were removed. Subscription activation requires platform confirmation; the frontend cannot mark an unpaid invoice as paid.
- Avatar uploads and customer notification preferences are not represented in the current profile contract. Identity initials are shown; unsupported settings are not presented as saved features.

## Validation

- `npm run build --prefix 'mern stack/web'` passed (TypeScript and production Vite build).
- Changed source was formatted with the available Prettier executable.
- Static inspection found no remaining browser `alert()`/`confirm()` calls or custom overlay dialog wrappers in the React components.
- No browser was opened, no test files were added, and no live API or payment operation was performed, as requested.
- Exact rendered visual parity and interactive behavior remain for manual review; a successful build establishes compilation, not pixel-level equivalence.
