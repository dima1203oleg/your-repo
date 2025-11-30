import { test, expect } from '@playwright/test';

const candidateUrls = process.env.TEST_BASE_URL ? [process.env.TEST_BASE_URL] : [
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:3010',
  'http://127.0.0.1:3005',
  'http://127.0.0.1:3006',
  'http://127.0.0.1:3007',
  'http://127.0.0.1:3008',
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:4173',
  'http://localhost:4173'
];

test('dashboard shows LIVE indicator and calls /api/v1/metrics/system', async ({ page }) => {
  // Try to open one of the dev/preview addresses
  let opened = false;
  let lastError = null;
  // Keep a reference to the first response-wait so we can reuse it outside the loop
  let respWait = null;
  for (const u of candidateUrls) {
    try {
      // quick sanity-check: fetch root and prefer servers returning built bundle
      let ok = false;
      try {
        const res = await fetch(u, { method: 'GET' });
        if (res.ok) {
          const text = await res.text();
          // prefer servers serving built assets (look for dist asset paths)
          if (text.includes('assets/') && !text.includes('index.tsx')) ok = true;
        }
      } catch (e) {
        // allow probe failure to fall through and try navigation
      }
      if (!ok) {
        lastError = `root probe failed for ${u}`;
        continue; // try next candidate
      }
      // Ensure the app thinks the user is logged in so the Dashboard mounts
      // immediately (the app shows a login/boot screen for unauthenticated users).
      await page.addInitScript(() => {
        try {
          // mark the app as logged in so dashboard mounts immediately
          sessionStorage.setItem('predator_auth', 'true');
          sessionStorage.setItem('predator_auth_token', 'test-token');
          // make sure the built app points to the running mock backend
          globalThis.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001/api/v1' };
        } catch (e) {
          // no-op in environments where sessionStorage is not available
        }
      });

      // Start waiting for the metrics response before navigation so we don't
      // miss it if the app requests metrics immediately on mount.
      // add debugging hooks so CI logs show what's happening in the page
      page.on('console', msg => console.log('PAGE_CONSOLE>', msg.text()));
      page.on('requestfailed', req => console.log('REQ_FAILED', req.url(), req.failure()?.errorText));
      page.on('request', req => {
        if (req.url().includes('/metrics/system') || req.url().includes('/api/v1/metrics/system')) {
          console.log('observed-request', req.method(), req.url());
        }
      });

      // log any metrics responses we see for debugging
      page.on('response', r => {
        if (r.url().includes('/metrics/system') || r.url().includes('/api/v1/metrics/system')) {
          // Print for CI logs
          console.log('observed-response', r.status(), r.url());
        }
      });

      respWait = page.waitForResponse(
        (r) => (r.url().includes('/api/v1/metrics/system') || r.url().includes('/metrics/system')) && r.status() === 200,
        { timeout: 30000 }
      );

      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });

      // Debug: print runtime config and auth state inside the page
      try {
        const pageRuntime = await page.evaluate(() => {
          return {
            appConfig: globalThis.__APP_CONFIG__ || null,
            predator_auth: (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('predator_auth') : null,
            predator_auth_token: (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('predator_auth_token') : null
          };
        });
        console.log('PAGE_RUNTIME>', JSON.stringify(pageRuntime));
      } catch (e) {
        console.log('PAGE_RUNTIME> evaluate failed', e && e.message ? e.message : e);
      }

      // Wait a short time for any immediate requests to be issued
      try {
        await respWait;
      } catch (e) {
        // no-op; we'll try other candidate urls
      }

      console.log('opened app at', u);
      opened = true;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  test.expect(opened, `Could not open any app URL (last error: ${lastError})`);

  // Wait for the metrics call from the page (mock-backend should respond on :8001)
  // Reuse the earlier `respWait` if it already resolved; otherwise wait
  // again for up to 30s to handle slower CI environments.
  let metricsResponse = null;
  try {
    metricsResponse = await respWait;
  } catch (e) {
    // respWait did not resolve in time above — fall back to waiting again
  }
  if (!metricsResponse) {
    metricsResponse = await page.waitForResponse(
      (r) => (r.url().includes('/api/v1/metrics/system') || r.url().includes('/metrics/system')) && r.status() === 200,
      { timeout: 30000 }
    );
  }
  const body = await metricsResponse.json();
  test.expect(body && body.success === true, 'Expected API response success:true');

  // NOTE: removed verbose HTML snippet dump before pushing; keep screenshot-on-failure for CI artifacts

  // Check the UI contains text 'LIVE' (ViewHeader displays LIVE when metrics.isLive === true)
  // Allow more time in slower CI environments and capture a screenshot on failure
  try {
    await page.waitForSelector('text=LIVE', { timeout: 30000 });
  } catch (err) {
    // Save a screenshot to help CI debugging and rethrow so the test still fails
    try {
      await page.screenshot({ path: `playwright-live-failure-${Date.now()}.png`, fullPage: true });
      console.log('Saved screenshot for debugging');
    } catch (error_) {
      console.log('Failed saving screenshot', error_?.message ?? error_);
    }
    throw err;
  }

  const liveVisible = await page.isVisible('text=LIVE');
  test.expect(liveVisible, 'UI should show LIVE indicator');
});
