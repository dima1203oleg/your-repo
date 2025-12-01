// Real-time Monitoring System for Predator Analytics
// Advanced real-time monitoring with WebSocket support

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { hostname } from 'os';

class RealtimeMonitoringSystem {
    constructor(port = 3005) {
        this.port = port;
        this.clients = new Set();
        this.metrics = {
            system: {
                cpu: 0,
                memory: 0,
                disk: 0,
                network: 0
            },
            api: {
                requests: 0,
                errors: 0,
                responseTime: 0,
                uptime: 0
            },
            databases: {
                connections: 0,
                queries: 0,
                errors: 0
            },
            realData: {
                prozorro: { status: 'unknown', lastUpdate: null },
                nbu: { status: 'unknown', lastUpdate: null },
                tax: { status: 'unknown', lastUpdate: null },
                customs: { status: 'unknown', lastUpdate: null }
            }
        };
        
        this.alerts = [];
        this.history = [];
        this.maxHistorySize = 1000;
        
        this.initializeServer();
        this.startMetricsCollection();
    }

    initializeServer() {
        this.server = createServer((req, res) => {
            this.handleHttpRequest(req, res);
        });
        
        this.wss = new WebSocketServer({ server: this.server });
        
        this.wss.on('connection', (ws, req) => {
            this.handleWebSocketConnection(ws, req);
        });
        
        this.server.listen(this.port, () => {
            console.log(`📡 Real-time Monitoring Server running on port ${this.port}`);
        });
    }

    handleHttpRequest(req, res) {
        const url = req.url;
        
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (url === '/') {
            this.serveDashboard(res);
        } else if (url === '/api/metrics') {
            this.serveMetrics(res);
        } else if (url === '/api/alerts') {
            this.serveAlerts(res);
        } else if (url === '/api/health') {
            this.serveHealth(res);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    serveDashboard(res) {
        const html = this.generateDashboardHTML();
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(html);
    }

    serveMetrics(res) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            alerts: this.alerts,
            history: this.history.slice(-50)
        }));
    }

    serveAlerts(res) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(this.alerts));
    }

    serveHealth(res) {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            clients: this.clients.size,
            alerts: this.alerts.length
        }));
    }

    handleWebSocketConnection(ws, req) {
        console.log(`🔗 New WebSocket connection from ${req.socket.remoteAddress}`);
        this.clients.add(ws);
        
        // Send current metrics immediately
        ws.send(JSON.stringify({
            type: 'metrics',
            data: this.metrics,
            timestamp: new Date().toISOString()
        }));
        
        // Send existing alerts
        if (this.alerts.length > 0) {
            ws.send(JSON.stringify({
                type: 'alerts',
                data: this.alerts,
                timestamp: new Date().toISOString()
            }));
        }
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleWebSocketMessage(ws, data);
            } catch (error) {
                console.error('Invalid WebSocket message:', error);
            }
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            this.clients.delete(ws);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.clients.delete(ws);
        });
    }

    handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'subscribe':
                // Client wants to subscribe to specific metrics
                ws.subscriptions = data.channels || ['all'];
                break;
            case 'acknowledge':
                // Client acknowledged an alert
                this.acknowledgeAlert(data.alertId);
                break;
            case 'clearAlerts':
                // Clear all alerts
                this.clearAlerts();
                break;
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }

    startMetricsCollection() {
        // Collect system metrics every 5 seconds
        setInterval(() => {
            this.collectSystemMetrics();
            this.broadcastMetrics();
        }, 5000);
        
        // Collect API metrics every 10 seconds
        setInterval(() => {
            this.collectApiMetrics();
        }, 10000);
        
        // Check real data status every 30 seconds
        setInterval(() => {
            this.checkRealDataStatus();
        }, 30000);
        
        // Check for alerts every 15 seconds
        setInterval(() => {
            this.checkAlerts();
        }, 15000);
        
        // Initial collection
        this.collectSystemMetrics();
        this.collectApiMetrics();
        this.checkRealDataStatus();
    }

    collectSystemMetrics() {
        try {
            // CPU usage (simplified)
            const cpuUsage = process.cpuUsage();
            const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
            
            // Memory usage
            const memUsage = process.memoryUsage();
            const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            // Disk usage (simplified)
            let diskUsage = 0;
            try {
                const result = execSync('df -h . | tail -1', { encoding: 'utf8' });
                const parts = result.trim().split(/\s+/);
                if (parts.length >= 5) {
                    diskUsage = parseInt(parts[4].replace('%', ''));
                }
            } catch (error) {
                diskUsage = 0;
            }
            
            // Network (simplified - just count active connections)
            const networkUsage = this.clients.size;
            
            this.metrics.system = {
                cpu: Math.round(cpuPercent * 100) / 100,
                memory: Math.round(memoryPercent * 100) / 100,
                disk: diskUsage,
                network: networkUsage,
                timestamp: new Date().toISOString()
            };
            
            // Add to history
            this.addToHistory('system', this.metrics.system);
            
        } catch (error) {
            console.error('Error collecting system metrics:', error);
        }
    }

    collectApiMetrics() {
        try {
            // Check backend health
            let apiStatus = 'unknown';
            let responseTime = 0;
            let errors = 0;
            
            try {
                const start = Date.now();
                const result = execSync('curl -s -w "%{http_code}" http://localhost:8001/health -o /dev/null', { 
                    encoding: 'utf8',
                    timeout: 5000
                });
                responseTime = Date.now() - start;
                apiStatus = result === '200' ? 'healthy' : 'unhealthy';
            } catch (error) {
                apiStatus = 'down';
                errors++;
            }
            
            // Check proxy health
            let proxyStatus = 'unknown';
            try {
                const result = execSync('curl -s -w "%{http_code}" http://localhost:3003/health -o /dev/null', { 
                    encoding: 'utf8',
                    timeout: 5000
                });
                proxyStatus = result === '200' ? 'healthy' : 'unhealthy';
            } catch (error) {
                proxyStatus = 'down';
                errors++;
            }
            
            this.metrics.api = {
                requests: this.metrics.api.requests + 1,
                errors: this.metrics.api.errors + errors,
                responseTime: responseTime,
                uptime: process.uptime(),
                backendStatus: apiStatus,
                proxyStatus: proxyStatus,
                timestamp: new Date().toISOString()
            };
            
            this.addToHistory('api', this.metrics.api);
            
        } catch (error) {
            console.error('Error collecting API metrics:', error);
        }
    }

    checkRealDataStatus() {
        const apis = [
            { name: 'prozorro', url: 'http://localhost:8001/api/v1/connectors/prozorro' },
            { name: 'nbu', url: 'http://localhost:8001/api/v1/connectors/nbu' },
            { name: 'tax', url: 'http://localhost:8001/api/v1/connectors/tax' },
            { name: 'customs', url: 'http://localhost:8001/api/v1/connectors/customs' }
        ];
        
        apis.forEach(api => {
            try {
                const result = execSync(`curl -s -w "%{http_code}" "${api.url}" -o /dev/null`, { 
                    encoding: 'utf8',
                    timeout: 10000
                });
                
                const status = result === '200' ? 'online' : 'offline';
                this.metrics.realData[api.name] = {
                    status: status,
                    lastUpdate: new Date().toISOString(),
                    responseCode: result
                };
                
                if (status === 'offline') {
                    this.createAlert('warning', `API ${api.name} is offline`, `HTTP ${result}`);
                }
                
            } catch (error) {
                this.metrics.realData[api.name] = {
                    status: 'error',
                    lastUpdate: new Date().toISOString(),
                    error: error.message
                };
                
                this.createAlert('error', `API ${api.name} error`, error.message);
            }
        });
    }

    checkAlerts() {
        // Check system alerts
        if (this.metrics.system.cpu > 80) {
            this.createAlert('warning', 'High CPU usage', `CPU usage is ${this.metrics.system.cpu}%`);
        }
        
        if (this.metrics.system.memory > 90) {
            this.createAlert('critical', 'High memory usage', `Memory usage is ${this.metrics.system.memory}%`);
        }
        
        if (this.metrics.system.disk > 85) {
            this.createAlert('warning', 'High disk usage', `Disk usage is ${this.metrics.system.disk}%`);
        }
        
        // Check API alerts
        if (this.metrics.api.errors > 10) {
            this.createAlert('error', 'High error rate', `${this.metrics.api.errors} API errors detected`);
        }
        
        if (this.metrics.api.responseTime > 2000) {
            this.createAlert('warning', 'Slow API response', `Response time is ${this.metrics.api.responseTime}ms`);
        }
        
        // Clean old alerts (older than 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        this.alerts = this.alerts.filter(alert => new Date(alert.timestamp) > oneHourAgo);
    }

    createAlert(level, message, details = '') {
        const alert = {
            id: Date.now().toString(),
            level: level, // info, warning, error, critical
            message: message,
            details: details,
            timestamp: new Date().toISOString(),
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        // Broadcast to all clients
        this.broadcast({
            type: 'alert',
            data: alert,
            timestamp: new Date().toISOString()
        });
        
        console.log(`🚨 Alert [${level.toUpperCase()}]: ${message}`);
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.broadcast({
                type: 'alertAcknowledged',
                data: alert,
                timestamp: new Date().toISOString()
            });
        }
    }

    clearAlerts() {
        this.alerts = [];
        this.broadcast({
            type: 'alertsCleared',
            timestamp: new Date().toISOString()
        });
    }

    addToHistory(type, data) {
        const historyEntry = {
            type: type,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        this.history.push(historyEntry);
        
        // Keep history size manageable
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(-this.maxHistorySize);
        }
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                try {
                    client.send(messageStr);
                } catch (error) {
                    console.error('Error sending to client:', error);
                    this.clients.delete(client);
                }
            }
        });
    }

    broadcastMetrics() {
        this.broadcast({
            type: 'metrics',
            data: this.metrics,
            timestamp: new Date().toISOString()
        });
    }

    generateDashboardHTML() {
        return `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Predator Analytics - Real-time Monitoring</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; color: #38bdf8; margin-bottom: 10px; }
        .header p { color: #94a3b8; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
        .card h3 { color: #38bdf8; margin-bottom: 15px; font-size: 1.2rem; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .metric-label { color: #94a3b8; }
        .metric-value { font-weight: bold; font-size: 1.1rem; }
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .status-critical { color: #dc2626; }
        .alerts { max-height: 300px; overflow-y: auto; }
        .alert { padding: 10px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid; }
        .alert-info { background: #1e3a8a; border-color: #3b82f6; }
        .alert-warning { background: #78350f; border-color: #f59e0b; }
        .alert-error { background: #7f1d1d; border-color: #ef4444; }
        .alert-critical { background: #450a0a; border-color: #dc2626; }
        .alert-time { font-size: 0.8rem; color: #94a3b8; }
        .connection-status { position: fixed; top: 20px; right: 20px; padding: 10px 15px; border-radius: 20px; font-size: 0.9rem; }
        .connected { background: #10b981; color: white; }
        .disconnected { background: #ef4444; color: white; }
        .chart { height: 200px; background: #0f172a; border-radius: 6px; margin-top: 10px; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .real-data-status { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .api-status { padding: 8px; border-radius: 6px; text-align: center; }
        .api-online { background: #064e3b; color: #10b981; }
        .api-offline { background: #7f1d1d; color: #ef4444; }
        .api-error { background: #451a03; color: #f59e0b; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Predator Analytics</h1>
            <p>Real-time Monitoring Dashboard</p>
        </div>
        
        <div class="connection-status" id="connectionStatus">
            <span id="connectionText">Connecting...</span>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>🖥️ System Metrics</h3>
                <div class="metric">
                    <span class="metric-label">CPU Usage</span>
                    <span class="metric-value" id="cpu">0%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Memory Usage</span>
                    <span class="metric-value" id="memory">0%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Disk Usage</span>
                    <span class="metric-value" id="disk">0%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Network Connections</span>
                    <span class="metric-value" id="network">0</span>
                </div>
                <div class="chart">📊 System Performance Chart</div>
            </div>
            
            <div class="card">
                <h3>🌐 API Status</h3>
                <div class="metric">
                    <span class="metric-label">Backend Status</span>
                    <span class="metric-value" id="backendStatus">Unknown</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Proxy Status</span>
                    <span class="metric-value" id="proxyStatus">Unknown</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Response Time</span>
                    <span class="metric-value" id="responseTime">0ms</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total Requests</span>
                    <span class="metric-value" id="requests">0</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Errors</span>
                    <span class="metric-value" id="errors">0</span>
                </div>
            </div>
            
            <div class="card">
                <h3>🇺🇦 Real Data APIs</h3>
                <div class="real-data-status">
                    <div class="api-status" id="prozorro">Prozorro</div>
                    <div class="api-status" id="nbu">НБУ</div>
                    <div class="api-status" id="tax">ДПС</div>
                    <div class="api-status" id="customs">ДМСУ</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🚨 Alerts</h3>
                <div class="alerts" id="alerts">
                    <p style="color: #94a3b8; text-align: center;">No alerts</p>
                </div>
            </div>
        </div>
    </div>

    <script>
        let ws;
        let reconnectTimer;
        
        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('Connected to monitoring server');
                updateConnectionStatus(true);
                clearTimeout(reconnectTimer);
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleMessage(data);
            };
            
            ws.onclose = function() {
                console.log('Disconnected from monitoring server');
                updateConnectionStatus(false);
                scheduleReconnect();
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
                updateConnectionStatus(false);
            };
        }
        
        function handleMessage(data) {
            switch (data.type) {
                case 'metrics':
                    updateMetrics(data.data);
                    break;
                case 'alert':
                    addAlert(data.data);
                    break;
                case 'alerts':
                    updateAlerts(data.data);
                    break;
                case 'alertsCleared':
                    clearAlerts();
                    break;
            }
        }
        
        function updateMetrics(metrics) {
            // System metrics
            document.getElementById('cpu').textContent = metrics.system.cpu.toFixed(1) + '%';
            document.getElementById('memory').textContent = metrics.system.memory.toFixed(1) + '%';
            document.getElementById('disk').textContent = metrics.system.disk + '%';
            document.getElementById('network').textContent = metrics.system.network;
            
            // API metrics
            document.getElementById('backendStatus').textContent = metrics.api.backendStatus || 'Unknown';
            document.getElementById('proxyStatus').textContent = metrics.api.proxyStatus || 'Unknown';
            document.getElementById('responseTime').textContent = metrics.api.responseTime + 'ms';
            document.getElementById('requests').textContent = metrics.api.requests;
            document.getElementById('errors').textContent = metrics.api.errors;
            
            // Real data status
            updateApiStatus('prozorro', metrics.realData.prozorro);
            updateApiStatus('nbu', metrics.realData.nbu);
            updateApiStatus('tax', metrics.realData.tax);
            updateApiStatus('customs', metrics.realData.customs);
        }
        
        function updateApiStatus(apiId, status) {
            const element = document.getElementById(apiId);
            element.className = 'api-status';
            
            if (status.status === 'online') {
                element.classList.add('api-online');
                element.textContent = element.textContent + ' ✅';
            } else if (status.status === 'offline') {
                element.classList.add('api-offline');
                element.textContent = element.textContent + ' ❌';
            } else {
                element.classList.add('api-error');
                element.textContent = element.textContent + ' ⚠️';
            }
        }
        
        function addAlert(alert) {
            const alertsContainer = document.getElementById('alerts');
            const alertElement = document.createElement('div');
            alertElement.className = \`alert alert-\${alert.level}\`;
            alertElement.innerHTML = \`
                <div>\${alert.message}</div>
                <div class="alert-time">\${new Date(alert.timestamp).toLocaleString()}</div>
            \`;
            
            // Remove "No alerts" message if present
            const noAlerts = alertsContainer.querySelector('p');
            if (noAlerts) {
                noAlerts.remove();
            }
            
            alertsContainer.insertBefore(alertElement, alertsContainer.firstChild);
            
            // Keep only last 10 alerts
            const alerts = alertsContainer.querySelectorAll('.alert');
            if (alerts.length > 10) {
                alerts[alerts.length - 1].remove();
            }
        }
        
        function updateAlerts(alerts) {
            const alertsContainer = document.getElementById('alerts');
            alertsContainer.innerHTML = '';
            
            if (alerts.length === 0) {
                alertsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center;">No alerts</p>';
            } else {
                alerts.forEach(alert => addAlert(alert));
            }
        }
        
        function clearAlerts() {
            const alertsContainer = document.getElementById('alerts');
            alertsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center;">No alerts</p>';
        }
        
        function updateConnectionStatus(connected) {
            const statusElement = document.getElementById('connectionStatus');
            const textElement = document.getElementById('connectionText');
            
            if (connected) {
                statusElement.className = 'connection-status connected';
                textElement.textContent = 'Connected';
            } else {
                statusElement.className = 'connection-status disconnected';
                textElement.textContent = 'Disconnected';
            }
        }
        
        function scheduleReconnect() {
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(connectWebSocket, 5000);
        }
        
        // Initialize connection
        connectWebSocket();
        
        // Fetch initial metrics
        fetch('/api/metrics')
            .then(response => response.json())
            .then(data => updateMetrics(data.metrics))
            .catch(error => console.error('Error fetching initial metrics:', error));
    </script>
</body>
</html>`;
    }

    getStats() {
        return {
            uptime: process.uptime(),
            clients: this.clients.size,
            alerts: this.alerts.length,
            historySize: this.history.length,
            metrics: this.metrics
        };
    }

    shutdown() {
        console.log('🔄 Shutting down monitoring server...');
        
        this.clients.forEach(client => {
            client.close();
        });
        
        this.wss.close();
        this.server.close();
        
        console.log('✅ Monitoring server shutdown complete');
    }
}

// Run monitoring server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitoring = new RealtimeMonitoringSystem();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        monitoring.shutdown();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        monitoring.shutdown();
        process.exit(0);
    });
    
    console.log('🎊 Real-time Monitoring System started!');
    console.log(`📊 Dashboard available at: http://localhost:${monitoring.port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${monitoring.port}`);
}

export default RealtimeMonitoringSystem;
