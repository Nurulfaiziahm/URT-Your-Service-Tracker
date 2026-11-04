# URT UI/UX and functional audit

## Scope and architecture

The active product is the React 19, TypeScript, and Vite app in `urt/web`, backed by an Express/TypeScript API in `urt/api`. It uses React Router, Redux Toolkit/RTK Query, CSS Modules, shared global CSS, and custom-property design tokens. The root HTML pages and `owner/`, `teknisi/`, and `pelanggan/` directories are an earlier static prototype, not the active portal.

The active app has public/auth layouts and Owner, Technician, and Customer portals. Shared UI includes buttons, text inputs, responsive tables, notices, loading/empty states, ticket status badges, and invoice badges. Shared tokens live in `urt/web/src/styles/tokens.css`; global layout and responsive rules live in `urt/web/src/styles/global.css`. CSS uses several breakpoint conventions, including 1200, 1100, 1000, 767, 640, and 400px. API calls are centralized through RTK Query and `baseApi`; the API uses Express route modules, Zod validation, business access guards, and Mongoose models.

## Verified findings

| Priority | Area | Finding / evidence | Action |
| --- | --- | --- | --- |
| High | Owner customer contacts | `/owner/customers/new` was explicitly routed but redirected to the directory. The directory had no create action, despite an existing owner-only `POST /businesses/:businessId/customers` endpoint and persisted Mongoose implementation. | Connected an Owner form to the existing RTK Query mutation and retained API validation and authorization. |
| Medium | Error feedback | The ticket directory's delete operation showed errors and success through the same generic inline notice style. The contact form initially discarded backend error detail in the ticket picker. | New contact workflow displays API error text where supplied and success after persisted mutation resolves. |
| Review | Responsive coverage | Responsive rules are spread across global CSS and feature modules with multiple breakpoint values. Repository inspection alone cannot establish viewport overflow across every route. | No broad CSS changes made without per-screen evidence. Browser viewport audit remains outstanding. |

## Status and presentation review

Status badges exist as shared ticket and invoice components; ticket semantics are centralized in the ticket status module. There are also feature-local status styles, so full semantic-color consistency should be checked visually across all role portals. Shared tokens define card/canvas colors, borders, radii, and shadow. Existing source contains several visibly mis-encoded dash/ellipsis characters in UI text; these should be corrected in a dedicated encoding pass after confirming affected files and encoding.

## Limitations

No live MongoDB/API credentials or browser automation were available in this pass. Contact duplicate behavior is not defined by the current schema/service as a uniqueness rule, so no new duplicate policy or database constraint was introduced. Mobile/desktop visual checks and live create-contact persistence require a running configured application and owner session.
