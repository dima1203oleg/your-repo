const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log('PAGE_CONSOLE>', msg.type(), msg.text());
    const loc = msg.location();
    if (loc) console.log('  at', loc.url, loc.lineNumber, loc.columnNumber);
  });

  page.on('pageerror', err => {
    console.log('PAGE_ERROR>', err.stack || err.message);
  });

  // Inject runtime config like the e2e tests do
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('predator_auth', 'true');
      sessionStorage.setItem('predator_auth_token', 'test-token');
      globalThis.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8001/api/v1' };
    } catch (e) {}
  });

  const url = process.env.TEST_BASE_URL || 'http://127.0.0.1:3003/';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait a little to let console errors show
  await page.waitForTimeout(5000);

  // Try to capture element existence for LIVE indicator
  try {
    const live = await page.locator('text=LIVE').first().isVisible({ timeout: 5000 });
    console.log('LIVE visible?', live);
  } catch (e) {
    console.log('LIVE check failed:', e.message);
  }

  await browser.close();
})();
