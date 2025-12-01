import { test, expect } from '@playwright/test';

const candidateUrls = process.env.TEST_BASE_URL ? [process.env.TEST_BASE_URL] : [
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
];

test.setTimeout(120000);

test('Infra view: start E2E runner via UI and observe streaming logs', async ({ page }) => {
  // Setup auth + runtime API root for the built app so the UI will talk to local real-backend
  // Attach console hooks early so we capture runtime errors during navigation
  page.on('console', m => console.log('PAGE_CONSOLE>', m.text()));
  page.on('pageerror', e => console.log('PAGE_ERROR>', e && e.message ? e.message : e));
  page.on('requestfailed', r => console.log('REQ_FAILED', r.url(), r.failure()?.errorText));

  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('predator_auth', 'true');
      sessionStorage.setItem('predator_auth_token', 'test-token');
      // Point API to same origin so requests go through the static server's /api proxy.
      // This avoids cross-origin calls to port 8001 which may be blocked by CORS.
      globalThis.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: (typeof location !== 'undefined' ? (location.origin + '/api/v1') : 'http://127.0.0.1:3003/api/v1') };
    } catch (e) { /* ignore in environments without sessionStorage */ }
  });

  let openedUrl = process.env.TEST_BASE_URL || null;

  // If TEST_BASE_URL wasn't provided, fall back to probing candidates
  if (!openedUrl) {
    for (const u of candidateUrls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      if (!res.ok) continue;
      const txt = await res.text();
      if (!txt.includes('assets/') || txt.includes('index.tsx')) continue;
      openedUrl = u;
      // Navigate directly to the Infra view using the URL query param
      // Attach console / error hooks for debugging
      page.on('console', m => console.log('PAGE_CONSOLE>', m.text()));
      page.on('pageerror', e => console.log('PAGE_ERROR>', e && e.message ? e.message : e));
      page.on('requestfailed', r => console.log('REQ_FAILED', r.url(), r.failure()?.errorText));

      await page.goto(u + '?tab=infra', { waitUntil: 'load', timeout: 30000 });
      // ensure background requests finished and capture debug snapshot
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      const snippet = await page.evaluate(() => document.body.innerText.slice(0, 2000)).catch(() => null);
      console.log('PAGE_RENDER_SNIPPET>\n', snippet);
      await page.screenshot({ path: 'tests/playwright/debug_infra_view.png', fullPage: true }).catch(() => {});
      break;
      } catch (e) {
        // try next candidate
      }
    }
  }

  // If TEST_BASE_URL was provided directly we still need to navigate the page
  // — the previous code only navigated when probing candidates which left the
  // page at about:blank and caused timeouts when TEST_BASE_URL was used.
  if (openedUrl && page.url() === 'about:blank') {
    await page.goto(openedUrl + '?tab=infra', { waitUntil: 'load', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // capture a short debug snapshot/screenshot to assist debugging failures
    const snippet2 = await page.evaluate(() => document.body.innerText.slice(0, 2000)).catch(() => null);
    console.log('PAGE_RENDER_SNIPPET_AUTO>', snippet2);
    await page.screenshot({ path: 'tests/playwright/debug_infra_view_auto.png', fullPage: true }).catch(() => {});
  }

  expect(openedUrl).toBeTruthy();

  // Debug: print a short snippet of the page visible text so we can diagnose problems
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 10000));
  console.log('PAGE_SNIPPET>\n', bodyText);

  // Ensure the Infra view has loaded and the E2E Test Suite card is visible
  // InfraView mounts with Cluster by default — switch to the E2E Testing sub-tab
  await page.click('text=E2E Testing');
  await page.waitForSelector('text=E2E Test Suite', { timeout: 30000 });

  // Click the Run Tests button (this triggers the backend /infra/tests/run endpoint)
  await page.click('text=Run Tests');

  // Button should transition to Running... or show an animated spinner
  await page.waitForSelector('text=Running...', { timeout: 15000 });

  // Now wait for logs to appear in the Console Output area — look for [RUNNER]
  await page.waitForSelector('text=[RUNNER]', { timeout: 20000 });

  // Also check that a job inspector appears (Job: <id>) after runner starts
  await page.waitForSelector('text=Job:', { timeout: 15000 });
  const jobLabelVisible = await page.locator('text=Job:').nth(0).isVisible();
  expect(jobLabelVisible).toBeTruthy();
});
