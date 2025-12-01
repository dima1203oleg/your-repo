#!/usr/bin/env bash
set -euo pipefail

# Quick local validation helper for maintainers.
# - builds production bundle
# - starts the real backend and static server+proxy
# - runs unit+integration tests, then Playwright live spec (Firefox)

echo "⏳ Building production bundle..."
npm run build

# Start real backend
echo "▶ Starting real-backend (background) ..."
node real-backend/server.js > /tmp/real-backend.log 2>&1 &
PID_REAL=$!

# Start static server + proxy
echo "▶ Starting static server + proxy (background) ..."
node scripts/serve-with-proxy.js > /tmp/static-proxy.log 2>&1 &
PID_PROXY=$!

# Allow services to warm up
sleep 2

echo "✅ Running unit + integration tests"
npm test

# Run Playwright e2e for local check (firefox)
# Use TEST_BASE_URL to specify local proxy
TEST_BASE_URL=http://127.0.0.1:3003 npx playwright test tests/playwright/live.spec.js --browser=firefox --reporter=list

EXIT_CODE=$?

# Clean up
kill ${PID_PROXY} || true
kill ${PID_REAL} || true

exit ${EXIT_CODE}
