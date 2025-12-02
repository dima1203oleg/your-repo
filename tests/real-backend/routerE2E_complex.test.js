/**
 * @jest-environment node
 */

const express = require('express');
// Make sure we use real axios for E2E HTTP interactions (do this before requiring providers)
jest.unmock('axios');
const { disableProvider } = require('../helpers/providerLifecycle');
const ProviderRouter = require('../../real-backend/lib/ai_router');
const CodestralProvider = require('../../real-backend/lib/providers/codestral');

// helper to call provider with safeCallWithRetry (which may rotate keys on rate limit)
async function tryWithRetry(instance, prompt) {
  return instance.safeCallWithRetry(prompt, { retries: 3, backoffBase: 10 });
}

describe('Router e2e — complex scenarios', () => {
  let server;
  let port;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // p-timeout: will destroy socket to simulate network error
    app.post('/p-timeout', (req, res) => {
      // immediately destroy connection to simulate network failure
      req.socket.destroy();
    });

    // p-429-first-key: first key always rate-limited, second key ok
    // we'll check 'authorization' header to decide
    app.post('/p-rotate', (req, res) => {
      const auth = (req.headers.authorization || '');
      if (auth.includes('k1')) {
        // simulate rate limit for first key
        return res.status(429).json({ error: 'rate limited' });
      }
      // other keys return success
      return res.json({ choices: [{ text: 'ok-rotate' }], usage: { total_tokens: 3 } });
    });

    // p-slow: responds slowly (simulate latency but not exceeding provider timeout)
    app.post('/p-slow', (req, res) => {
      setTimeout(() => res.json({ choices: [{ text: 'slow reply' }], usage: { total_tokens: 4 } }), 50);
    });

    // p-success: immediate OK
    app.post('/p-success', (req, res) => res.json({ choices: [{ text: 'immediate ok' }], usage: { total_tokens: 5 } }));

    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('network timeout causes fallback to next provider', async () => {
    const cfg = {
      'p-timeout': { keys: ['k-x'], models: [{ name: 'm1', role: 'reasoning' }] },
      'p-success': { keys: ['k-ok'], models: [{ name: 'm2', role: 'reasoning' }] },
      fallbackChains: { 'reasoning.long': ['p-timeout', 'p-success'] }
    };

    const router = new ProviderRouter(cfg, {});

    const instTimeout = new CodestralProvider({ name: 'p-timeout', model: 'm1', keys: ['k-x'], url: `http://127.0.0.1:${port}/p-timeout` });
    const instSuccess = new CodestralProvider({ name: 'p-success', model: 'm2', keys: ['k-ok'], url: `http://127.0.0.1:${port}/p-success` });

    // attemptWithRouter that uses safeCallWithRetry and reports usage via router
    async function attempt() {
      const restores = [];
      try {
        const picked = await router.pickProvider('reasoning');
        const instance = picked.provider === 'p-timeout' ? instTimeout : instSuccess;
        try {
          const resp = await tryWithRetry(instance, 'hello');
          await router.reportUsage(picked.provider, picked.model, resp.tokens_used || 0, 'ok');
          return { picked, resp };
        } catch (err) {
          const restore = disableProvider(router, picked.provider);
          if (restore) restores.push(restore);
          await router.reportUsage(picked.provider, picked.model, 0, 'error');
          // fallback chain should pick next provider (since p-timeout will cause connection error)
          const picked2 = await router.pickProvider('reasoning');
          const instance2 = picked2.provider === 'p-success' ? instSuccess : instTimeout;
          const resp2 = await tryWithRetry(instance2, 'hello');
          await router.reportUsage(picked2.provider, picked2.model, resp2.tokens_used || 0, 'ok');
          return { picked: picked2, resp: resp2 };
        }
      } finally {
        for (const r of restores) try { r(); } catch (err) {}
      }
    }

    const result = await attempt();
    expect(result.resp.status).toBe('ok');
    expect(result.resp.structured.text).toMatch(/immediate ok/);
  });

  test('rate-limit on first key rotates key and succeeds', async () => {
    const cfg = {
      'p-rotate': { keys: ['k1', 'k2'], models: [{ name: 'm-a', role: 'reasoning' }] },
      fallbackChains: { 'reasoning.long': ['p-rotate'] }
    };

    const router = new ProviderRouter(cfg, {});

    // provider instance will use 'k1' initially (first key), then safeCallWithRetry should rotate to 'k2'
    const inst = new CodestralProvider({ name: 'p-rotate', model: 'm-a', keys: ['k1', 'k2'], url: `http://127.0.0.1:${port}/p-rotate` });

    // first safeCallWithRetry should try k1 -> 429 -> rotate -> succeed with k2
    const resp = await tryWithRetry(inst, 'retry test');
    expect(resp.status).toBe('ok');
    expect(resp.structured.text).toMatch(/ok-rotate/);

    // Router should record tokens when we report usage
    await router.reportUsage('p-rotate', 'm-a', resp.tokens_used || 0, 'ok');
    const tokens = await router._getKey('p-rotate:m-a', 'tokens');
    expect(Number(tokens)).toBeGreaterThanOrEqual(3);
  });

  test('slow provider still allowed if under threshold', async () => {
    const cfg = {
      'p-slow': { keys: ['k-s'], models: [{ name: 'm-s', role: 'reasoning' }] },
      fallbackChains: { 'reasoning.long': ['p-slow'] }
    };

    const router = new ProviderRouter(cfg, {});
    const inst = new CodestralProvider({ name: 'p-slow', model: 'm-s', keys: ['k-s'], url: `http://127.0.0.1:${port}/p-slow` });
    const resp = await tryWithRetry(inst, 'slow test');
    expect(resp.status).toBe('ok');
    expect(resp.structured.text).toMatch(/slow reply/);
    await router.reportUsage('p-slow', 'm-s', resp.tokens_used || 0, 'ok');
    const t = await router._getKey('p-slow:m-s', 'tokens');
    expect(Number(t)).toBeGreaterThanOrEqual(4);
  });
}, 30000);
