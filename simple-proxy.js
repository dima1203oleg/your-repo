import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3003;

app.use(express.json());

// Cache for proxy responses
const proxyCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// API proxy middleware FIRST (before static files)
app.use('/api', async (req, res, next) => {
    if (req.path === '/') {
        next();
        return;
    }
    
    const targetUrl = `http://localhost:8001${req.originalUrl}`;
    const cacheKey = `${req.method}:${req.originalUrl}`;
    
    // Check cache for GET requests
    if (req.method === 'GET' && proxyCache.has(cacheKey)) {
        const cached = proxyCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`[PROXY CACHE HIT] ${req.method} ${req.originalUrl}`);
            return res.json(cached.data);
        } else {
            proxyCache.delete(cacheKey);
        }
    }
    
    console.log(`[PROXY] ${req.method} ${req.originalUrl} -> ${targetUrl}`);
    
    try {
        const startTime = Date.now();
        
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                ...req.headers,
                host: 'localhost:8001'
            },
            timeout: 10000, // 10 second timeout
            responseType: 'json'
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`[PROXY] Response in ${responseTime}ms: ${response.status}`);
        
        // Cache successful GET requests
        if (req.method === 'GET' && response.status === 200) {
            proxyCache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            console.log(`[PROXY CACHE SET] ${cacheKey}`);
        }
        
        // Forward response with same status and headers
        res.status(response.status);
        
        // Copy relevant headers
        if (response.headers['content-type']) {
            res.set('Content-Type', response.headers['content-type']);
        }
        
        return res.json(response.data);
        
    } catch (error) {
        console.error(`[PROXY ERROR] ${req.method} ${req.originalUrl}:`, error.message);
        
        // Handle different error types
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Backend server unavailable',
                details: 'Connection refused to localhost:8001'
            });
        } else if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                success: false,
                error: 'Backend timeout',
                details: 'Request timed out after 10 seconds'
            });
        } else if (error.response) {
            // Forward backend error responses
            const status = error.response.status;
            console.log(`[PROXY] Forwarding error ${status} from backend`);
            return res.status(status).json(error.response.data);
        } else {
            return res.status(500).json({
                success: false,
                error: 'Proxy error',
                details: error.message
            });
        }
    }
});

// Health check with detailed status
app.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            mode: 'OPTIMIZED_PROXY',
            timestamp: new Date().toISOString(),
            proxy_target: 'http://localhost:8001',
            cache_size: proxyCache.size,
            cached_endpoints: Array.from(proxyCache.keys())
        }
    });
});

// Serve static files (frontend build) but NOT for API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
    }
    return express.static('dist', {
        extensions: ['html', 'js', 'css'],
        index: ['index.html']
    })(req, res, next);
});

// Handle SPA routing - serve index.html for all non-API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
        return next();
    }
    res.sendFile('index.html', { root: 'dist' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Optimized Proxy Server running on http://localhost:${PORT}`);
    console.log(`📡 Proxying API requests to http://localhost:8001`);
    console.log(`🗂️ Serving static files from ./dist`);
    console.log(`⚡ Cache enabled: ${CACHE_TTL/1000}s TTL`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
