// CommonJS version for environments where package.json uses "type": "module"
const http = require('http');
const url = require('url');

const port = process.env.PORT || 8000;

function json(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Predator-Token'
  });
  res.end(body);
}

function nowTime() {
  return new Date().toISOString();
}

function generateSystemMetrics() {
  return {
    cpu: Number((10 + Math.random() * 40).toFixed(1)),
    memory: Number((8 + Math.random() * 24).toFixed(1)),
    gpu: { util: Number((Math.random() * 30).toFixed(1)), temp: Number((40 + Math.random() * 40).toFixed(1)), vram: Number((2 + Math.random() * 10).toFixed(2)), fan: Math.floor(20 + Math.random() * 80) },
    network: { ingress: Math.floor(Math.random() * 300), egress: Math.floor(Math.random() * 200) }
  };
}

function handleMetricsSystem(req, res) {
  const data = generateSystemMetrics();
  json(res, { success: true, data: { ...data } });
}

function handleDashboardOverview(req, res) {
  json(res, {
    success: true,
    data: {
      jobs: [
        { id: 'etl-1', status: 'RUNNING', progress: 42 },
        { id: 'ingest-3', status: 'QUEUED', progress: 0 }
      ],
      services: [
        { id: 'ua-sources', status: 'ONLINE' },
        { id: 'predator-backend', status: 'ONLINE' },
        { id: 'etl-worker', status: 'ONLINE' }
      ]
    }
  });
}

function handleEnvironments(req, res) {
  json(res, { success: true, data: [ { id: 'dev', name: 'local', status: 'SYNCED' } ] });
}

function handlePipelines(req, res) {
  json(res, { success: true, data: [ { id: 'pipeline-1', name: 'Daily ETL', state: 'IDLE' } ] });
}

function handleMonitoringLogs(req, res) {
  const logs = [
    { ts: nowTime(), service: 'ua-sources', level: 'INFO', msg: 'Health OK' },
    { ts: nowTime(), service: 'auth-service', level: 'WARN', msg: 'Slow response on /token' }
  ];
  json(res, { success: true, data: logs });
}

function handleSystemMonitoring(req, res) {
  const base = generateSystemMetrics();
  json(res, { success: true, data: {
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime ? process.uptime() : 1234),
    nodeVersion: process.version || 'vX.Y.Z',
    ...base
  }});
}

function handleSecurityAudit(req, res) {
  const logs = [
    { id: 'sec-1', timestamp: nowTime(), user: 'admin', action: 'Login', ip: '127.0.0.1', status: 'SUCCESS' },
    { id: 'sec-2', timestamp: nowTime(), user: 'analyst', action: 'Data Export', ip: '10.0.0.5', status: 'SUCCESS' }
  ];
  json(res, { success: true, data: logs });
}

function handleDataDatabases(req, res) {
  const dbs = [
    { id: 'postgres-main', name: 'ua_customs_declarations', type: 'TimescaleDB', records: 1200000, size: '3.4 GB', status: 'ACTIVE' },
    { id: 'elastic-main', name: 'ua_prozorro_tenders', type: 'Elasticsearch', records: 5400000, size: '12.1 GB', status: 'ACTIVE' }
  ];
  json(res, { success: true, data: dbs });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  // allow preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Predator-Token'
    });
    return res.end();
  }

  if (parsed.pathname === '/api/v1/metrics/system' && req.method === 'GET') return handleMetricsSystem(req, res);
  if (parsed.pathname === '/api/v1/dashboard/overview' && req.method === 'GET') return handleDashboardOverview(req, res);
  if (parsed.pathname === '/api/v1/deployment/environments' && req.method === 'GET') return handleEnvironments(req, res);
  if (parsed.pathname === '/api/v1/deployment/pipelines' && req.method === 'GET') return handlePipelines(req, res);
  if (parsed.pathname === '/api/v1/monitoring/logs' && req.method === 'GET') return handleMonitoringLogs(req, res);
  if (parsed.pathname === '/api/v1/monitoring/logs/stream' && req.method === 'GET') return handleMonitoringLogs(req, res);
  if (parsed.pathname === '/api/v1/system/monitoring' && req.method === 'GET') return handleSystemMonitoring(req, res);
  if (parsed.pathname === '/api/v1/security/audit' && req.method === 'GET') return handleSecurityAudit(req, res);
  if (parsed.pathname === '/api/v1/data/databases' && req.method === 'GET') return handleDataDatabases(req, res);

  // generic fallback that returns a small mocked response so many endpoints behave as 'live'
  if (parsed.pathname.startsWith('/api/v1') && req.method === 'GET') {
    json(res, { success: true, data: { info: 'mocked endpoint', path: parsed.pathname } });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

// Bind explicitly to IPv4 0.0.0.0 so local IPv4 clients (curl/node) can connect
server.listen(port, '0.0.0.0', () => {
  console.log(`Mock API server running on http://0.0.0.0:${port}`);
});

module.exports = server;
