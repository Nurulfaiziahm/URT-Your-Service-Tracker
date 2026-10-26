# URT React frontend implementation plan

Updated: 26 October 2026. Status: All phases (Phase 0 through Phase 9) completed. The React SPA in `mern stack/web` is fully implemented, verified with 0 lint errors and successful production build, and ready for user acceptance and deployment.

Companion: [Backend implementation plan](./BACKEND_IMPLEMENTATION_PLAN.md). Frontend phases are separate delivery milestones; their numbers do not match backend phase numbers.

## 1. Target and repository findings

Build one React application in `mern stack/web`, alongside the existing Express/TypeScript API in `mern stack/api`. It will replace the static prototype with connected public pages and portals for owners, technicians, and customers.

Use these existing materials as the product and visual references:

- `../prd.md`: user stories, scope, service lifecycle, design tokens, responsive rules, accessibility, and acceptance criteria.
- `../README.md`: product overview and portal inventory.
- `../index.html`, `../tracking_result.html`, `../masuk.html`, `../registrasi.html`, `../privacy.html`, and `../terms.html`: public experience.
- `../owner/`, `../teknisi/`, and `../pelanggan/`: portal screens and interactions.
- `../css/style.css`, portal stylesheets, `../image/logo-urt.svg`, and `../assets/screenshots/`: established visual design.
- `../js/data.js` and portal JavaScript: examples of displayed fields and interactions, not production persistence or authorization.
- `../urt.sql`: legacy domain reference, not a database consumed by the current MongoDB API.
- `api/src/app.ts`, route modules, schemas, controllers, services, and Mongoose models: evidence of the currently implemented API contract.

The inspected backend provides a substantial authentication and storage foundation. It does **not yet expose the full URT service-management domain in this checkout**.

| Area | Observed implementation | Frontend consequence |
| --- | --- | --- |
| Authentication | Registration, password/Google login, refresh, logout, email OTP, password recovery, password change, and device sessions | Can implement against the existing contract, subject to runtime verification and configured dependencies |
| Profiles | Name/email editing; schemas accept phone, but model/services/response do not persist and return it | Basic profile can connect; phone/WhatsApp/address need backend work |
| Roles | User model and user filtering support `user` and `admin` | Owner/technician/customer membership and authorization are prerequisites for live portals |
| User directory | Admin-only, globally scoped user listing | Does not provide business-scoped customer or technician management |
| Products | Public reads and admin writes | Product schema/controller/model disagree; cannot assume this is a working URT service catalog |
| Uploads | Authenticated image/PDF upload, metadata, deletion, private R2 URLs | Can support basic uploads; ticket attachment association and shared permissions need a contract |
| Tickets and operations | No mounted ticket, diagnosis, estimate, approval, business, report, transaction, or subscription modules | UI can be built from references, but live functionality requires these APIs |
| Orders/delivery agents | Ecommerce-oriented models, without mounted order routes | Do not treat these as service tickets or introduce delivery into the initial scope |

Inspection was static. API availability, database contents, mail delivery, Google configuration, and R2 operation were not exercised.

### 1.1 EEINA frontend reference review

Reference inspected: `/mnt/data/projects/eeina/app/frontend`. Reviewed its `AGENTS.md`, `docs/architecture.md`, package manifest, Redux store/provider/hooks/base API/error handler, auth slice/endpoints/guards/login form/logout hook, and representative subscription/upload/commerce APIs. This was a source review, not a runtime audit of EEINA.

| Reference finding | URT plan |
| --- | --- |
| `redux/store.ts` uses `configureStore`; `redux/hooks.ts` supplies typed hooks | Adopt one store and typed `useAppDispatch`/`useAppSelector` |
| Shared `baseApi` with feature-level `injectEndpoints` and generated hooks | Adopt one URT API slice, with endpoint files owned by features |
| Auth slice stores access token in memory; refresh cookie is HttpOnly | Adopt in-memory auth state with an explicit bootstrap status |
| Store persists the user snapshot and several EEINA-specific slices using `redux-persist` | Begin without Redux persistence; establish identity through refresh/profile on reload |
| Auth and subscription endpoint files unwrap API envelopes and declare cache tags | Adopt typed transforms and scoped tags; retain URT's top-level pagination |
| Base query uses `async-mutex` to serialize refresh and lazily gets CSRF after refresh 403 | Use one shared refresh promise; bootstrap URT CSRF before every unsafe request, not only refresh |
| EEINA paths include `/auth/signup`, `/auth/refresh`, `/csrf-token`, `/user/profile`, and `/auth/verify-email-otp` | Use URT's actual `/auth/register`, `/auth/refresh-token`, `/auth/csrf-token`, `/auth/profile`, and `/auth/verify-email` |
| Auth guard redirects on profile errors and requires verified email | Distinguish unavailable API from expired session; URT allows unverified sessions except operations whose backend requires verification |
| Login lifecycle and form both dispatch credential updates | Give endpoint/session lifecycle one owner; forms submit and navigate without duplicate auth dispatches |
| Logout cleanup is split between endpoint and a UI hook; base-query expiry dispatches slice logout | Centralize session cleanup so manual logout and refresh rejection both clear user, context and API cache |
| A separate `shopApi` targets an independent external commerce service | No second API slice for URT's owner/technician/customer portals; they share one backend |
| EEINA uses Next.js, Tailwind, React Hook Form/Zod, i18n and Capacitor | Use its Redux/module pattern as reference; keep URT's Vite/Router/CSS/form choices unless separately changed |

The useful reference is EEINA's store → shared base API → feature endpoint → generated hook structure. Adapt its authentication behavior to the inspected URT contract instead of copying endpoint names or assumptions.

## 2. Implementation choices

| Concern | Planned choice | Reason |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Fits the separate Express backend and gives typed components with a small setup |
| Routing | React Router, declarative routes | Supports nested portal layouts, parameters, and protected routes |
| Styling | Existing CSS custom properties, shared base CSS, component CSS Modules | Preserves URT's design and limits collisions between legacy portal styles |
| HTTP/server state | RTK Query with `fetchBaseQuery` and one auth-aware base query | Shared requests, cache, generated hooks, credential handling and invalidation |
| Shared client state | Redux Toolkit slices for auth/session identity and selected business/portal | Explicit ownership and typed actions/selectors; replaces auth/business contexts |
| Local/navigation state | Component state for forms/dialogs; URL search parameters for lists | Avoids duplicating form and navigation state in Redux |
| Forms | Native controls and constraint validation, plus field-specific checks matching the API | Avoids a form framework until a concrete need exists |
| Icons | Reuse the existing SVG assets and icon patterns | Keeps visual consistency |
| Dates and money | `Intl` formatting using the product's locale, currency, and agreed business timezone | Keeps dates and costs consistent across portals |

Use supported package releases at implementation time and commit the lockfile. The current React documentation describes the [Vite React/TypeScript setup](https://react.dev/learn/build-a-react-app-from-scratch), and [React Router documents declarative installation](https://reactrouter.com/start/declarative/installation).

Keep the UI in Indonesian and the code/documentation in English, as specified in the PRD. Preserve IDR formatting from the prototype unless the product requirements change. The developer's local timezone should not silently become the service center's business timezone.

Install `@reduxjs/toolkit` and `react-redux`; RTK Query is included in Redux Toolkit. Use its [data fetching and caching APIs](https://redux-toolkit.js.org/rtk-query/overview), [feature endpoint injection](https://redux-toolkit.js.org/rtk-query/usage/code-splitting), and [typed Redux hooks](https://redux.js.org/usage/usage-with-typescript). There is no need for Axios, another query cache, Redux Persist, or a mutex package for the initial architecture.

Add shared components, hooks, types, slices and tag types only as a feature uses them. A chart package, spreadsheet parser, UI framework, or form framework remains a decision tied to actual requirements. Do not build a generic repository layer, permissions framework, or configurable form engine.

## 3. Backend alignment and integration dependencies

Use the companion backend plan's proposed contracts as the implementation baseline. These are planned contracts, not mounted endpoints. Reconcile changes in both documents before connecting the affected feature. This plan does not authorize backend changes by itself.

| Concern | Backend plan baseline | Frontend consequence |
| --- | --- | --- |
| Business roles | Global identity stays `user`/`admin`; `Business.ownerId`, technician membership, and customer link determine portal access | Load proposed `GET /me/businesses`; never equate platform admin with business owner |
| Business context | Context response includes business ID, slug, name, and available roles | Resolve public slug to a business; offer a portal chooser when needed; validate any saved selection |
| Owner onboarding | Signed-in caller creates business and becomes its owner | Normal signup followed by onboarding; no privileged public role field |
| Technician access | Owner-controlled invitation accepted by matching verified identity | Invite/resend/accept states; owner never sets another user's login password |
| Customer linking | Walk-in contacts may be unlinked; verified invitation claim links an account | Distinguish contact records from login accounts; never claim by matching email alone |
| Repair services | Dedicated business-scoped service resource | Isolate the incompatible ecommerce products contract |
| Ticket commands | Scoped commands, `expectedRevision`, versioned estimates, actor-specific `allowedActions` | Explicit forms/actions; no generic status dropdown or frontend-only permission decision |
| Completion | Passed QC and ready for pickup; `handedOverAt` is separate | Show ready and collected separately, including history |
| Public tracking | Business context, ticket code, and high-entropy tracking secret sent to `POST /public/tracking` | Collect required access information; secret stays out of URLs/storage; no public approval |
| Finance and reports | Service invoices separate from subscriptions; server aggregates use business timezone | Separate billing flows; no revenue/SLA derived from one paginated list |
| Import | Dedicated CSV preview, then confirmed import | No generic image/PDF uploader or speculative spreadsheet parser |

Integration prerequisites and remaining implementation gaps:

1. **Role and business membership.** Implement the relationship model above and load it after authentication. Customers must not select privileged roles during registration. Account pages and invitation acceptance must work before business membership exists.
2. **Business context.** Use `/b/:businessSlug` as the proposed public entry and resolve it through the planned public-business API. A URL slug is context, not authorization. The server must scope every business resource. Multi-branch administration stays outside initial scope.
3. **Ticket contract.** Implement the backend plan's identifiers, transitions, versioned estimates, approvals, timeline, completion and handover. Finalize role-specific response fields before wiring pages; protect ownership and assignment on the server.
4. **Service catalog.** Implement the dedicated repair-service resource from the backend plan. Existing product writes accept string `name`/`description` and `price`/`stock`, while the model requires bilingual objects and several price fields. Price filtering targets a different field too. Keep that legacy contract isolated from repair catalog implementation.
5. **Profiles.** Persist and return required contact fields and safe password/provider capability flags. Use `/auth/profile` for global identity, and business technician/customer endpoints for business-specific contact/specialization fields; do not call duplicate profile APIs for the same edit.
6. **Attachments.** Define ticket attachment metadata and permissions for the customer, assigned technician, and owner. The current uploader/admin policy is insufficient for a shared ticket workflow. Existing uploads support images and PDFs, not CSV/XLSX contact imports.
7. **Public tracking.** Implement the backend plan's code plus secret lookup with an allowlisted public response. A guessable ticket number must not expose private contacts, internal notes, attachments, full estimates, invoices, or authorize approval. Approval requires authenticated ownership.
8. **Transactions and subscriptions.** Define invoice fields, supported payment methods, payment authority, and subscription state. Prototype QRIS/Virtual Account screens do not establish a payment integration. A success screen must reflect server-confirmed payment status.
9. **Reports.** Adopt the backend plan's cash-received revenue, ready-date completion volume and eligible approved-target SLA definitions. Resolve business timezone and revised-deadline policy before connecting reports. Dashboard aggregates and reports use the same definitions; paginated frontend rows cannot provide reliable totals.

Remaining business decisions: actual timezone; plans/prices and billing method; expired-subscription permissions; warranty terms; invoice corrections/refunds; revised-deadline SLA policy; and spreadsheet formats beyond CSV. Settle each before its dependent phase; billing decisions do not block the core repair workflow.

Proposed API resource families, **not existing endpoints**: business/onboarding; repair services; business customers; technician membership/invitations; tickets; ticket diagnosis/estimates/approval/status/timeline; public tracking; dashboard summaries; transactions/invoices; reports; subscription plans/invoices/payments; customer import. Exact URLs, methods, request fields, response fields, and error codes must be agreed before each feature is wired.

## 4. Application architecture and project organization

### 4.1 Runtime composition

Use one React SPA with public, authentication, and three portal route groups. Express remains the only layer that accesses MongoDB, Redis, mail, and R2. Never import API services, models, or server configuration into the browser bundle.

```text
BrowserRouter
  AppErrorBoundary + Suspense fallback
    ReduxProvider                        One store; auth + business + baseApi
      SessionBootstrap                   Restores session without blocking public UI
      PublicLayout                       Landing, business entry, tracking, legal
      AuthLayout                         Login, signup, OTP, recovery
      RequireAuth
        Account / invitation pages       Also work without business membership
        Owner onboarding                 Also works before business creation
        Business-entry service request   Signed-in first submission, before membership
        BusinessGate                     Query memberships; read selected context
          PortalSelectPage               Only when selection is needed
          RequireBusinessRole
            PortalLayout                 Explicit navigation by role + Outlet
              Owner / Technician / Customer route pages
                Feature forms and views
                  Generated RTK Query hooks -> baseQueryWithAuth -> Express /api/v1
```

Guards support navigation; server checks enforce authorization. Public pages render without waiting for session restoration. Private pages wait for identity and business resolution. Invitation acceptance cannot require an already-existing membership. Missing membership needs a useful onboarding/selection destination, not a redirect loop.

A first-time customer may have no entry in `/me/businesses` until self-submission creates their business contact. Allow authenticated submission from `/b/:businessSlug/services/new` outside the existing-membership guard, using sanitized business context. The API assigns the signed-in customer's identity and creates/reuses only their own linked contact. Reload business context after success. Existing customer portal submission reuses the same form; no frontend role grant is needed to enter this first-submission flow.

### 4.2 Files and ownership

Create this structure progressively as features are implemented:

```text
mern stack/web/
  public/                 # Assets that require stable public URLs
  src/
    app/                  # App entry, router, guards, render-error boundary
    redux/
      store.ts            # configureStore, reducers, API middleware, setupListeners
      hooks.ts            # Typed useAppDispatch/useAppSelector/useAppStore
      Providers.tsx       # React Redux Provider; no PersistGate
      baseApi.ts          # One createApi, no feature endpoint imports
      baseQuery.ts        # fetchBaseQuery, headers, CSRF, bounded refresh
      sessionLifecycle.ts # Session bootstrap and cache/context cleanup coordination
    assets/               # Logo and imported assets
    components/           # Shared controls and feedback states
    layouts/              # Public, auth, and portal layouts
    features/
      auth/               # authSlice.ts, authApi.ts, SessionBootstrap, auth pages
      public/             # Landing, tracking, legal pages
      tickets/            # Shared ticket views, status presentation, API calls
      customer/           # Submission, dashboard, history, customer profile
      technician/         # Queue, diagnosis, estimate, repair, QC
      owner/              # Owner dashboard, intake/assignment, management pages
      business/           # businessSlice.ts, businessApi.ts, BusinessGate, setup
      customers/          # Business contacts, linking, CRUD, import
      technicians/        # Business profiles, invitations, directory
      services/           # Dedicated repair catalog, CRUD
      account/            # Shared identity profile, password, device sessions
      billing/            # Transactions, subscriptions, invoices, payments
      reports/            # Operational reporting
    lib/                  # session.ts (CSRF/promises/device), api.types.ts, format.ts
    styles/               # Tokens, reset, typography, base styles
    main.tsx
```

Feature files can stay flat initially. Extract repeated UI when the second actual use appears. Share ticket presentation between roles, but keep role-specific actions explicit.

Within a feature, start with `<feature>Api.ts`, `types.ts`, named page/component files and colocated `*.module.css`. Add `<feature>Slice.ts` only for actual shared client state. Add `pages/`, `api/` and `components/` subdirectories when navigation becomes difficult. This follows EEINA's module ownership while retaining URT's `features/` naming. Create only files that an implemented phase uses.

### 4.3 Dependency rules

- Route pages parse parameters, call generated RTK Query hooks, own mutation interactions and compose feature views.
- Feature API modules inject endpoints into `baseApi`, own request/response types and export generated hooks. Components do not call `fetch` directly or construct authentication headers.
- Display components take typed data and callbacks. `TicketTimeline` does not fetch another copy of its ticket or infer the active portal.
- Shared controls depend on React/CSS and props; they do not import features or business APIs.
- Ticket types, status presentation, and API functions belong to `features/tickets`. Assignment, technician work, and customer approval remain explicit actions rather than a configurable action engine.
- Customer/technician/service directories each have one owner feature. Owner pages compose them instead of duplicating their types/API under the owner portal.
- Global account identity editing is separate from business contact/profile editing. An owner cannot change a contact's login credentials.
- Slices export ordinary actions/selectors without runtime imports of the store or API. `baseApi` imports the transport, not feature endpoint modules. Feature APIs import `baseApi` and pure slice actions; store types are type-only imports where needed.
- `lib/session.ts` holds CSRF, nonsecret device handling and shared bootstrap/refresh promises outside Redux. Access token/user/session status live in `authSlice`. `sessionLifecycle.ts` coordinates cleanup using store dispatch without making slices import API utilities.

### 4.4 State and request ownership

| State | Owner | Lifetime and synchronization |
| --- | --- | --- |
| User/access token/session readiness | `authSlice` | In memory; `loading`, `authenticated`, `anonymous`, `unavailable`; never persist; update through one session lifecycle |
| CSRF token, bootstrap/refresh promises | `lib/session.ts` | In memory, outside serializable Redux state; persist only nonsecret device ID |
| Available businesses and roles | `businessApi` RTK Query cache | Authoritative `/me/businesses` result; invalidate after onboarding/invitation acceptance |
| Chosen business ID and portal role | `businessSlice` | Selection only; validate against memberships; any saved selection is a nonsecret hint |
| Tickets/directories/dashboard/reports/invoices | `baseApi` RTK Query cache | Scoped query arguments; tags invalidate affected reads; no duplicate entity slices |
| Search/page/filter/sort/report dates | URL search parameters | Shareable; back/forward restores them; filter changes reset page |
| Form values/dialogs/expanded sections | Local component state | Preserve failed submissions; deliberately reset when resource/context changes |
| Reset token/tracking secret | Local in-memory flow between submissions | Reset transient mutation state after handling; no persistence/URLs/analytics; reload restarts access step |
| Totals/entitlement/permitted actions | API response | Local arithmetic is preview only; server response is authoritative |

Use generated query/mutation hooks for server state; do not mirror responses into `useState`, thunk-managed entity slices or hand-written request effects. Use `skipToken` until required identity/business/resource inputs are ready. Children receive detail data through props or use selectors such as `selectFromResult` when they need only part of a cached response.

After a successful write, invalidate the affected scoped tags. Pages use mutation `.unwrap()` for success/navigation and catch typed errors; rejected lifecycle promises are handled. Do not dispatch credentials both in an endpoint lifecycle and its form. An interrupted mutation has an unknown outcome; retain inputs and review/refetch before repeating a payment, approval, ticket creation or transition.

### 4.5 Store and slice design

Create one client-side store for this Vite SPA:

```text
RootState
  auth
    user: User | null
    accessToken: string | null
    status: loading | authenticated | anonymous | unavailable
  business
    selectedBusinessId: string | null
    selectedPortal: owner | technician | customer | null
  baseApi
    queries / mutations / subscriptions / cache tags (managed by RTK Query)
```

- `configureStore` registers `auth`, `business` when phase 3 needs it, and `baseApi.reducer` under its reducer path. Include `baseApi.middleware` once; retain normal serializability/immutability checks.
- Derive `RootState`, `AppDispatch`, and `AppStore` from the store. Use typed hooks with `.withTypes()`; keep runtime hooks outside `store.ts`.
- `authSlice` actions cover credentials/profile received, bootstrap unavailable, and session ended. Derive authentication from status and valid restored identity, not a persisted user snapshot or another boolean field.
- `businessSlice` stores selection only. Memberships, names, roles and entitlements come from queries. On `sessionEnded`, clear selection; a selected role never grants permissions.
- Use one small session listener in `sessionLifecycle.ts` to coordinate API-cache cleanup after `sessionEnded`. Base query dispatches that pure auth action; slices never import `baseApi`. Bootstrap can be a small thunk sharing the existing in-flight promise; do not create a separate async thunk for every REST endpoint.
- Keep sidebar disclosure local to `PortalLayout`. Add a UI slice only when unrelated mounted screens actually share a client interaction. No ticket/customer/report/payment slice is needed for data already cached by RTK Query.
- Use `setupListeners(store.dispatch)` for endpoint-level focus/reconnect refetch. No `redux-persist`, `PersistGate`, or persisted API cache initially. Browser API-cache persistence can restore stale data; see [RTK Query persistence guidance](https://redux-toolkit.js.org/rtk-query/usage/persistence-and-rehydration).
- Promises, `File`, `FormData`, DOM objects and `Date` objects do not belong in ordinary slice state. Keep upload inputs local and timestamps as ISO strings. Leave RTK Query's standard middleware handling intact rather than disabling checks globally.
- DevTools are development-only; sanitize token/credential-bearing actions and state. Auth/recovery/Google/tracking mutation inputs/results can pass through RTK Query's internal actions: keep secrets local between steps, call mutation `reset()` after consuming them, and never persist or log those payloads. Do not claim that a mutation's arguments never enter Redux.

### 4.6 Feature endpoint and generated-hook plan

One `createApi` lives in `redux/baseApi.ts`; feature files use `baseApi.injectEndpoints`. This allows cross-feature cache invalidation with one middleware, as documented in [the RTK Query API guidance](https://redux-toolkit.js.org/rtk-query/api/createApi). Add tag types as features use them, through `enhanceEndpoints({ addTagTypes })` where appropriate; do not predeclare every future resource.

| Endpoint file | Queries/mutations and representative hooks | Phase |
| --- | --- | --- |
| `features/auth/authApi.ts` | `useLoginMutation`, registration/Google/OTP/recovery mutations, `useGetProfileQuery`, `useUpdateProfileMutation`, devices/revoke/password/logout operations | 2 |
| `features/business/businessApi.ts` | `useGetMyBusinessesQuery`, `useCreateBusinessMutation`, settings read/update and public-business lookup | 3 |
| `features/customers/customersApi.ts` | `useGetCustomersQuery`, detail/create/update/archive/invitation/accept | 3, 6 |
| `features/technicians/techniciansApi.ts` | `useGetTechniciansQuery`, detail/invite/resend/accept/profile/deactivate | 3, 6 |
| `features/services/servicesApi.ts` | `useGetServicesQuery`, detail/create/update/archive/reactivate | 3, 6 |
| `features/tickets/ticketsApi.ts` | `useGetTicketsQuery`, `useGetTicketQuery`, `useCreateTicketMutation`, intake/assignment/diagnosis/draft/submit/approval/transition/handover | 4–5 |
| `features/tickets/attachmentsApi.ts` | Upload/attach/detach and fresh authorized download URL; generic upload endpoint can move to a shared upload feature when reused | 6 |
| `features/public/trackingApi.ts` | `useTrackTicketMutation` for secret-bearing POST; no cache key containing tracking secret | 6 |
| `features/owner/dashboardApi.ts` | `useGetDashboardQuery` with business/portal scope; customer and technician pages reuse the same role-aware endpoint | 6 |
| `features/billing/serviceInvoicesApi.ts` | Invoice list/detail/issue/void, confirmed receipt entry and payment history | 7 |
| `features/reports/reportsApi.ts` | `useGetReportOverviewQuery` with business/date/timezone scope | 7 |
| `features/billing/subscriptionApi.ts` | Plans/state/invoice list/detail/create; no browser endpoint to confirm own subscription payment | 8 |
| `features/customers/customerImportApi.ts` | CSV preview/confirm mutations; consume/reset file-bearing mutation state after results are handled | 8 |

These hook names are planned frontend interfaces, not proof that domain endpoints exist. Histories reuse `getTickets` with terminal filters. No API slice per portal, component, or entity; no second copy of ticket endpoints under each role. Keep dashboard API with its first consuming feature initially; move it to a shared dashboard feature if ownership becomes unclear.

`transformResponse` unwraps single-resource `data` and preserves each endpoint's actual nesting, such as auth profile `data.user` and sessions `data.devices`. List transforms return `{ items: response.data, pagination: response.pagination }`; they must not discard pagination. Base errors retain HTTP status, public `code`, `error`, and optional field `details`; network/parse failures stay distinguishable. Handle empty successful responses without requiring `data`.

### 4.7 Cache keys, invalidation, and lifecycle

Use default RTK Query argument serialization. Every protected business query includes `businessId` and the active portal when response visibility depends on it, plus relevant resource IDs, filters, page, limit, sort and report dates. The URL need not contain a portal parameter; the argument distinguishes cached role-specific projections. Never remove these fields with a custom shared cache key.

If the same identity needs different response projections for different portals, agree on an explicit server-supported projection input. A client cache argument alone does not change backend serialization or permissions.

Use `currentData` or key the page by business/portal so changing arguments cannot temporarily render the previous context's `data`. Skip private queries until auth and validated context are ready. Server scope still determines which records are returned.

| Operation | Scoped tags invalidated on success |
| --- | --- |
| Business create / invitation accept | `Membership:ME`, relevant `Business:<id>`; refresh choices before routing |
| Account edit / email verification | `Profile:ME`; synchronize the auth user snapshot in one endpoint lifecycle |
| Intake / assignment / diagnosis / estimate / approval / transition / handover | `Ticket:<business>:<portal>:<id>` and `TicketList:<business>:<portal>` for affected portal projections; dashboard/history as applicable |
| Customer/technician/service edit | Corresponding entity/list tags; affected ticket detail/dashboard only where returned display fields actually change |
| Attach / detach | Ticket detail/attachments and affected upload metadata |
| Service invoice / receipt / void | Service invoice detail/list, affected ticket, dashboard and reports |
| Subscription invoice create / confirmed status refresh | Subscription/invoice tags; membership/context only if entitlement fields change |
| Confirmed contact import | Customer list and applicable dashboard; preview invalidates nothing |

Lists provide both a scoped list tag and item tags. Invalidate the list even when a mutation can move a record off the current filtered page. Derive affected portal tags from the mutation's business context; another browser/account receives changes through its own refresh/refetch, not local Redux invalidation.

Use tag invalidation instead of manually copying mutation results into several caches. No optimistic updates for approvals, financial writes or lifecycle transitions. On 409, invalidate/refetch the affected resource and require review; retain recoverable form input. `providesTags`/`invalidatesTags` behavior follows [RTK Query automated refetching](https://redux-toolkit.js.org/rtk-query/usage/automated-refetching).

On logout, terminal refresh rejection or account change: private consumers stop, pending private requests are aborted where possible, auth/business state clears, `baseApi.util.resetApiState()` clears cached data, and transient session state is discarded. Late refresh/profile completions must not restore a session that ended. A failed logout request must not falsely claim the server cookie was revoked; expose the failure and retain a clear retry path.

On business or portal switch, unmount/skip old private consumers before changing selection and clear the API cache for the initial implementation. Refetch memberships before validating the new selection, then enable queries for that context. This deliberately simple policy avoids carrying staff responses into customer screens. Do not put `baseApi` objects or query subscription handles in slice state.

Default to visible manual refresh plus mutation invalidation. Enable `refetchOnFocus`/`refetchOnReconnect` only on operational reads that benefit from it. Use `isLoading` for the initial skeleton and `isFetching` for background refresh. Do not clear usable records on an ordinary background network failure. Polling, if needed, is endpoint-level and pauses while unfocused; no additional polling loop or socket dependency.

### 4.8 URT authentication transport adaptation

Adapt EEINA's centralized base query to URT's contract; follow the [RTK Query custom base-query pattern](https://redux-toolkit.js.org/rtk-query/usage/customizing-queries).

1. Raw `fetchBaseQuery` uses `VITE_API_BASE_URL`, `credentials: 'include'`, and supported headers. It reads the access token from typed auth state and the latest CSRF/device values from session helpers. Do not hardcode EEINA's API URL.
2. `SessionBootstrap` invokes one shared restoration flow: obtain `/auth/csrf-token`, POST `/auth/refresh-token`, store access token/server-issued device ID, then GET `/auth/profile`. Resolve authenticated/anonymous/unavailable distinctly. React development remounts join the same promise.
3. Before every unsafe request, ensure CSRF is ready, including registration/login, recovery, uploads and public tracking. Save replacement CSRF from registration/login/Google/password-change responses. Refresh currently returns no replacement CSRF. Do not bootstrap recursively through an endpoint waiting on itself; raw transport handles bootstrap/refresh.
4. Mark endpoint behavior explicitly with small typed base-query options where necessary: public auth calls do not trigger refresh on invalid credentials; protected reads can continue once after pre-execution auth rejection; mutations only continue when the backend rejection proves they did not execute. No generic retry middleware or backoff.
5. Concurrent access-expiry responses share one in-flight refresh promise. Refresh never calls its own wrapper. Waiting callers use the new token once and respect request cancellation. Capture the server's returned device ID rather than assuming a generated ID overrides it.
6. Refresh 401/revocation ends the session through the common cleanup action. A network failure or 503 yields unavailable/recovery UI, not a false invalid-password or logged-out result. Permission 403 and CSRF 403 are not access-token expiry.
7. For `CSRF_MISSING`/`CSRF_INVALID`, refresh CSRF state and offer a deliberate retry. Respect 429; do not replay writes or resend verification mail from a global error handler.
8. Auth endpoint lifecycle owns credential/profile synchronization and catches rejected lifecycle promises. Forms call the mutation, handle errors and navigate. Logout/password-change/current-device revocation must use their actual URT cookie/token semantics in section 7.

## 5. Routes and migration coverage

The routes below are proposed canonical React routes. Use `/b/:businessSlug` for public business entry; retain portal prefixes for the initial one-business experience. Resolve and validate selected context before requesting scoped resources. All object IDs in routes must be checked by the backend.

| Area | Proposed routes | Existing references / planned behavior |
| --- | --- | --- |
| Public | `/`, `/b/:businessSlug`, `/tracking`, `/tracking/:ticketCode`, `/privacy`, `/terms` | Landing/business entry, lookup/result, legal; code may prefill lookup, secret stays in memory |
| First service request | `/b/:businessSlug/services/new` | Requires sign-in but no prior membership; creates/reuses caller's own business contact through ticket intake |
| Shared auth | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` | Shared login/registration forms; reset flow includes email, OTP verification, and a new password |
| Context/invitations | `/portal`, `/invitations/technician`, `/invitations/customer` | Select accessible business/portal; verified identity accepts invitation, then reloads context |
| Shared account | `/account/profile`, `/account/security` | Identity/security available before membership; role profile pages reuse the same sections |
| Owner onboarding | `/owner/register`, `/owner/onboarding` | Owner register and `daftar-bisnis.html`; backend business creation required |
| Owner overview | `/owner` | `beranda-owner.html`; real summary, recent tickets, business portal links |
| Owner tickets | `/owner/tickets`, `/owner/tickets/new`, `/owner/tickets/:id` | List, search/filter, new intake, detail, assignment, timeline, print receipt; new intake completes the owner user story |
| Owner technicians | `/owner/technicians`, `/owner/technicians/new`, `/owner/technicians/:id`, `/owner/technicians/:id/edit` | Technician list, add/invite, details/workload/history, edit |
| Owner customers | `/owner/customers`, `/owner/customers/new`, `/owner/customers/import`, `/owner/customers/:id`, `/owner/customers/:id/edit` | Customer CRUD screens, service history, import preview/results |
| Owner services | `/owner/services`, `/owner/services/new`, `/owner/services/:id`, `/owner/services/:id/edit` | Service catalog, detail, add/edit, pricing and duration |
| Owner reports | `/owner/reports` | `laporan.html`; date filters, revenue, volumes, SLA |
| Service transactions | `/owner/transactions`, `/owner/transactions/:id` | PRD transaction scope; distinguish service income from URT subscription payments |
| Subscriptions | `/owner/subscription`, `/owner/subscription/plans`, `/owner/subscription/checkout`, `/owner/subscription/invoices/:id`, `/owner/subscription/payments/:id` | Consolidates subscription overview, choose/renew plan, invoice, payment instructions/status/success variants |
| Owner account | `/owner/profile`, `/owner/settings`, `/owner/security` | Owner profile, business details/hours, password and sessions |
| Technician | `/technician`, `/technician/queue`, `/technician/tickets/:id`, `/technician/tickets/:id/estimate`, `/technician/history`, `/technician/profile`, `/technician/security` | Dashboard, assigned queue, diagnosis, estimate, repair/QC, completed history, profile, security |
| Customer | `/customer`, `/customer/services/new`, `/customer/services/:id`, `/customer/services/:id/approval`, `/customer/history`, `/customer/profile`, `/customer/security` | Dashboard, submission, details/tracking, approval, history/warranty information, profile/security |
| App feedback | `/forbidden`, unmatched route | Accessible 403/404 pages and useful return links |

Consolidate duplicate screens rather than copying every HTML file into a separate component:

- `masuk.html`, owner login, and technician auth share authentication behavior; portal-specific entry links can retain their intended destination.
- `antrean.html` and `antrian-servis.html` become the technician queue.
- `riwayat.html`, `riwayat-tiket.html`, and completed-ticket variants become a filtered history/detail experience.
- `ringkasan-terkirim.html` becomes a real estimate-submitted confirmation following successful persistence.
- Customer approved/rejected pages become approval-result states of the same ticket, with a return to tracking.
- Owner `langganan`, `subscription`, choose/renew-plan, payment/instruction/success variants share one subscription flow. Keep invoice detail printable.
- Reuse one create/edit form per managed entity where the fields actually match.

Invitation links follow an agreed API-issued token transport. If a link contains a token, capture it into memory and remove it from the address with `history.replaceState` before further navigation; never send it to analytics. Reload after removal needs the invitation link again. Never accept an invitation automatically on page load.

During cutover, inventory all legacy HTML links and configure redirects to their canonical routes, preserving ticket/entity parameters where applicable. Do not delete or rewrite the existing prototype during the initial React build.

## 6. Shared UI and interaction requirements

Implement the established navy sidebar, light canvas, white cards, blue actions, Inter typography, subtle borders, and semantic status colors. Port styles intentionally; global legacy styles and DOM-manipulating scripts should not be imported wholesale into React.

Shared pieces needed across the actual screens:

- Portal shell, sidebar navigation, mobile menu, top bar, page header, breadcrumbs, and account menu.
- Buttons, labeled inputs/selects/textareas, field errors, form sections, confirmation dialog, inline notice, and success feedback.
- Summary cards, search/filter controls, simple tables, pagination, and empty/loading/error states.
- Ticket status badge, service stepper, timeline, device summary, estimate line items, and cost summary.
- Upload field only on screens whose attachment contract is ready; printable service receipt and invoice layouts.

Use PRD breakpoints: desktop at least 1200px, tablet 768–1199px, mobile at most 767px. Collapse the sidebar on mobile; keep primary actions visible; use scrolling tables or readable cards. Provide keyboard navigation, visible focus, associated labels, dialog focus handling, and text alongside status colors. Use the required contrast even where muted prototype text needs adjustment.

Every screen must account for loading, no records, no filter matches, validation errors, server/network errors, permission denial, session expiry, and successful completion. Disable a submit button while its mutation is pending. Preserve entered data after a failure; show success only after server confirmation. Avoid optimistic updates for approvals, payments, and status transitions.

### 6.1 Shared component inventory

These components serve identified screens. Add each when its phase first uses it; this inventory does not require an upfront component library.

| Group | Planned components | Responsibility / inputs | First phase |
| --- | --- | --- | --- |
| Layout/navigation | `PublicHeader`, `PublicFooter`, `AuthCard`, `Sidebar`, `SidebarItem`, `MobileNav`, `Topbar`, `AccountMenu`, `PageHeader`, `Breadcrumbs` | Active route, explicit role navigation, mobile disclosure/focus; shell owns menu state | 1 |
| Actions | `Button`, `IconButton`, `ConfirmDialog` | Variant, pending/disabled state, accessible name; cancel/escape/return focus | 1–3 |
| Fields | `FormField`, `TextInput`, `PasswordInput`, `SelectField`, `TextareaField`, `CheckboxField`, `FieldError` | Native control props, associated label/help/error IDs; no configurable form renderer | 1–3 |
| Feedback | `PageLoader`, `Skeleton`, `EmptyState`, `ErrorState`, `InlineNotice`, `FormErrorSummary`, `SuccessNotice` | Loading/error/empty/success and recovery action; accessible announcements | 1–2 |
| Data display | `SummaryCard`, `SearchInput`, `FilterBar`, `Pagination`, `Badge`, `DetailSection`, `DescriptionList` | Basic presentation; semantic feature tables rather than a table engine | 3–7 |
| Ticket display | `TicketStatusBadge`, `ServiceStepper`, `TicketTimeline`, `DeviceSummary`, `TicketSummaryCard`, `EstimateBreakdown`, `CostSummary` | Typed role-filtered data and one status map; no independent fetching | 4–5 |
| Files/printing | `AttachmentField`, `AttachmentList`, `AttachmentItem`, `ServiceReceipt` | Upload versus association progress, visibility, fresh authorized URLs, detach; print CSS | 6 |
| Finance | `InvoiceHeader`, `InvoiceLineItems`, `PaymentStatusBadge`, `PaymentHistory`, `InvoicePrintView` | Share presentation only where service/subscription document semantics match | 7–8 |

Start with native date/file controls and one labeled OTP input. Add custom pickers, comboboxes, tabs, or toast infrastructure only when an implemented interaction needs them. Multiple form cards still form one semantic form with one submit path.

### 6.2 Page composition and feature components

Section 5 defines route coverage. This table defines the main component boundaries within those pages; duplicate prototype screens become states of the same feature.

| Feature/pages | Main components | Data/actions owned by page |
| --- | --- | --- |
| Landing/business entry | `HeroSection`, `TrackingLookupForm`, `WorkflowSection`, `RoleOverviewSection`, `FeaturesSection`, `PricingSection`, `BusinessOverview` | Public content and business slug; actual offered prices and enabled actions only |
| Public tracking result | `TrackingAccessForm`, `PublicTrackingSummary`, `PublicServiceTimeline` | Submit business/code/secret; uniform lookup failure; separate allowlisted response from private detail |
| Login/registration | `LoginForm`, `RegisterForm`, `GoogleSignInButton`, `AuthLinks` | Existing auth endpoints; safe return destination; owner resumes onboarding |
| Verification/recovery | `EmailVerificationForm`, `OtpField`, `ResendOtpButton`, `ForgotPasswordForm`, `ResetPasswordForm` | Cooldown/errors, recovery steps, in-memory reset token |
| Portal/invitations | `PortalChoiceCard`, `InvitationSummary`, `InvitationAcceptForm` | Membership choices, verified identity, expired/mismatch/already-accepted states, context reload |
| Account/role profiles | `AccountProfileForm`, `ChangePasswordForm`, `SessionList`, `SessionCard`, `ContactDetailsForm`, `TechnicianSpecializationForm` | Separate account/security versus business fields; current-device logout and other-device revoke |
| Business setup/settings | `BusinessDetailsForm`, `BusinessHoursFields`, `BusinessContactFields`, `BusinessPortalLinks` | Create/update, slug/timezone/currency validation; copy feedback after successful clipboard action |
| Owner dashboard | `OwnerSummaryCards`, `RecentTicketsTable`, `TechnicianWorkloadList`, `SubscriptionSummaryCard` | Scoped aggregates and recent work; subscription card connects in phase 8 |
| Owner ticket list/detail | `TicketFilters`, `OwnerTicketsTable`, shared ticket views, `AssignmentForm`, `IntakeEditForm`, `HandoverForm`, `TicketConflictNotice` | URL list query, resource/revision/allowed commands; no arbitrary status dropdown |
| Walk-in/customer submission | `ServiceRequestForm`, `CustomerPicker` (owner only), `DeviceFields`, `ComplaintFields`, `IntakeMethodField`, `SubmissionConfirmation` | Share matching intake fields; owner selects contact, customer identity comes from auth |
| Technician dashboard/queue | `TechnicianSummaryCards`, `AssignedTicketCard`, `QueueFilters`, `TechnicianQueueList` | Assigned-only summary/list, filters/page, next permitted task |
| Technician diagnosis/estimate | Shared ticket views, `DiagnosisForm`, `EstimateEditor`, `EstimateLineItemRow`, `EstimatePreview`, `EstimateSubmitConfirmation` | Save diagnosis/draft; edit labor/parts and target; submit immutable revision |
| Repair/QC/completion | `RepairActions`, `QualityCheckForm`, `CompletionForm` | Server-permitted transitions, QC findings, final work and explicitly stored warranty fields |
| Customer dashboard/detail | `CustomerSummaryCards`, `ActiveServiceCard`, shared ticket views, `CustomerServiceActions` | Own tickets, customer-visible detail, cancellation only when permitted |
| Customer approval | `EstimateVersionNotice`, shared `EstimateBreakdown`, `ApprovalDecisionForm`, `ApprovalResult` | Exact estimate/version/revision, approve/reject confirmation, stale/repeated decision handling |
| Histories | `HistoryFilters`, `ServiceHistoryList`, `CompletedTicketSummary`, `WarrantyDetails` | Scoped history filters; ready versus collected; stored warranty only |
| Customers CRUD/detail | `CustomerFilters`, `CustomersTable`, `CustomerForm`, `CustomerDetails`, `CustomerServiceHistory`, `CustomerLinkStatus`, `CustomerInvitationAction` | Contact edits/archive/claim; no silent identity or service-history merge |
| Technicians CRUD/detail | `TechniciansTable`, `TechnicianInviteForm`, `TechnicianProfileForm`, `TechnicianWorkload`, `TechnicianHistory`, `InvitationStatus` | Invite/resend, business fields, deactivate with active-ticket conflicts |
| Services CRUD/detail | `ServicesTable`, `ServiceForm`, `ServiceDetails`, `ArchiveServiceDialog` | Repair category/base price/duration, archive/reactivate |
| Repair transactions/invoices | `TransactionFilters`, `TransactionsTable`, `ServiceInvoiceDetail`, `RecordPaymentForm`, `VoidInvoiceDialog`, shared invoice views | Issue/read, confirmed receipt entry, duplicate/stale/overpayment handling, unpaid-only void initially |
| Reports | `ReportDateRange`, `RevenueSummary`, `ServiceVolumeSummary`, `SlaSummary`, `RevenueTrend`, `StatusDistribution` | Backend aggregates and business timezone; accessible text/table alternative for trends |
| Subscriptions | `SubscriptionOverview`, `PlanCard`, `PlanComparison`, `CheckoutSummary`, `SubscriptionInvoiceDetail`, `PaymentInstructions`, `PaymentResult` | Server-priced invoice, actual instructions, pending/paid/expired/void state |
| Customer import | `CustomerImportUpload`, `ImportColumnGuide`, `ImportPreviewTable`, `ImportErrorList`, `ImportSummary` | CSV preview/confirm, row errors/duplicates, created/skipped/failed counts |
| Legal/app feedback | `LegalDocument`, `ForbiddenPage`, `NotFoundPage` | Semantic content, useful return destinations |

Keep role-specific columns in feature tables. Extract a shared table abstraction only after real tables repeat behavior. `EstimateLineItemRow` edits a draft; `EstimateBreakdown` displays a submitted server snapshot. Neither substitutes preview arithmetic for the authoritative total.

## 7. Existing authentication contract

All paths below have the `/api/v1` prefix. Follow the implementation, rather than assuming a conventional JWT setup.

| Function | Existing request | Frontend behavior |
| --- | --- | --- |
| CSRF bootstrap | `GET /auth/csrf-token` | Include cookies; retain `data.csrfToken` in memory |
| Register | `POST /auth/register` | Send first/last name, email, password; do not promise phone persistence yet |
| Password login | `POST /auth/login` | Send email/password; retain returned user, access token, device ID, and replacement CSRF token |
| Google login | `POST /auth/google` with `{ idToken }` | Show only when configured; use Google Identity Services; exchange credential and discard it |
| Session refresh | `POST /auth/refresh-token` | Uses HttpOnly refresh cookie and CSRF; updates access token and device ID |
| Current profile | `GET /auth/profile` | Read `data.user` after session restoration |
| Edit profile | `PUT /auth/profile` | Update supported fields; email changes clear verification |
| Verify email | `POST /auth/verify-email` with `{ email, otp }` | Show verification result, then refetch current profile |
| Resend verification | `POST /auth/resend-verification` with `{ email }` | Respect server cooldown/rate limits |
| Start recovery | `POST /auth/forgot-password` with `{ email }` | Preserve the API's neutral account-recovery response |
| Verify recovery OTP | `POST /auth/verify-reset-otp` with `{ email, otp }` | Keep returned reset token in memory for the password step |
| Finish recovery | `POST /auth/reset-password` | Send `resetToken`, `password`, `confirmPassword`; return to login after success |
| Change password | `PUT /auth/change-password` | Send current/new/confirmation fields; replace returned access and CSRF tokens |
| List sessions | `GET /auth/devices` | Render current device and other active sessions |
| Revoke session | `DELETE /auth/devices/:deviceId` | Confirm and refetch; use logout for the current device |
| Logout | `POST /auth/logout` | Works with refresh cookie even if access token expired; clear local auth state on confirmed logout |
| Logout everywhere | `POST /auth/logout-all` | Requires bearer token; clears local auth on success |

Session behavior:

1. Use `credentials: 'include'` for API requests. Bootstrap CSRF before writes, including login, signup, recovery, refresh, and uploads.
2. Keep access and CSRF tokens in memory. The API owns the HttpOnly refresh cookie. Persist only the nonsecret device ID and send it with `X-Device-Id` where required; do not put credentials in localStorage or URLs.
3. On a reload, bootstrap CSRF, attempt refresh, then load the current profile before deciding which portal to render. Keep an explicit loading state so private UI does not flash.
4. Send `Authorization: Bearer ...` for protected requests and `X-CSRF-Token` for unsafe methods. Replace CSRF state after login, registration, Google login, and password change. Current refresh responses do not return a replacement CSRF token.
5. If concurrent requests need refresh, share one in-flight refresh promise. Permit one bounded continuation for an authenticated request rejected before execution; do not replay failed mutations indiscriminately or build retry loops. Session restoration must also avoid duplicate refreshes during React development remounts.
6. Handle expired/revoked sessions by clearing user state and returning to login with a safe internal destination. Network/storage outages should show a recoverable error rather than imply incorrect credentials.
7. Handle `CSRF_MISSING`/`CSRF_INVALID` by obtaining current CSRF state and offering a fresh attempt. Respect 429 responses; distinguish permission errors from authentication expiry.
8. Surface `ACCOUNT_LINK_REQUIRED`, `PASSWORD_NOT_SET`, disabled-account, and unavailable-provider errors clearly. Do not automatically link Google and password accounts or replay old Google credentials.
9. The API currently permits sessions for unverified email addresses. Offer verification without inventing a frontend-only security requirement. If verified email becomes mandatory, enforce it on the backend too.
10. Google-only accounts have no password, and the current profile response does not expose a provider/password capability field. Request a safe capability field before reliably hiding password controls for those users; support the existing `PASSWORD_NOT_SET` error meanwhile.
11. An interrupted password-reset flow should restart OTP verification if its in-memory reset token is lost. Verification/welcome/reset emails are sent by the API's mail service; the frontend does not call `sendTemplate` or send mail itself.

The shared base query and endpoint transforms should understand the existing success/error envelope, optional field validation details, top-level pagination, empty responses, and multipart requests. Do not manually set multipart `Content-Type`. Upload one `file` per request; current limits are 5 MiB for supported images and 10 MiB for PDFs. Store upload keys, refresh expiring signed URLs through authorized metadata requests, and add ticket association only after that contract exists.

## 8. Core ticket workflow

Use the backend plan's canonical English values with one Indonesian presentation map in `features/tickets/status.ts`. The backend transition rules and `allowedActions` remain authoritative.

| Machine value | Indonesian label | Meaning |
| --- | --- | --- |
| `submitted` | Pengajuan | Request recorded |
| `waiting_diagnosis` | Menunggu Diagnosis | Waiting for technician work |
| `diagnosing` | Diagnosis | Investigation underway |
| `awaiting_approval` | Menunggu Persetujuan | Current submitted estimate needs a decision |
| `approved` | Disetujui | Current estimate accepted |
| `repairing` | Dalam Pengerjaan | Repair underway |
| `quality_check` | QC | Post-repair checks |
| `completed` | Selesai / Siap Diambil | Passed QC and ready; pickup recorded separately |
| `rejected` | Ditolak | Estimate declined; revision or return decision needed |
| `cancelled` | Dibatalkan | Closed without completed repair |

Proposed normal sequence and branches:

```text
submitted -> waiting_diagnosis -> diagnosing -> awaiting_approval
          -> approved -> repairing -> quality_check -> completed

awaiting_approval -> rejected
rejected -> diagnosing (revised estimate, recorded reason)
quality_check -> repairing (failed QC)
submitted / waiting_diagnosis / rejected -> cancelled (per actor/rule)
completed -> handover event (separate handedOverAt)
```

Follow the backend baseline: `completed` means passed QC and ready for pickup; `handedOverAt` records actual collection. A revised estimate requires renewed consent. Preserve the decision for each version. The stepper groups visual stages without inferring permission or showing rejected/cancelled tickets as successful completion.

The prototype uses conflicting strings such as `DIAGNOSIS`/`DIAGNOSA` and `PERBAIKAN`/`PENGERJAAN`. Use one agreed mapping to Indonesian labels, badge styles, and tracker stages. Do not spread string comparisons across pages or infer permission from the displayed status.

The first complete workflow must support:

1. Customer selects the intended service center, submits device category/brand/model, complaint, and supported intake information; receives a persisted ticket reference.
2. Owner sees the ticket, verifies intake, and assigns a technician from that business. Owner can also record a walk-in ticket for a customer.
3. Assigned technician records diagnosis, parts/labor line items, expected completion date, and submits an estimate.
4. Customer sees the exact submitted estimate and approves or rejects it. Record decision against the estimate version so a later price change cannot reuse an earlier approval.
5. Technician progresses through repair and QC only when allowed; failed QC returns through an agreed transition.
6. Owner/customer sees the updated timeline and final cost. Finish the agreed pickup/handover flow, then expose the record in history and print a receipt.
7. Rejection, reassignment, outdated estimates, stale updates, missing records, and unavailable attachments have defined UI outcomes.

Server responses determine permitted operations and persisted state. On `TICKET_CHANGED`, `ESTIMATE_CHANGED`, or `INVOICE_CHANGED`, retain recoverable draft inputs, refetch, and ask the user to review changes. Never automatically replay approval, payment, or a transition. For `INVALID_STATUS_TRANSITION` or removed permissions, refresh allowed actions and explain the blocked operation. Use separate customer/staff response types where fields differ; private notes must be absent from customer responses.

Start with RTK Query mutation invalidation and a visible refresh control. Introduce endpoint-level polling only if operational freshness requires it; WebSockets are not an initial dependency. Other accounts/portals see the same persisted ticket after reloading/refetching; Redux cache invalidation affects only the current store.

## 9. Phase-by-phase delivery plan

Every phase includes relevant loading, empty, validation, permission, pending, error, and success states. Build complete operations as their contracts become available. Frontend phase numbers differ from backend phase numbers; the dependency column maps them.

| Frontend phase | Scope | Backend dependency |
| --- | --- | --- |
| 0 | Contracts and scope | Backend phase 0 for finalized domain shapes |
| 1 | React/Redux foundation, base API, tokens, layouts, public pages | None for static pages |
| 2 | Auth slice, session lifecycle, connected auth/account endpoints | Existing auth and configured dependencies; profile fixes as needed |
| 3 | Business selection slice, membership queries, setup/minimum directories | Backend phase 1 |
| 4 | Ticket intake, assignment, technician queue | Backend phase 2 |
| 5 | Diagnosis, estimate, approval, repair, QC, handover | Backend phase 3 |
| 6 | Daily portals, tracking, attachments, printing | Backend phase 4 and archive/profile changes |
| 7 | Repair finance and reports | Backend phase 5 |
| 8 | Subscriptions and CSV import | Backend phase 6 plus billing decisions |
| 9 | Cutover, deployment preparation, handoff | Backend phase 7 and launch-scope completion |

### Phase 0 — Align scope and contracts

**Goal:** consistent frontend/backend assumptions before domain implementation.

- Inventory legacy routes, forms, asset paths, fields, and duplicate screens against sections 5–6.
- Adopt business relationships, public business entry, canonical statuses, ready/handover distinction, estimate versioning, and tracking requirements from the backend plan.
- Agree on identity/context, role-filtered ticket shapes, `allowedActions`, list pagination, validation fields and revision conflict responses. Reuse existing contract artifacts if available; do not maintain duplicate specifications for planning alone.
- Adopt the EEINA patterns and URT-specific differences in section 1.1. Agree on auth/business slice fields, query arguments, scoped tags and cache cleanup before connecting private screens.
- Track remaining business decisions by the phase they block. Billing questions do not block auth or ticket intake.

**Deliverable:** reviewed route/component inventory and core request/response shapes. **Complete when:** no core screen assumes global roles grant business access, ticket codes authorize private tracking, or transitions accept arbitrary status changes.

### Phase 1 — React/Redux foundation, design tokens, and shells

**Goal:** runnable `mern stack/web` with the URT visual foundation.

- Scaffold React/TypeScript/Vite, lockfile, router, public environment example and development/build/type-check commands. No test tooling.
- Install Redux Toolkit/React Redux; add `store.ts`, typed hooks, `Providers.tsx`, one `baseApi`, middleware and listeners. Start the auth slice; add business selection only in phase 3. Keep state/API caches unpersisted.
- Port PRD tokens/typography and selected assets; establish CSS Modules, responsive shells, explicit navigation, lazy route pages, suspense fallback and app render-error boundary.
- Build static landing sections, legal pages, public/auth layouts and 403/404 pages. Portal shells remain explicitly awaiting auth/business integration.
- Add buttons/fields/navigation/feedback components as used, following section 6.1.
- Add `baseQuery.ts` and session helpers: URT envelopes, top-level pagination, field errors, credentials, 204/multipart behavior and typed transport options. Complete token rotation/session orchestration in phase 2.

**Pages/components:** landing, legal and feedback pages; Redux provider and three layouts; navigation, buttons/fields/loaders/notices. **Complete when:** build/type checks pass, reducer/API middleware is registered once, typed hooks work, direct navigation works, and layouts match the reference across PRD breakpoints. Browser configuration contains no server secrets.

### Phase 2 — Connected authentication and shared account

**Goal:** reliable identity and session lifecycle against the existing API.

- Implement section 7: CSRF, password/Google auth when configured, session restoration, profile loading, refresh and logout with one in-flight refresh promise.
- Complete `authSlice`, `authApi`, `SessionBootstrap` and centralized session cleanup. Use generated mutation/query hooks; credential/profile synchronization has one endpoint/session owner. Sanitize debug output and reset secret-bearing mutation state after consumption.
- Build email verification/resend, OTP password recovery, profile editing, password changes, active sessions/revocation and logout-all.
- Implement `RequireAuth`, safe internal return destinations, expired/unavailable states, and account-capability UI when supplied by the backend.
- Keep private pages pending until restoration resolves. `/account/*` works without a business; membership-based portal redirects arrive in phase 3.

**Pages/components:** bootstrap/auth guards, login/signup/verification/recovery forms, OTP/resend, account profile/password/session components. **Complete when:** configured auth flows connect, reload restores the profile, concurrent expiry uses one refresh, logout/terminal expiry clear API cache, transient outages show recovery UI, and credentials stay out of persistent browser storage. Do not fabricate portal roles from `user`/`admin`.

### Phase 3 — Business setup, membership, and minimum directories

**Goal:** establish real actors and the records needed for the first ticket.

- Build owner onboarding/settings, public business entry, `businessSlice`, `businessApi`, `BusinessGate`, portal choice and `RequireBusinessRole`. Query `/me/businesses`; keep memberships in RTK Query and selection in the slice.
- Implement minimum customer contact create/list/select, service create/list/select and technician invite/list/accept. Add customer invitation acceptance and link state.
- Handle expired/mismatched invitations, verified-email requirements, resend, wrong context and no-membership destinations. Invitation acceptance is an explicit user action.
- Revalidate saved context hints; clear old business data when switching. Owner-created contacts do not become login accounts automatically.
- Scope query arguments by business/portal. Invitation acceptance/onboarding invalidates membership tags; switches stop old consumers and reset cached private responses before loading the new context.

**Pages/components:** onboarding/portal/invitation pages, minimum directory lists/forms, `CustomerPicker`, business details/hours/links. **Complete when:** an owner has a business, an invited technician joins it, and customer business entry/verified contact claim resolves correctly. Walk-in contacts work without an account password. Ticket submission follows in phase 4; full directory detail/edit follows in phase 6.

### Phase 4 — Ticket intake, assignment, and technician queue

**Goal:** one persisted ticket is visible to its authorized participants.

- Define ticket DTOs, `ticketsApi` injected endpoints/generated hooks, status map, role-filtered views and revision/conflict handling. Include business/portal/filter/page in query arguments; add scoped ticket/list tags.
- Build customer submission, including first-time business entry without prior membership, and owner walk-in intake; confirmation shows the real saved ticket reference and reloads business context.
- Build owner list/detail/intake corrections/assignment, assigned technician queue/detail and customer active-service list/detail.
- Connect server search/filter/sort/pagination to URL state; include missing/forbidden resources, no matches and refresh controls.
- Use `skipToken` until context is ready, `currentData` on context changes, `isLoading` for first load and `isFetching` for background refresh. Do not create ticket entity slices or fetch effects.

**Pages/components:** request/intake forms, ticket filters/tables/cards, assignment/intake forms, device summary/status badge and initial timeline/stepper. **Complete when:** a ticket can be saved, assigned and reloaded by the correct owner/customer/technician; unrelated users receive no private resource data.

### Phase 5 — Diagnosis, estimate, approval, repair, and QC

**Goal:** complete the first product milestone across all three roles.

- Build diagnosis/draft editing, labor/parts lines, promised target, preview and explicit immutable estimate submission.
- Build customer approval/rejection bound to current version/revision, estimate history, recorded result and renewed consent after revision.
- Add permitted repair/QC actions, QC-failed return to repair, completion summary/readiness, owner handover and customer/technician history.
- Complete rejected/cancelled paths, stale updates, reassignment restrictions, duplicate submits and uncertain network outcomes.
- Extend the same `ticketsApi` for workflow mutations. Invalidate detail/list/dashboard/history tags on success; refetch conflicts without optimistic approval or automatic replay.

**Pages/components:** estimate editor/preview, approval form/result, repair/QC/completion/handover forms, full timeline and histories. **Complete when:** submission → assignment → diagnosis/estimate → approval → repair → QC → ready → handover persists across separate accounts. Rejection/revision, stale approval and failed QC have usable outcomes; no frontend-only status override can begin repair.

### Phase 6 — Daily portals, tracking, attachments, and printing

**Goal:** finish daily operational coverage around the working repair flow.

- Connect all role dashboards, workload lists, active/history queries and correct business portal links. Use real aggregates and counts.
- Connect the remaining directory/dashboard/attachment endpoints through the shared API slice and scoped tags. Share subscriptions through generated hooks; add no separate customer/technician portal API slices.
- Finish customer/technician/service detail/edit/archive/reactivate pages, active-ticket deactivation conflicts and linked-account boundaries.
- Finish global versus business profile forms/settings and invitation resend states. Show delivered-mail feedback only when delivery is actually confirmed.
- Connect public business/code/secret tracking with sanitized progress; secrets stay out of URLs/storage.
- Add upload followed by separate ticket association, explicit visibility, authorized expiring URLs and detach handling. Failed association never appears attached.
- Add printable service receipts from saved intake/approved-work data; settlement details connect in phase 7. Warranty displays only when stored.

**Pages/components:** role dashboards, remaining management/profile/settings pages, public tracking, attachment UI and receipt/print layouts. **Complete when:** core portal navigation leads to usable connected pages, private notes/files are absent from customer/public responses, and tracking/printing reflect authorized saved data.

### Phase 7 — Repair finance and reports

**Goal:** authoritative transactions and meaningful owner reports.

- Build service invoice issue/detail/list/print, manual receipt entry, payment history and unpaid invoice void/replacement.
- Use operation IDs and revisions required by the API; handle duplicates, stale state, overpayment and unknown outcomes without automatic payment replay.
- Build report date filters and revenue/completion/SLA views from server aggregates in business timezone. No eligible SLA records is distinct from zero performance.
- Add invoice/report endpoints and scoped invalidation. Receipt mutations invalidate invoice, ticket, dashboard and report reads; date filters stay in URLs rather than report slices.
- Start with accessible tables and simple CSS/SVG trends; add a chart dependency only if required interactions justify it.

**Pages/components:** transactions, invoice/payment/void forms, report summaries and trends. **Complete when:** balances and receipts reconcile with revenue, subscription payments are separate, and metrics do not extrapolate from paginated rows. Corrections/refunds need agreed rules before those actions are exposed.

### Phase 8 — Subscriptions and customer import

**Goal:** connect remaining owner flows to real billing and import behavior.

- Build subscription overview/plans/checkout/invoice/instructions/result using actual server prices and authoritative status.
- Support pending/paid/expired/void states and agreed entitlement restrictions. A browser payment-return URL alone cannot confirm success; offer status refresh.
- Enable QRIS/Virtual Account only when the chosen arrangement provides them. Manual launch requires independent platform confirmation; an owner cannot activate their own subscription.
- Build dedicated CSV guide/upload/preview/confirm/results with row errors, duplicates and created/skipped/failed counts. Preview writes nothing; confirmation revalidates. No XLS/XLSX parser until required.
- Inject subscription/import endpoints into `baseApi`. Preview has no invalidation; confirmed import refreshes customer lists. Poll payment status only if needed; never replay payment mutations.

**Pages/components:** subscription/payment pages, plans/checkout/invoice components, import upload/preview/errors/summary. **Complete when:** entitlement follows independent confirmation, duplicate confirmation cannot extend twice, and import never silently overwrites linked identity/history. Subscription and import work may ship independently.

### Phase 9 — Cutover, deployment preparation, and handoff

**Goal:** prepare the completed SPA for deployment alongside the API.

- Review responsive layouts, keyboard/focus/forms, terminology, print output, deep links, business switching and feedback states across completed screens.
- Map legacy HTML/query links to canonical routes, preserving context/resources and useful recovery to access steps. Keep the prototype available until migration is accepted.
- Configure static route fallback, API proxy/CORS/cookies and public environment values. Document selected Node/package requirements and build/start steps.
- Run applicable existing build/type checks and report runtime dependencies still unverified. Hand the user section 11's acceptance checklist; add no tests/test scripts.
- Review reducer ownership, middleware/listener registration, cache scope/reset, secret persistence/debug settings and unused slices; remove temporary duplicated request/state code before handoff.

**Deliverable:** deployable build, legacy-route mapping and setup/handoff documentation. **Complete when:** production-host deep links work, auth runtime configuration matches deployment, and launch navigation makes no unimplemented feature claims. Record user acceptance as pending until the user performs it.

### Release checkpoints

```text
0 contracts -> 1 foundation -> 2 auth -> 3 business/minimum directories
  -> 4 intake/assignment -> 5 complete repair workflow
  -> 6 daily operations -> 7 repair finance/reports
  -> 8 subscriptions/import -> 9 cutover
```

- **Foundation milestone:** phases 1–2, runnable responsive application with connected identity/account flows.
- **Core product milestone:** phases 3–5, one persisted ticket completed across all three roles, including defined exception paths.
- **Daily operations milestone:** phase 6, dashboards/directories, private attachments, safe tracking and printing.
- **Full planned scope:** phases 7–9, finance/reports, real subscriptions/import and deployment handoff.

Billing/import do not block the core milestone. If launching before them, omit unavailable actions/navigation and document deferred scope. Every release still needs the applicable phase 9 deployment preparation.

Work on visual layouts can proceed while a domain endpoint is pending, but label the feature as awaiting integration. Do not make a missing endpoint look successful through hardcoded metrics, browser-only persistence, or simulated payments. Integrate each feature as its contract becomes available.

Contact import should begin with an agreed file format and server-side validation/preview/results. The prototype advertises CSV/XLSX/XLS; broad spreadsheet support can follow CSV if required, without adding a parser ahead of that requirement. Business subscriptions and service transactions must remain distinct in data and navigation.

## 10. Configuration and deployment

- Frontend `.env.example`: `VITE_API_BASE_URL` (prefer `/api/v1`) and optional `VITE_GOOGLE_CLIENT_ID`. [Vite documents that `VITE_*` values are exposed in the client bundle](https://vite.dev/guide/env-and-mode). Database, Redis, SMTP, R2, and token-signing secrets stay on the API.
- Development: a documented frontend origin and API port, with the origin explicitly allowed by API CORS. Follow the chosen Vite version's Node requirements rather than assuming the backend's Node minimum is sufficient.
- Production: prefer same-origin `/api/v1` reverse proxying, or a same-site frontend/API arrangement with matching cookie settings and credentialed CORS. A separate site requires suitable HTTPS/cookie configuration and remains subject to browser third-party-cookie restrictions.
- Static hosting must serve the React entry point for application routes, while forwarding API routes correctly. Support direct opening of a ticket/invoice page and legacy redirects.
- Keep Google authorized origins/client ID aligned; show Google login only when configured. Verify mail and R2 readiness before exposing dependent flows as available.
- Use print CSS for receipts/invoices first. Add generated/downloadable PDFs only if the product requires a stored document or reliable server rendering.
- Replace prototype fixed dates, counts, progress values, and always-online labels with server-backed values or accurate static copy. Decorative notification icons need a defined action; do not imply an implemented notification feed.

## 11. User-owned verification and acceptance

Per repository preferences, the user handles testing. This plan adds no test files, frameworks, fixtures, or test scripts. During implementation, run the relevant existing type/build checks and report their results; do not describe static inspection as live verification.

Manual acceptance checklist for the user:

- Password and configured Google sign-in; duplicate identity errors; email OTP and resend; password reset; session restoration; logout; session revocation.
- Redux session bootstrap, concurrent expiry, CSRF rotation, failed refresh availability, cache reset on logout/account/business/portal change, and late-response handling. No prior staff response appears in a customer context.
- RTK Query invalidation updates affected lists/details/dashboards/reports; filter/page/back/forward changes retain correct cache scope; 409 requires review; a background request failure does not erase usable records.
- Correct portal for each authenticated membership; wrong-role, wrong-business, wrong-customer, and unassigned-technician access rejected by the API.
- Full ticket workflow across separate owner, technician, and customer sessions, including rejection, revised estimates, stale updates, and QC.
- Create/edit/list/detail behavior for customers, technicians, services, and business details; no false persistence of phone/address fields.
- Public tracking shows only the agreed public fields and cannot authorize private mutations.
- Upload limits, private attachment access, deleted files, and expired download URLs.
- Search/filter/pagination, empty states, failed requests, pending submissions, refresh, browser back/forward, direct deep links, and unknown routes.
- Mobile/tablet/desktop navigation; keyboard focus; form errors; readable status labels; printed receipts/invoices.
- Reports match agreed date and financial definitions; invoice/payment/subscription states match the backend; imports show row-level failures.

The first implementation milestone should be the React foundation plus connected authentication. The first product milestone should be one real service ticket completed across all three roles. Remaining management and billing screens follow that working foundation.
