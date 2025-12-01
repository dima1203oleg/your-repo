const { getJSON } = require('./_http');

const ROOT = process.env.TEST_API_ROOT || 'http://127.0.0.1:8001';
const ENDPOINT = `${ROOT}/api/v1/data/databases`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('real-backend /api/v1/data/databases contract', () => {
  jest.setTimeout(30000);

  test('responds with an array of database status objects or wrapper', async () => {
    let res;
    const maxAttempts = 6;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        res = await getJSON(ENDPOINT, 5000);
        break;
      } catch (e) {
        if (i === maxAttempts - 1) throw e;
        await wait(1000 * (i + 1));
      }
    }

    expect(res).toBeDefined();
    expect(res.status).toBe(200);

    const body = res.data;
    const payload = (body && body.success === true && body.data !== undefined) ? body.data : body;

    expect(payload).toBeDefined();
    expect(Array.isArray(payload)).toBeTruthy();
    // quick sanity: ensure first item has id or name
    expect(payload.length).toBeGreaterThanOrEqual(0);
    if (payload.length > 0) {
      expect(payload[0].id || payload[0].name).toBeDefined();
    }
  });
});
