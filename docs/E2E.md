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
