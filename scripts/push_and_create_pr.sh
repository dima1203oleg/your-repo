#!/usr/bin/env bash
set -euo pipefail

# Push current branch to remote then create a PR via gh CLI using prepared body file
# Usage: ./scripts/push_and_create_pr.sh [remote]

REMOTE=${1:-origin}
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Pushing branch $BRANCH to remote $REMOTE..."
git push -u "$REMOTE" "$BRANCH"

if command -v gh >/dev/null 2>&1; then
  echo "Creating PR using gh ..."
  gh pr create --title "Stabilize Playwright E2E, use http-server for CI, and upload artifacts" --body-file .github/PR_DESCRIPTIONS/e2e-http-server-playwright.md --base master
else
  echo "gh CLI not found. Push succeeded. Create a PR via GitHub UI or install gh CLI and run this script again to create the PR automatically."
fi
