#!/usr/bin/env node
/*
  Small dev utility to serve `dist` and proxy requests to the real-backend.
  Useful for running Playwright against a static build while forwarding /api calls.
*/
import express from 'express';
import axios from 'axios';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3003;
const API_TARGET = process.env.API_TARGET || 'http://127.0.0.1:8001';

// Lightweight proxy for /api -> API_TARGET
app.use('/api', async (req, res) => {
  try {
    const targetUrl = `${API_TARGET}${req.originalUrl}`; // originalUrl contains /api/...
    // Build headers to forward (strip host)
    const headers = { ...req.headers };
    delete headers.host;

    const axiosRes = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: req.body,
      timeout: 10000,
      responseType: 'stream',
      validateStatus: () => true
    });

    // Forward status, headers
    Object.entries(axiosRes.headers || {}).forEach(([k, v]) => {
      try { res.setHeader(k, v); } catch (e) { /* ignore invalid headers */ }
    });
    res.status(axiosRes.status);

    // Stream the response
    axiosRes.data.pipe(res);
  } catch (err) {
    console.warn('proxy error', err && err.message);
    try { res.status(502).send('Bad Gateway'); } catch (e) { /* ignore */ }
  }
});

// serve dist
app.use(express.static(path.join(process.cwd(), 'dist'), { index: 'index.html' }));

// Serve index.html for any path that isn't /api (SPA fallback)
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Static server + proxy running on http://127.0.0.1:${PORT} -> api -> ${API_TARGET}`);
});
