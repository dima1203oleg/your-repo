Maintainer notes — stabilize Playwright + integration tests

Summary
-------
This change set (branch: `copilot/typical-bison`) stabilizes the Playwright live e2e test and adds integration contract tests to prevent backend regressions. There is also a candidate branch `copilot/strict-ready` prepared which turns on `TEST_STRICT_LIVE=true` in CI to enforce stricter UI checks.

Quick checklist for maintainers
-------------------------------
1. Validate locally (optional) using `outgoing/run-local-ci.sh` — this runs the build, starts real-backend + proxy, runs Jest integration tests and a Playwright smoke test (Firefox).

2. Run manual strict check in Actions:
   - In GitHub Actions UI, run the workflow `Verify STRICT Live mode (manual)` (choose `browser=firefox` or `chromium`) and inspect artifacts.

3. If successful, push the strict-ready branch to origin and create a PR titled `ci: enable TEST_STRICT_LIVE=true (candidate)`.

4. Verify CI runs (integration tests first, then Playwright). If all stable across 3–4 runs then merge the strict-ready PR into `master`.

Notes about cross-browser flakiness
---------------------------------
- Local Chromium launches may fail in some environments (error: "Target page, context or browser has been closed"). This often indicates missing or broken local Chromium dependencies — CI runners typically have a stable browser environment; verify with the manual workflow.
- If CI shows browser-specific failures, check Playwright reports (screenshots, HTML), and I can add targeted fixes or retries for problematic scenarios.

Files in `outgoing/`
--------------------
- copilot_typical_bison_changes.patch / .bundle — main change set with Playwright improvements + integration tests
- copilot_strict_ready_changes.patch / .bundle — candidate strict-ready change-set for enabling TEST_STRICT_LIVE=true in CI
- run-local-ci.sh — local helper for build + backend + tests
- PR_BODY.md — PR body template
- PR_REVIEW_CHECKLIST.md — review checklist
- README.md — how to apply patch/bundle and local verification

If you'd like me to open the PR(s) once you grant push access, I can do it and then monitor CI for failures and triage them quickly.
