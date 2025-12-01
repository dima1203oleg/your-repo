const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // add init script to set runtime config and sessionStorage
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('predator_auth', 'true');
      sessionStorage.setItem('predator_auth_token', 'test-token');
      // Keep the runtime API root (do NOT include /api/v1 here) — code
      // appends the /api/v1 path segments itself.
      globalThis.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001' };
    } catch (e) {
      // ignore
    }
  });

  page.on('request', req => console.log('PAGE_REQ', req.method(), req.url()));
  page.on('response', res => console.log('PAGE_RES', res.status(), res.url()));
  page.on('console', msg => console.log('PAGE_CONSOLE', msg.text()));

  const url = process.env.TEST_BASE_URL || 'http://127.0.0.1:3003';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('goto failed', e && e.message));

  const rt = await page.evaluate(() => {
    return {
      appConfig: globalThis.__APP_CONFIG__ || null,
      predator_auth: (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('predator_auth') : null,
      predator_auth_token: (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('predator_auth_token') : null
    };
  });
  console.log('PAGE_RUNTIME>', rt);

  // wait a bit to capture any network traffic
  await new Promise(r => setTimeout(r, 5000));

  await browser.close();
})();
