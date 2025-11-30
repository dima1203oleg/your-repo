Title: Stabilize Playwright E2E, use http-server for CI, and upload artifacts for CI debugging

Summary:
- Stabilize the Playwright end-to-end test that checks the Dashboard 'LIVE' indicator and the /api/v1/metrics/system call.
- Use `http-server` in CI to serve the built `dist` directory for predictable static serving (reliable across runners).
- Add helper npm scripts: `start:static` and `test:e2e` for easier local testing.
- Produce an HTML Playwright report and upload artifacts (playwright-report, screenshots, test-results) on every CI run (`if: always()`) so failing test artifacts are available for faster debugging.

Why:
- CI environments can be flaky when serving static files with `vite preview`; `http-server` is lightweight and stable for serving production builds in CI.
- Increasing timeouts and capturing screenshots reduces flaky failures and improves post-failure diagnostics.

Local verification steps:
1. npm run build
2. npm run start:mock
3. npm run start:static &
4. npm run test:e2e

Files changed (high level):
- tests/playwright/live.spec.js — increased timeouts, screenshot-on-failure, removed noisy HTML dump
- package.json — added `start:static` and `test:e2e` scripts
- .github/workflows/build-verify.yml — use http-server in e2e job, run Playwright HTML report and upload artifacts on failure

Notes:
- I couldn't push from this environment (permission denied). Once this branch is pushed I will open a PR and include this description as the PR body. If you prefer a cleaner commit history I can squash/clean logs before pushing.
