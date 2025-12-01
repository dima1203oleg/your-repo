import { firefox } from 'playwright';

(async () => {
  const browser = await firefox.launch();
  const page = await browser.newPage();

  page.on('console', m => console.log('PAGE_CONSOLE>', m.text()));
  page.on('pageerror', e => console.log('PAGE_ERROR>', e.message));
  page.on('requestfailed', r => console.log('REQ_FAILED>', r.url(), r.failure() && r.failure().errorText));

  // Set auth + runtime config before page scripts
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('predator_auth', 'true');
      sessionStorage.setItem('predator_auth_token', 'test-token');
      // Point API to the same origin so built app will call /api via the static server (proxy)
      globalThis.__APP_CONFIG__ = { NEXT_PUBLIC_API_URL: (typeof location !== 'undefined' ? (location.origin + '/api/v1') : 'http://127.0.0.1:3003/api/v1') };
    } catch (e) {}
  });

  await page.goto('http://127.0.0.1:3003/?tab=infra', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('DOMContentLoaded');

  const scripts = await page.$$eval('script', s => s.map(x => ({ src: x.src, type: x.type, inner: (x.innerHTML||'').slice(0,200) })));
  console.log('SCRIPTS:', scripts);

  const rootText = await page.evaluate(() => document.body.innerText.slice(0,2000));
  console.log('BODY TEXT:', JSON.stringify(rootText));

  try {
    const fetchMain = await page.evaluate(async () => {
      const r = await fetch('/assets/index-CFttdOsA.js');
      const text = await r.text();
      return { ok: r.ok, status: r.status, len: text.length };
    });
    console.log('FETCH main module:', fetchMain);
  } catch (e) {
    console.log('FETCH ERROR', e.message);
  }

  await page.screenshot({ path: 'tests/playwright/debug_infra_manual.png', fullPage: true }).catch(e => console.log('screenshot-error', e && e.message));
  console.log('screenshot attempt finished');

  await browser.close();
})();
