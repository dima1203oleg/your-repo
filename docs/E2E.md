# E2E / Playwright (static build + real-backend)

This project supports running Playwright end-to-end tests against a production-like static build served locally while proxying `/api` requests to the real backend.

## Quick local steps (works on macOS/Linux)

1. Build frontend:

   npm run build

2. Start real backend (default port 8001):

   npm run start:real &

3. Serve `dist` and proxy `/api` to backend (default port 3003):

   npm run serve:dist &

4. Run Playwright e2e (the tests expect the static URL at http://127.0.0.1:3003):

   npm run test:e2e

## CI

There's a GitHub Actions workflow at `.github/workflows/e2e-static-real-backend.yml` which:

- Installs deps, builds frontend
- Starts `real-backend` in background
- Starts `scripts/serve-with-proxy.js` (serves `dist` & forwards `/api`)
- Waits for services to be ready and runs Playwright tests (live.spec.js)

If you change backend API contracts, update tests and/or compatibility endpoints accordingly.

### NOTE: runtime config

When injecting runtime configuration into the page (for example during e2e runs), the `NEXT_PUBLIC_API_URL` value should be the API root *without* the `/api/v1` suffix. The application code expects to append `/api/v1` at call time.

Example (correct):

```html
<script>window.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001' }</script>
```

Example (incorrect — leads to double-prefixing and 404s):

```html
<script>window.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001/api/v1' }</script>
```

## API contract changes / migration notes

- This repo switched to canonical backend endpoints and removed older backward-compatible alias routes from `real-backend/server.js`.
- Canonical endpoints now used by the frontend/tests:
   - `/api/v1/system/monitoring` — system + performance payload (used to be `/api/v1/metrics/system`)
   - `/api/v1/monitoring/logs/stream` — system logs stream (used to be `/api/v1/logs/system`)
   - `/api/v1/security/audit` — security logs (used to be `/api/v1/security/logs`)
   - `/api/v1/data/databases` — databases status (used to be `/api/v1/databases/status`)

If you maintain other integrations or automation scripts that call legacy endpoints, update them or re-add compatible routes in the backend until all clients migrate.
