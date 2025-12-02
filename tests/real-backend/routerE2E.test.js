/**
 * @jest-environment node
 */

const express = require('express');
// Ensure we use the real axios implementation for E2E HTTP checks
jest.unmock('axios');
const axios = require('axios');
const ProviderRouter = require('../../real-backend/lib/ai_router');
const CodestralProvider = require('../../real-backend/lib/providers/codestral');

// Helper that implements simple fallback flow: try provider, on rate limit or error -> pick next provider
const { disableProvider } = require('../helpers/providerLifecycle');

async function attemptWithRouter(router, instances, role, prompt) {
  let lastErr = null;
  const restores = [];
  for (let i = 0; i < 5; i++) {
    const picked = await router.pickProvider(role);
    const instance = instances[picked.provider];
    try {
      const resp = await instance.call(prompt);
      // report usage through router
      await router.reportUsage(picked.provider, picked.model, resp.tokens_used || 0, 'ok');
      return { picked, resp };
    } catch (e) {
      lastErr = e;
      // if rate limited, rotate key and mark provider as failed; Router metrics will be updated by provider
      if (e && e.isRateLimit) {
        router.rotateKeyFor(picked.provider);
      }
      // temporarily disable this provider so the next pick will choose a different candidate
      const restore = disableProvider(router, picked.provider);
      if (restore) restores.push(restore);
      // mark request as an error
      await router.reportUsage(picked.provider, picked.model, 0, 'error');
      // continue to next candidate via fallback chain
      // continue to next candidate via fallback chain
    }
  }
  // restore any providers we disabled during the attempt
  for (const r of restores) try { r(); } catch (er) {}

  throw lastErr || new Error('Failed all providers');
}

describe('Router e2e (mock HTTP backends)', () => {
  let server;
  let port;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());

    // p-a -> returns 429
    app.post('/p-a', (req, res) => res.status(429).json({ error: 'rate limited' }));
    // p-b -> returns 500
    app.post('/p-b', (req, res) => res.status(500).json({ error: 'server error' }));
    // p-c -> success
    app.post('/p-c', (req, res) => res.json({ choices: [{ text: 'success from p-c' }], usage: { total_tokens: 7 } }));

    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    port = server.address().port;
  });

  afterAll(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  test('full fallback chain: p-a (429) -> p-b (500) -> p-c success and Router usage stored', async () => {
    // provider config with endpoint overrides
    const cfg = {
      'p-a': { keys: ['k-a'], models: [{ name: 'm-a', role: 'reasoning' }], limits: { dailyTokens: 10000 } },
      'p-b': { keys: ['k-b'], models: [{ name: 'm-b', role: 'reasoning' }], limits: { dailyTokens: 10000 } },
      'p-c': { keys: ['k-c'], models: [{ name: 'm-c', role: 'reasoning' }], limits: { dailyTokens: 10000 } },
      fallbackChains: { 'reasoning.long': ['p-a', 'p-b', 'p-c'] }
    };

    // Run router with real redis if available; otherwise uses in-memory store
    const router = new (require('../../real-backend/lib/ai_router'))(cfg, { redisUrl: process.env.REDIS_URL });

    const instances = {};
    instances['p-a'] = new CodestralProvider({ name: 'p-a', model: 'm-a', keys: ['k-a'], url: `http://127.0.0.1:${port}/p-a` });
    instances['p-b'] = new CodestralProvider({ name: 'p-b', model: 'm-b', keys: ['k-b'], url: `http://127.0.0.1:${port}/p-b` });
    instances['p-c'] = new CodestralProvider({ name: 'p-c', model: 'm-c', keys: ['k-c'], url: `http://127.0.0.1:${port}/p-c` });

    const result = await attemptWithRouter(router, instances, 'reasoning', 'hello world');

    expect(result.resp.status).toBe('ok');
    expect(result.resp.structured.text).toMatch(/success from p-c/);

    // verify that router usage counters updated — tokens >= 7 (from response usage)
    const tokensCount = await router._getKey('p-c:m-c', 'tokens');
    expect(Number(tokensCount)).toBeGreaterThanOrEqual(7);
  }, 20000);
});
