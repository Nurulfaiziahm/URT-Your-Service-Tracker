**Google signup and login — implementation plan**

Target: this Express/TypeScript URT API. Reference: `/mnt/data/projects/eeina/app/api`.

Status: implemented on 26 October 2026. The TypeScript build passed. Live Google/browser, MongoDB/Redis, and email behavior has not been exercised; the manual checklist below remains for user verification. Account linking and adding a first password remain outside this release.

**1. Intended behavior and scope**

Add Google signup and returning-user login through Google Identity Services (GIS). The frontend receives a Google ID token and submits it to `POST /api/v1/auth/google`. The API verifies the identity, creates or finds the user, and starts the same Redis-backed device session used by password login.

The initial release includes browser signup/login, existing session integration, passwordless account support, email verification handling, configuration, and integration documentation.

Account linking/unlinking, adding a first password, native client configuration, redirect callbacks, One Tap/automatic login, and access to Google APIs are later features. The frontend should use the regular Google sign-in button with a JavaScript callback for this release.

Reuse `AuthService.startSession()`, `TokenService`, `deviceService`, `CookieHelper`, `saveCsrfToken()`, existing rate limiters, and existing mail/OTP stores. Add one runtime dependency: `google-auth-library`. Keep Google-specific verification in one small service. No provider framework, Passport integration, additional token store, database transaction system, or background job is needed.

**2. Findings that shape the implementation**

| Existing code | Implication |
| --- | --- |
| `src/modules/auth/auth.service.ts` has a private `startSession()` shared by registration and password login | Implement Google account resolution inside `AuthService` and finish through that method. |
| `src/core/security/csrf.ts` protects every unsafe `/api/v1` request through `src/app.ts` | The Google POST must use the existing CSRF session/header. |
| `src/models/User.model.ts` requires a password and surname | Both rules need to accommodate Google accounts without weakening password registration validation. |
| Login, change-password, and reset flows assume a stored password | Audit every credential entry point when making the password optional. |
| `src/types/common.ts` explicitly formats user responses | Keep provider identifiers and password hashes out of responses. |
| Profile email updates exist in both `AuthService` and `UserService` | Google login must preserve the application's current email and its verification state. |
| The auth router's current cache middleware uses `/api/v1/auth` inside an already-mounted router | Move that middleware to an early `/api/v1/auth` mount in `app.ts`, before request parsing, CORS, rate limiting, sessions, and CSRF checks, so auth responses and their upstream errors receive `no-store`. |
| No local OpenAPI or Postman collection was found | Use the endpoint contract in this plan and the README as the initial source of truth; additional contract tooling is unnecessary for this change. |
| `examples/browser-auth.js` appears in the IDE context but is absent on disk | Create a focused browser integration example during implementation; do not assume an existing example can be edited. |

Eeina supplies a useful identity-to-local-session pattern. Its native verifier uses `google-auth-library`, and its OAuth handler supports both new and returning users. Adapt those ideas with these changes: check verified email claims, look up Google identity before email, avoid automatic email-based linking, and omit generated passwords. Its browser redirect state contains language data without a random browser-bound value; that redirect implementation should not be copied into this flow.

**3. Account and identity rules**

These are the proposed defaults for implementation.

| Situation | Result |
| --- | --- |
| Verified Google identity matches an existing `googleId` | Check application account status, then sign in to that user. |
| No matching identity and no user with that normalized email | Create a Google-only account with role `user`, then sign in. |
| Email belongs to an existing user but `googleId` does not match | Return `409 ACCOUNT_LINK_REQUIRED`; create no account, link, or session. |
| Matching Google account is inactive or suspended | Return existing `403 ACCOUNT_DISABLED`; do not reactivate it. |
| Token has missing/unverified email or missing subject | Reject without creating a user or session. |
| Google has changed the email of a previously registered Google identity | Sign in by `googleId`; preserve application email and do not overwrite profile fields. |
| A password-only account is temporarily locked after failed password attempts | Preserve that password lock. Google does not bypass email collision policy. |
| A linked Google account has accumulated failed password attempts | Google authentication checks account status but does not consult or reset password-specific lock counters. |

Use the verified `sub` claim as the immutable Google identity. Normalize email with `trim().toLowerCase()` only; do not remove dots, plus suffixes, or otherwise rewrite addresses. Never accept identity, role, status, or verification flags from request profile data. Google's identifier and verification requirements are described in its [server verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

An email collision means the user can continue using their existing sign-in method. The initial UI should explain that choice; it must not present an account-linking action that this release does not implement. Explicit linking will require its own authenticated flow and proof of the existing account before it is offered.

**4. Endpoint contract**

Existing bootstrap request:

```http
GET /api/v1/auth/csrf-token
```

Send credentials with this request. Read `data.csrfToken` and retain the session cookie set by the API.

New authentication request:

```http
POST /api/v1/auth/google
Content-Type: application/json
X-CSRF-Token: <current API csrf token>
X-Device-Id: <optional stable device identifier>

{
  "idToken": "<credential returned by Google Identity Services>"
}
```

This is a public route with no application bearer token requirement. Browser requests must use `credentials: 'include'`. Existing global CSRF protection, CORS policy, API limiting, router auth limiting, and route `loginLimiter` all apply. Device validation stays in `deviceService`; omitted IDs are generated by the backend.

Define a strict Zod body containing only a nonempty `idToken` string, with a reasonable upper bound of 16,384 characters. Reject unknown body fields. Signature validation belongs to the Google library; do not decode a token and trust its payload during request validation.

Successful response: `201 Created` for a newly created user, `200 OK` for a returning user.

```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "<MongoDB user id>",
      "firstName": "Amina",
      "lastName": "",
      "email": "amina@gmail.com",
      "role": "user",
      "status": "active",
      "isEmailVerified": true,
      "createdAt": "<ISO timestamp>"
    },
    "accessToken": "<application access JWT>",
    "deviceId": "<application device id>",
    "csrfToken": "<replacement API csrf token>",
    "isNewUser": true
  }
}
```

Set the existing HttpOnly refresh cookie using `CookieHelper.setRefreshToken()`. Regenerate the CSRF session through `saveCsrfToken(req, true)` and return the replacement token. Clear legacy cookies the same way existing login does. Apply `Cache-Control: no-store` to every auth response, including errors. Neither the Google credential nor the refresh token belongs in JSON, URLs, or browser persistent storage. Existing access JWT claims and refresh/session TTLs remain the application's source of session lifetime.

| HTTP status | Code | Caller behavior |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Correct the body; existing validation middleware includes field details. |
| `400` | `INVALID_DEVICE_ID` | Correct or omit the device header. |
| `401` | `GOOGLE_TOKEN_INVALID` | Obtain a fresh Google credential; includes invalid signature, issuer, audience, expiry, or missing identity/email claims. |
| `403` | `GOOGLE_EMAIL_UNVERIFIED` | Explain that this Google email is not verified. |
| `403` | `ACCOUNT_DISABLED` | Use existing account-disabled handling. |
| `403` | `CSRF_MISSING` / `CSRF_INVALID` | Bootstrap a current CSRF session before a new user-initiated attempt. |
| `409` | `ACCOUNT_LINK_REQUIRED` | Direct the user to their existing sign-in method. |
| `429` | `RATE_LIMITED` | Respect the existing rate limit response and wait before another attempt. |
| `503` | `GOOGLE_AUTH_DISABLED` | Hide Google signup or show it as unavailable for this deployment. |
| `503` | `GOOGLE_AUTH_UNAVAILABLE` | Show temporary provider unavailability; allow a later manual retry. |
| `503` | `AUTH_UNAVAILABLE` | Use existing MongoDB/Redis availability handling where supported. |

Use existing `AppError` and `ResponseHandler`. Keep unexpected programming failures as normal server errors. Distinguish recognized Google key-fetch/network failures from invalid credentials after inspecting the installed library's actual error shapes; do not map every exception to `401`, expose provider diagnostics, or introduce an error hierarchy. Existing global errors such as optimistic-concurrency conflicts continue to apply.

**5. Configuration and Google setup**

Add an optional `GOOGLE_CLIENT_ID` to the validated environment and expose it as `config.google.clientId`. Treat blank as disabled; validate the shape of a nonempty web client ID. This preserves startup for deployments that use only password auth. The route should return `GOOGLE_AUTH_DISABLED` before invoking Google if it is unconfigured.

Create or reuse a Google OAuth web client for this application and environment. Configure branding/audience and authorized JavaScript origins for the actual frontend, including local development origins. The frontend and backend must use the same web client ID. No client secret, Google service account, Google API key, redirect URI, or backend OAuth callback is required for this JavaScript-callback ID-token flow. Follow Google's [setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Provide safe placeholders in `.env.example` and document the frontend variable name as framework-dependent. The client ID is public configuration; no real account credential or `.env` value should be copied into documentation. Choose an installed library version compatible with this project's supported Node runtime and commit the resulting lockfile update.

Initialize one `OAuth2Client` in the small Google service and use `verifyIdToken({ idToken, audience: config.google.clientId })`. Let the library handle signature verification and Google's public-key caching. Return only an internal typed profile containing `googleId`, normalized email, names, and the email authority decision. Store no Google access or refresh tokens.

Require `email_verified === true`. Mark a newly created application email verified when Google is authoritative: a Gmail address, or a verified Workspace claim with `hd`. Other Google accounts follow the existing application email OTP flow. See the distinction in Google's [email ownership guidance](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

For returning users, do not set `isEmailVerified` from the Google claim. Application verification may have been reset after a local profile email change. Its current state must be preserved.

**6. User model and password compatibility**

Update `IUser.password` to an optional string and add optional `googleId: string`. Define a unique sparse index on `googleId`; leave the field absent for password-only users. Do not assign `null` or an empty-string default to it. Use ordinary Mongoose schema definitions and necessary TypeScript annotations.

Make a password required when the document has no `googleId`. Normal `/register` still requires the existing first name, surname, email, and password through its existing Zod schema. This prevents a passwordless local account without a Google identity.

Allow an empty surname for Google-backed users while preserving the local-user requirement. Store `lastName` as a string, including `''`, to retain the existing response shape. For newly created Google users, trim names and cap them to the model's 50-character limit. Use `given_name`, then Google's display name, then `User` for the first name; use `family_name` or `''` for the surname. Do not split an email address to invent a name. Leave existing profile-edit validation unchanged; a frontend editing a Google profile can omit unchanged empty fields.

Hash only a modified, present password. `comparePassword()` should return `false` when no password exists. Preserve existing `authVersion` advancement on real password changes. Saving a Google profile or email verification must not hash an absent password or advance `authVersion`.

Audit all credential paths explicitly:

| Entry point | Required behavior for an account without a password |
| --- | --- |
| `login()` | Return the same generic invalid-credentials response as other invalid passwords, before updating password-failure counters. |
| `changePassword()` | Return `400 PASSWORD_NOT_SET` to the authenticated user, with guidance to use Google; create no password. |
| `forgotPassword()` | Return the generic accepted response, create no reset OTP, and send no reset email. |
| `verifyResetOtp()` | Reject as an invalid reset attempt; mint no reset token even if a stale OTP exists. |
| `resetPassword()` | Reject as an invalid reset attempt; add no first password even if an old reset token exists. |

Queries that make a password-presence decision must explicitly select `+password`, because the model hides it by default. Never infer password absence from an ordinary projected document. Keep these fields inside service code and return only formatted users.

Change the public forgot-password success message to a neutral statement such as `If this account supports password recovery, a reset code has been sent.` Do not disclose Google-only status through that unauthenticated endpoint. Existing local accounts must retain password login, recovery, auth-version changes, and session revocation behavior.

**7. Account resolution and session sequence**

Implement `AuthService.googleLogin(idToken, req)` in this order:

1. Confirm Google auth is configured, extract/validate device metadata, and verify the Google credential before any account writes.
2. Query `User.findOne({ googleId })` only. If a user exists, check its account status and continue with that exact user. Do not use a combined `$or` lookup by email and identity.
3. If the identity is unknown, query the normalized email. Any email match returns `ACCOUNT_LINK_REQUIRED`; do not change the existing account's password, role, verification state, or Google identifier.
4. Create the user with Google identity, normalized email, sanitized names, role `user`, status `active`, and the calculated application-email verification flag. Omit `password` entirely.
5. For a duplicate-key error during creation, re-read by the exact `googleId` once. If present, use that user as a returning login after checking status. Otherwise, an email collision returns `ACCOUNT_LINK_REQUIRED`. Inspect the duplicate index/key and preserve unexpected errors. Only the request that created the document sets `isNewUser: true`.
6. If a newly created account still needs email verification, prepare its existing email OTP before starting the session. Do not create an OTP for an already verified email or regenerate it on every returning login.
7. Call existing `startSession(user, deviceInfo)` and return its `AuthResponse` plus `isNewUser`. This preserves the existing session ID, auth-version, current-device replacement, refresh rotation, and revocation rules.
8. After successful session creation, send welcome mail for the new account and verification mail only if needed, using existing templates. Keep mail nonblocking with a handled promise and the current mail service; mail failure must not turn login into an authentication failure.
9. The controller regenerates/saves the CSRF session, clears legacy cookies, sets the refresh cookie, and sends the correct success status and envelope.

The user may exist if a later OTP/session operation fails. A retry must find that same Google identity and must not create a duplicate account. A returning user can request verification mail through the existing resend endpoint. Do not promise atomic creation across MongoDB, Redis, and email, or introduce cross-store transaction machinery. Welcome mail is best effort and is not guaranteed exactly once.

Reuse account-status checks before starting a session. Google login must never reset an inactive/suspended account or password-failure counters. The existing `startSession()` recheck remains authoritative for sessions.

**8. File-by-file work list**

| File | Planned change |
| --- | --- |
| `package.json`, `package-lock.json` | Add compatible `google-auth-library`; add no test scripts or additional auth dependencies. |
| `.env.example` | Add optional, blank `GOOGLE_CLIENT_ID` with a short setup comment. |
| `src/core/config/index.ts` | Validate optional Google client configuration and export `config.google.clientId`. |
| `src/modules/auth/google.service.ts` (new) | Verify Google ID tokens and produce a minimal internal verified profile. Keep its profile type here unless another feature actually needs it. |
| `src/models/User.model.ts` | Add optional unique Google identity, conditional password/surname rules, and safe password hook/comparison behavior. |
| `src/modules/auth/auth.schema.ts` | Add strict `googleAuthSchema` and inferred request input type. Preserve local registration fields. |
| `src/modules/auth/auth.types.ts` | Add `GoogleAuthResponse extends AuthResponse` with `isNewUser: boolean`. |
| `src/modules/auth/auth.service.ts` | Add Google account resolution; reuse `startSession()`; guard password login/change/recovery; send conditional registration mail. |
| `src/modules/auth/auth.controller.ts` | Add thin Google controller and update forgot-password success wording. |
| `src/modules/auth/auth.routes.ts` | Register `POST /google` with `loginLimiter` and schema validation; remove the ineffective nested cache middleware. |
| `src/app.ts` | Set `Cache-Control: no-store` for `/api/v1/auth` before CORS, body parsing, rate limiting, session loading, and CSRF checks. |
| `README.md` | Explain setup, request/response/error contracts, browser CSRF/session sequence, account collisions, and Google-only recovery behavior. |
| `examples/browser-auth.js` (new unless present at implementation time) | Show GIS callback to API exchange, CSRF replacement, device persistence, errors, and integration with the existing application refresh flow. |

No changes are expected in JWT signing, Redis auth-session algorithms, database connection setup, CORS configuration, or mail templates. Review both profile services for compatibility, but do not refactor their duplication as part of this feature. `formatUserResponse()` should continue to serialize the existing fields only.

Use the existing error handler unless the verified Google failure shapes require a small targeted mapping. Handle feature-specific duplicate-key outcomes in the Google service path so unrelated duplicate-field behavior is unaffected.

**9. Frontend integration**

Load GIS from `https://accounts.google.com/gsi/client` on the frontend auth page. Initialize `google.accounts.id` once with the public web client ID, popup UX, and a credential callback; render the official sign-in button. Google documents the callback and credential fields in its [JavaScript API reference](https://developers.google.com/identity/gsi/web/reference/js-reference).

The frontend sequence is:

1. Fetch the API CSRF bootstrap with cookies included. Obtain a valid stable device ID from application device storage, or let the API generate one on the first login.
2. On the Google credential callback, POST `{ idToken: response.credential }` with the current API CSRF header and cookies included. Do not implement the GIS HTML direct-POST/redirect mode for this endpoint; it uses a different request/CSRF contract.
3. Prevent duplicate submissions while that callback is in progress. Treat popup dismissal as cancellation without an API call.
4. On success, keep the application access JWT in memory, replace the old CSRF token with the response value, and persist the nonsecret device ID using the frontend's existing device mechanism. Discard the Google credential after the exchange.
5. Use `isNewUser` only for signup/onboarding navigation. Read `user.isEmailVerified` to offer the existing email verification screen when necessary.
6. On an email collision, show a message directing the user to their existing account login. On provider downtime, retain other sign-in options and allow a later user-initiated attempt. Do not automatically loop or resubmit stale Google credentials.
7. Continue through existing refresh, protected requests, devices, logout, and logout-all APIs. On logout, clear in-memory auth state and CSRF state appropriately; use GIS `disableAutoSelect()` if needed to avoid immediately selecting the same Google account. Application logout does not sign the person out of Google.

For cross-origin frontend/API deployments, include credentials and use an explicitly allowed frontend origin. For deployments on different sites, existing cookie settings require `SameSite=None` and HTTPS; browser third-party-cookie restrictions may still require a same-site deployment. Verify the actual deployment topology in a browser before release.

Check the frontend host's CSP and Cross-Origin-Opener-Policy against Google's setup guidance when loading the button/popup. These are frontend document headers; do not relax API Helmet settings broadly to solve a frontend popup issue. The API does not need to add Google's domain to its browser-origin allowlist for server-side token verification.

Existing authentication does not globally require verified email. Preserve that behavior: users needing an application OTP can receive a session, and the UI should offer verification. This plan does not introduce a new access gate across all business routes.

**10. Implementation order and completion gates**

| Phase | Work | Complete when |
| --- | --- | --- |
| 1 | Add dependency/configuration and Google verifier | Missing config leaves password auth usable; valid configured tokens can be verified without storing credentials. |
| 2 | Update user model and credential guards | New Google-only documents can be saved; existing password users retain their credential behavior. |
| 3 | Add account resolution and email handling | Identity lookup, email collision policy, status checks, creation races, and conditional OTP/mail are implemented. |
| 4 | Wire route/controller and cache behavior | Google endpoint follows its contract and uses existing CSRF, device sessions, cookies, and response formatting. |
| 5 | Add frontend example and README guidance | A developer can configure a Google client and complete signup/login without reading service internals. |
| 6 | Build, review, and user-managed manual verification | TypeScript compiles, the diff matches this scope, and the checklist below is satisfied before release. |

During implementation run `npm run build` as a TypeScript compatibility check. The user handles testing; do not add or modify test files, fixtures, frameworks, or test scripts. Do not launch a backend against live provider services, send real emails, or execute the verification checklist as part of writing this plan.

**11. Manual verification checklist for the user**

These are planned checks, not results. Use a development MongoDB/Redis instance and appropriate Google test accounts.

- [ ] A new Gmail account creates one local user, returns `201`, sets refresh/CSRF cookies, and has `isEmailVerified: true` with no stored password.
- [ ] A new verified Workspace account has the same verified-email behavior.
- [ ] A verified third-party Google email creates an account requiring the application's existing email OTP; it receives the conditional verification mail when mail is enabled.
- [ ] An absent/unverified Google email is rejected before account/session creation.
- [ ] A returning Google user gets `200`, `isNewUser: false`, and the same local user ID without another welcome email.
- [ ] A Google profile without a surname or given name saves successfully and returns string name fields within model limits.
- [ ] An existing password-account email returns `ACCOUNT_LINK_REQUIRED` and remains unchanged, including when its email is unverified.
- [ ] A different Google identity with the same application email is rejected rather than linked or allowed to overwrite the identity.
- [ ] A local profile email change remains intact after Google login; its unverified flag is not reset from an unrelated Google email claim.
- [ ] Inactive/suspended Google-backed accounts cannot start sessions.
- [ ] Malformed, expired, tampered, and wrong-client tokens are rejected with the defined error response, without leaking credentials or provider errors.
- [ ] Empty/nonstring/oversized tokens, unknown request fields, and invalid or duplicate device headers fail validation.
- [ ] Missing/incorrect CSRF tokens fail before user/session writes; the pre-login CSRF token is replaced after success.
- [ ] Google-disabled configuration returns its documented availability response while password auth still works.
- [ ] Provider key-fetch/network failure reports temporary unavailability without creating users or triggering automatic retries.
- [ ] Rate limiting and `Cache-Control: no-store` apply to Google successes and failures, including limiter responses.
- [ ] Access JWTs authenticate protected requests; refresh rotation, current-device replacement, device revocation, logout, and logout-all work with Google-created sessions.
- [ ] Repeated concurrent signup requests create one user. Each successful response corresponds to a live session under existing per-device replacement rules; concurrent login on the same device can invalidate the earlier response as it does today.
- [ ] Google-only password login fails without a bcrypt exception or password-lock increments.
- [ ] Google-only change-password, forgot-password, reset-OTP verification, and reset-token redemption cannot add a password, including with stale OTP/token records.
- [ ] Existing local-user registration, password login/change/recovery, email verification, and auth-version revocation continue to work.
- [ ] Mail disabled or SMTP delivery failure does not fail Google authentication; an unverified user can use the existing resend flow after mail becomes available.
- [ ] Responses and logs contain no Google credential, refresh JWT, password hash, or internal Google identifier. Existing application access tokens appear only where the auth contract requires them.
- [ ] The frontend stores access tokens in memory, updates CSRF after login, handles popup cancellation/collisions, and does not immediately log the user back in after logout.
- [ ] Browser cookies and popup behavior work on the actual local and production frontend/API origins.

A Google ID token is a bearer credential and can remain valid until its expiry. This release does not define Google credentials as one-time tokens. Preserve TLS and application CSRF protections, and never document a replay-prevention guarantee that the implementation does not provide.

**12. Deployment, compatibility, and rollback**

No existing-user data backfill is required: password-only records lack `googleId` and remain valid. Before enabling Google signup, create and verify the unique sparse `googleId` index through the project's normal database deployment process. Check for any existing manually populated duplicates, nulls, or empty strings before building it. Do not rely on automatic index creation timing in production or run destructive index synchronization.

Deploy in this order: establish the index, release the compatible backend, configure the environment's client ID, perform staging verification, then enable the frontend button. Keep current JWT keys and Redis namespaces unchanged. App instances serving the same deployment should use the same Google client configuration.

If rolling across multiple instances, keep the new button disabled until every auth-serving instance understands Google-only documents. Old code assumes passwords and can mishandle profile saves or recovery for newly created Google users.

For a feature rollback, hide the frontend button and unset the Google client ID while retaining the compatible model and password guards. Existing Google-only accounts will be unable to create new Google sessions until re-enabled; existing application sessions continue according to current policy. Do not roll back to password-required assumptions once such documents exist, generate replacement passwords, or delete those users as rollback steps.

The feature is ready when the endpoint contract is documented, configuration and index deployment are explicit, the TypeScript build succeeds, and the user has verified the relevant checklist scenarios. Account linking and setting a first password remain separate work with their own contracts.
