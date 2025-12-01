const http = require('http');
const https = require('https');

const { parse } = require('url');

const getJSON = (url, timeout = 5000) => new Promise((resolve, reject) => {
  const parsed = parse(url);
  const lib = (parsed.protocol && parsed.protocol.startsWith('https')) ? https : http;
  const req = lib.get(url, { timeout }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        const contentType = String(res.headers['content-type'] || '');
        if (!contentType.includes('application/json')) {
          return reject(new Error('Unexpected content-type: ' + contentType));
        }
        resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
      } catch (e) {
        reject(e);
      }
    });
  });
  req.on('error', reject);
  req.on('timeout', () => { req.destroy(new Error('timeout')); });
});

/**
 * Integration test: verify the real-backend /api/v1/system/monitoring contract.
 *
 * This test assumes the real-backend is running on http://127.0.0.1:8001
 * (CI workflow starts it before running tests). The test will retry for a
 * few seconds in case the service is still starting to avoid flakes.
 */

const ROOT = process.env.TEST_API_ROOT || 'http://127.0.0.1:8001';
const ENDPOINT = `${ROOT}/api/v1/system/monitoring`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('real-backend /api/v1/system/monitoring contract', () => {
  jest.setTimeout(30000);

  test('responds with JSON and expected fields (wrapper or raw payload)', async () => {
    let res;
    const maxAttempts = 8;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        res = await getJSON(ENDPOINT, 5000);
        break;
      } catch (e) {
        if (i === maxAttempts - 1) throw e;
        // backoff and retry
        await wait(1000 * (i + 1));
      }
    }

    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);

    const body = res.data;
    // Support both wrapper { success: true, data: ... } and plain payloads
    const payload = (body && body.success === true && body.data !== undefined) ? body.data : body;

    expect(payload).toBeDefined();

    // The payload should be an object and contain either a 'performance' block
    // or commonly-named metric keys such as 'cpu', 'memory' or 'system'.
    expect(typeof payload).toBe('object');
    const hasPerf = payload.performance || payload.cpu || payload.system;
    expect(hasPerf).toBeTruthy();
  });
});
