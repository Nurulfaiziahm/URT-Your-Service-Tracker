# Express / TypeScript backend template

This project is a reusable Express.js backend template built with TypeScript, MongoDB, Redis, and an
optional browser authentication flow.

## Requirements

- Node.js 20 or later (required by the R2 SDK)
- MongoDB
- Redis
- `openssl` (to generate local signing secrets)

## Getting started

Install dependencies and create the local environment file:

```sh
npm install
cp .env.example .env
```

The example file contains safe local defaults for MongoDB and Redis. Before starting the API,
replace the three signing-key placeholders with different secrets:

```sh
openssl rand -hex 32
```

Use one generated value each for `ACCESS_KEYS`, `REFRESH_KEYS`, and `SESSION_KEYS`. Do not commit
`.env` or reuse a secret between key rings.

Start the development server:

```sh
npm run dev
```

The API listens on port `5000` by default. Change `PORT`, `MONGO_URI`, `REDIS_URI`, and
`ALLOWED_ORIGINS` in `.env` when your local services or frontend use different addresses.

## Environment configuration

The application validates its environment variables at startup.

| Variable               | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `PORT`                 | API port; defaults to `5000`                                 |
| `NODE_ENV`             | `development`, `test`, or `production`                       |
| `MONGO_URI`            | MongoDB connection string                                    |
| `REDIS_URI`            | Redis connection string                                      |
| `ALLOWED_ORIGINS`      | Comma-separated, explicit frontend origins                   |
| `GOOGLE_CLIENT_ID`     | Optional Google OAuth web client ID; blank disables Google auth |
| `R2_ACCOUNT_ID`        | Cloudflare account ID; configure all four R2 values together |
| `R2_ACCESS_KEY_ID`     | Bucket-scoped R2 S3 access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 S3 secret access key; server only |
| `R2_BUCKET_NAME`       | Private R2 bucket name |
| `TRUST_PROXY`          | `false` for direct connections or trusted proxy addresses    |
| `COOKIE_SAME_SITE`     | Cookie policy: `lax`, `strict`, or `none`                    |
| `COOKIE_SECURE`        | Set to `true` when cookies must use HTTPS                    |
| `ACCESS_KEYS`          | JSON key ring for access tokens                              |
| `REFRESH_KEYS`         | JSON key ring for refresh tokens                             |
| `SESSION_KEYS`         | JSON key ring for CSRF/session tokens                        |
| `JWT_SIGNING_VERSION`  | Active signing-version ID                                    |
| `JWT_SIGNING_VERSIONS` | JSON list of signing versions and their issuer/audience      |
| `MAIL_ENABLED`         | Set to `true` to enable verification and password-reset mail |
| `SMTP_*`               | SMTP host, port, credentials, sender, and TLS settings       |

Each key-ring entry has an `id`, a unique `secret`, and an `activatedAt` Unix timestamp. Retained
keys may also specify `lastIssuedAt` and `acceptUntil` for rotation.

For production, use HTTPS, set `COOKIE_SECURE=true`, configure HTTPS origins, and provide secrets
through your deployment secret manager rather than a committed file.

## Authentication flow

Access JWTs stay in browser memory. Rotating refresh JWTs use HttpOnly cookies, while Redis stores
the authoritative session for each user/device and independent CSRF sessions.

- `GET /api/v1/auth/csrf-token` bootstraps CSRF before a write request.
- Login and registration return `data.user`, `accessToken`, `deviceId`, and `csrfToken`.
- Refresh returns a new `accessToken` and `deviceId`.
- Unsafe `/api/v1` routes require a CSRF token, including login, password flows, and uploads.
- Protected requests require an `Authorization: Bearer <access-token>` header.
- Logout uses the refresh cookie and continues to work after the access token expires.

## Google signup and login

Google signup uses the same application sessions, refresh cookies, CSRF protection, and device
tracking as password login. Configure a Google **Web application** OAuth client and its branding
and audience. Add your frontend's origins to its authorized JavaScript origins (including your
local development origin). Set `GOOGLE_CLIENT_ID` in the API environment and use that same public
client ID in the frontend. A blank value keeps Google authentication disabled while password
authentication remains available. This popup/callback flow needs no Google client secret or backend
redirect URI. See [Google's setup guide](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

Use the Google Identity Services sign-in button with a JavaScript callback. Bootstrap
`GET /api/v1/auth/csrf-token` with `credentials: 'include'`, then submit the callback's
`response.credential` to the API:

```http
POST /api/v1/auth/google
Content-Type: application/json
X-CSRF-Token: <current API csrf token>
X-Device-Id: <optional stable device id>

{ "idToken": "<Google credential>" }
```

Include cookies with the POST. `idToken` must be a nonempty string of at most 16,384 characters;
additional body fields are rejected. The API verifies Google's signature, issuer, audience, expiry,
subject, and verified email. It identifies returning users by Google's `sub`, stored internally as
`googleId`. See [Google's verification guide](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

A new account returns `201`; a returning account returns `200`. Both use this envelope:

```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": "<user id>",
      "firstName": "Amina",
      "lastName": "",
      "email": "amina@gmail.com",
      "role": "user",
      "status": "active",
      "isEmailVerified": true,
      "createdAt": "<ISO timestamp>"
    },
    "accessToken": "<application access JWT>",
    "deviceId": "<device id>",
    "csrfToken": "<replacement API csrf token>",
    "isNewUser": true
  }
}
```

The refresh token stays in the existing HttpOnly cookie. Replace the frontend's CSRF token after
success; keep the access JWT in memory and persist only the nonsecret device ID. Discard the Google
credential after exchange. Auth responses, including upstream middleware errors, use
`Cache-Control: no-store`.

New Google accounts have no password. Password login fails normally, change-password returns
`400 PASSWORD_NOT_SET`, and password recovery cannot create a first password. Forgot-password
still returns a neutral success response without sending reset mail for these accounts. Adding a
password and linking/unlinking providers are separate features.

An email already belonging to a different local identity returns `409 ACCOUNT_LINK_REQUIRED`;
the frontend should offer the person's existing sign-in method. The API never automatically links
accounts by email, changes an existing account's role/status, or overwrites its profile/email during
Google login. Inactive and suspended accounts remain blocked. Password-specific failed-attempt
locks are neither consulted nor reset by a matching Google identity login.

New Gmail and verified Google Workspace addresses are marked email-verified. Other verified Google
account emails receive the existing application email OTP flow. New users get best-effort welcome
mail; verification mail is sent only when needed. Unverified application email does not currently
block application sessions. `MAIL_ENABLED=false` suppresses delivery; use resend-verification after
mail is configured. Returning users retain their application email verification state, including
after a profile email change.

Errors retain `{ "success": false, "error": "...", "code": "..." }`:

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` / `INVALID_DEVICE_ID` | Invalid body or device header; validation errors include field details. |
| `401` | `GOOGLE_TOKEN_INVALID` | Invalid, expired, wrong-client, or incomplete Google credential. |
| `403` | `GOOGLE_EMAIL_UNVERIFIED` / `ACCOUNT_DISABLED` | Google email is unverified or the local account is disabled. |
| `403` | `CSRF_MISSING` / `CSRF_INVALID` | Bootstrap a current API CSRF token before a fresh sign-in attempt. |
| `409` | `ACCOUNT_LINK_REQUIRED` | Continue with the existing account's sign-in method. |
| `429` | `RATE_LIMITED` | Existing API/auth/login limits apply. |
| `503` | `GOOGLE_AUTH_DISABLED` | Configure the web client ID to enable Google auth. |
| `503` | `GOOGLE_AUTH_UNAVAILABLE` / `AUTH_UNAVAILABLE` | Provider key retrieval or application auth storage is unavailable. |

Do not automatically loop or replay old Google credentials after failures. The browser example in
[examples/browser-auth.js](examples/browser-auth.js) provides Google button mounting, explicit
refresh, authenticated requests, and logout. Copy it into your frontend, replace its two configuration
constants, and load `https://accounts.google.com/gsi/client` before calling `mountGoogleButton()`:

```js
import { mountGoogleButton } from './browser-auth.js';

await mountGoogleButton(document.getElementById('google-button'), {
  onSignedIn(data) {
    // Navigate using data.isNewUser and data.user.isEmailVerified.
  },
  onError(error) {
    document.getElementById('auth-error').textContent = error.message;
  },
});
```

Host the example in the frontend; the API does not serve the examples directory. Check the frontend
document's CSP and popup/COOP settings against Google's setup guidance. Credentialed requests need
an explicitly allowed frontend origin. Deployments on different sites require HTTPS and
`COOKIE_SAME_SITE=none`, and remain subject to browser third-party-cookie restrictions; prefer a
same-site frontend/API deployment. Do not add Google's domain to `ALLOWED_ORIGINS` for server-side
verification.

Before enabling signup in production, create and verify the unique sparse Google identity index
using your normal database deployment process. In `mongosh`, select the application's database,
check existing `googleId` values for duplicates/nulls/empty strings, then run:

```js
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true });
```

Existing password users need no backfill. Update all auth-serving instances before enabling the
frontend button. To disable the feature, hide the button and unset `GOOGLE_CLIENT_ID`, retaining
the compatible model and password guards for already-created Google users. Existing application
sessions follow their normal lifetime. The implementation plan and user-managed verification
checklist are in [docs/google-signup-implementation-plan.md](docs/google-signup-implementation-plan.md).

## Image and file uploads (Cloudflare R2)

Set all four `R2_*` values in `.env` using an object read/write credential scoped to a private
bucket. Leaving all four blank disables storage operations with `503 STORAGE_UNAVAILABLE`;
partial configuration fails startup. The server uses R2's S3 API with `region: auto`, following
[Cloudflare's SDK setup](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/).

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `POST` | `/api/v1/uploads` | Upload one image or PDF in the multipart field `file` |
| `GET` | `/api/v1/uploads/:key` | Owner/admin metadata lookup with a fresh download URL |
| `DELETE` | `/api/v1/uploads/:key` | Owner/admin deletion; attached product images return `409` |

All three routes require a bearer access token. Upload and delete also require the current
`X-CSRF-Token` and CSRF session cookie. Uploads accept JPEG, PNG, WebP and GIF up to 5 MiB, or
PDF up to 10 MiB. Send one file per request and no text fields. Let the browser set the multipart
Content-Type boundary. MIME filtering checks the declared type, not file content or malware.

```js
const body = new FormData();
body.append('file', selectedFile);
const response = await fetch(`${apiUrl}/api/v1/uploads`, {
  method: 'POST',
  credentials: 'include',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'X-CSRF-Token': csrfToken,
  },
  body,
});
const result = await response.json();
if (!response.ok) throw new Error(result.error);
// result.data: { key, originalName, mimeType, size, category, url, urlExpiresAt, uploadedAt }
```

The API buffers the file in memory and writes directly to R2; it creates no local file.
Allow multipart overhead above 10 MiB in proxy body limits and budget up to 10 MiB per
in-flight upload. Multiple file selections use repeated requests with bounded concurrency.

Store `key`, not the returned URL. GET URLs expire after 15 minutes; refresh them through the
metadata endpoint. Signed URLs act as temporary bearer links. The bucket stays private; the
browser needs no R2 upload CORS rules because uploads pass through the API. Configure read CORS
if JavaScript fetches downloads; see [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).

Product image writes now use `images: [{ publicId: "img_<16 hex characters>", alt: "..." }]`
(up to 10 unique images uploaded by the acting admin). Responses add `url` and `urlExpiresAt`
for attached images. Detach images before deleting their uploads. Product and upload responses
use `Cache-Control: no-store` so signed URLs are refreshed with their metadata.

Image reservations prevent a concurrent upload deletion from removing an image being attached.
If a process stops between a product write and releasing reservations, deletion remains blocked
conservatively; run the offline migration/reconciliation command below to rebuild counts.
Failed R2 deletions keep their metadata marked for deletion; retry DELETE to finish them.

### Existing local uploads

The old `/api/v1/files` routes and `/public` file serving have been removed. Before deploying
over existing data, back up MongoDB and `public/uploads`, stop all API writers, configure R2,
and run from the API project directory:

```sh
npm run build
node dist/scripts/migrate-uploads.js
```

The command uploads legacy disk files, checks R2 size/type metadata, preserves stable keys,
updates matching product references and rebuilds image reference counts. It keeps local files
intact. Missing/invalid files and unresolved product images are reported with a nonzero exit
status; resolve them and rerun before starting the new API. Records awaiting migration return
`409 UPLOAD_MIGRATION_REQUIRED`. Do not run this command while API writes are active. Keep
backups until the cutover is accepted; rollback must also handle R2-only uploads.

The detailed contract is in [docs/cloudflare-r2-implementation-plan.md](docs/cloudflare-r2-implementation-plan.md).

## Project layout

```text
src/core/config/          Validated environment, cookies, CORS, and CSRF sessions
src/core/security/        CSRF protection and rate limiting
src/common/middleware/    Shared session guard, validation, and error handling
src/modules/auth/         Authentication controllers, services, and token handling
src/lib/redis/            Auth sessions, account security, cache, and OTP stores
src/lib/device/           Client device labels and display metadata
src/lib/storage/          Cloudflare R2 client and signed download URLs
src/modules/{user,product,upload}/
```

## Commands

```sh
npm run build        # Compile TypeScript to dist/
npm start            # Start the compiled API
npm run dev          # Start the development
```
