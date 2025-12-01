# 06 · Integration Runbook — Self‑hosted Runner, Playwright & Chromium Diagnostics

This runbook helps maintainers set up, debug and keep stable the AI request runner + Playwright E2E across local Mac self-hosted runners and CI (Ubuntu). It focuses on Playwright Chromium stabilization, self-hosted Mac runner config and required diagnostic steps.

## Goals
- Reliable Playwright runs for both Firefox and Chromium in CI
- Playwright artifacts are always uploaded for debugging (HTML report, screenshots, logs)
- Clear, reproducible steps to set up self-hosted Mac runner (mac‑M3) to execute `.ai/requests`
- Diagnostic checklist to resolve Chromium launch issues locally

---

## A. Self‑hosted Mac runner (recommended labels: `self-hosted, mac-m3, pa-dev`)

1. Provision the runner machine (macOS 13+ recommended).
2. Install common tools:
   - Homebrew
   - git, node 20+, npm
   - Python 3.11+, pip
   - Docker, k3d or minikube
   - kubectl, helm, yq, jq
   - Playwright browsers: `npm ci && npx playwright install --with-deps`

3. Required system packages for Playwright on mac:
   - Xcode command line tools (xcode-select --install)
   - Ensure /tmp has execute permissions and large enough space

4. Runner labels
   - Use runner labels: `mac-m3`, `pa-dev` so workflows can target it.

5. Security
   - Tighten runner tokens, limit scopes (repo, workflows), rotate tokens regularly.

---

## B. Playwright & Chromium troubleshooting (local & CI)

### Symptoms
- `Error: browserType.launch: Target page, context or browser has been closed` immediately after launch (common on mac local and some containerized setups)

### Quick diagnostics (local)
1. Run `npx playwright install --with-deps` to ensure all binary deps installed.
2. Run a sanity test in headed mode:

```bash
PWDEBUG=1 npx playwright test tests/playwright/live.spec.js --project=chromium -g "some test name"
```

3. Check system logs (Console.app on macOS) and Chromium logs (if Playwright writes logs) for crash reports.
4. Try launching Chromium standalone (from Playwright's cache path) to confirm no system-level crash.

### CI-specific checks (ubuntu-latest)
- Use `npx playwright install --with-deps` (already present in workflows) — ensures required packages are available on CI images.
- Use matrix for browsers (firefox, chromium) and capture artifacts on failure.
- On failure, download uploaded `real-backend.log`, `playwright-report`, and `serve-proxy.log` for analysis.

### Workarounds
- If Chromium consistently fails on local mac M3, use Firefox locally and rely on CI for Chromium verification.
- Add retries in Playwright CLI (e.g., `--retries=1`) for flaky runs and increase timeouts where appropriate.

---

## C. How CI interacts with `.ai/requests` / `.ai/reports`
- `ci-ai-request-runner.yml` runs on self-hosted mac runner and executes commands in `.ai/requests/*.yaml`.
- The runner writes `.ai/reports/<id>-result.yaml` with per-step status, exit codes, last log snippet and artifacts.
- `ci-ai-feedback.yml` posts the compiled results to the AI Studio webhook and uploads artifacts to the PR/job.

### Best practices
- .ai/requests should limit long-running tasks, or include checks for background jobs (i.e., `sleep` + health-check loops).
- Always collect Playwright HTML reports and zipped artifacts for failed runs.
- On Mac runner, ensure `make k8s-dev-up` script sets stable nodeports and predictable hostnames used by Playwright tests.

---

## D. Additions you should make if CI shows repeated Chromium failures
1. Add a small diagnostic step before Playwright: capture `ps aux` and `dmesg` output (CI) or `Console` logs (mac).
2. Increase Playwright timeouts (test-level) when connecting to dev-local preview servers to avoid race conditions.
3. Use `storybook`/mock-run for highly resource‑dependent tests; move heavy GPU tests to `lab-gpu`.

---

## E. Useful commands
- Local run (dev cluster + preview + Playwright Firefox):

```bash
npm run build
node real-backend/server.js &
node scripts/serve-with-proxy.js &
TEST_BASE_URL=http://127.0.0.1:3003 npx playwright test tests/playwright/live.spec.js --browser=firefox --reporter=list
```

- Check Playwright version and browser installation:

```bash
npx playwright --version
npx playwright install --with-deps
```

---

## F. Next operational steps (for maintainers)
- Ensure self-hosted Mac runner has `npx playwright install --with-deps` in setup script.
- Add runbook link into `COPILOT_INSTRUCTIONS.md` and `docs/devops/01_overview.md`.
- If Chromium fails repeatedly, rely on CI for Chromium check; add an automated triage flow to annotate PRs with failure artifacts.

---

This runbook is intended to be referenced by maintainers, CI owners and AI agents generating `.ai/requests` so that tests and integrations are stable and debuggable. If you want, I can now add a snippet to `.github/workflows/e2e-static-real-backend.yml` to gather diagnostics when Chromium fails — shall I add that next?