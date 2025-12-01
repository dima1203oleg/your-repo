import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3003;

// Proxy to real backend FIRST (before static files)
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:8001',
    changeOrigin: true,
    timeout: 30000,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] ${req.method} ${req.url} -> http://localhost:8001${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[PROXY] Response ${proxyRes.statusCode} for ${req.url}`);
    },
    onError: (err, req, res) => {
        console.error('[PROXY] Error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Proxy error: ' + err.message
            });
        }
    }
}));

// Serve static files from dist directory
app.use(express.static('dist'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            mode: 'PROXY_SERVER',
            timestamp: new Date().toISOString(),
            proxy_target: 'http://localhost:8001'
        }
    });
});

// Fallback to index.html for SPA (must be last)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        res.status(404).json({ success: false, error: 'API endpoint not found' });
        return;
    }
    res.sendFile('index.html', { root: './dist' });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 Proxying /api/* to http://localhost:8001`);
    console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});
