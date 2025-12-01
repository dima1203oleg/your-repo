import express from 'express';
import axios from 'axios';

const app = express();
const PORT = 3004;

let apiHealthHistory = [];
let lastCheck = null;

async function checkAPIHealth() {
    const startTime = Date.now();
    const results = [];
    
    const apis = [
        { name: 'Prozorro', url: 'https://public.api.openprocurement.org/api/2.5/tenders?limit=5' },
        { name: 'НБУ', url: 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json' },
        { name: 'ДПС', url: 'https://cabinet.tax.gov.ua/api/v1/public/registry' },
        { name: 'ДМСУ', url: 'https://open-api.customs.gov.ua/api/v1/declarations' }
    ];
    
    for (const api of apis) {
        try {
            const response = await axios.get(api.url, { timeout: 10000 });
            results.push({
                name: api.name,
                status: 'HEALTHY',
                responseTime: Date.now() - startTime,
                statusCode: response.status,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            results.push({
                name: api.name,
                status: 'UNHEALTHY',
                responseTime: 10000,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
    
    lastCheck = new Date().toISOString();
    apiHealthHistory.push({
        timestamp: lastCheck,
        results
    });
    
    // Keep only last 100 records
    if (apiHealthHistory.length > 100) {
        apiHealthHistory = apiHealthHistory.slice(-100);
    }
    
    return results;
}

app.get('/health', async (req, res) => {
    const health = await checkAPIHealth();
    res.json({
        success: true,
        data: {
            status: 'healthy',
            mode: 'MONITORING_DASHBOARD',
            timestamp: new Date().toISOString(),
            apis: health,
            lastCheck
        }
    });
});

app.get('/api/health/history', (req, res) => {
    res.json({
        success: true,
        data: {
            history: apiHealthHistory.slice(-20), // Last 20 checks
            totalChecks: apiHealthHistory.length,
            lastCheck
        }
    });
});

app.get('/api/health/summary', (req, res) => {
    if (!lastCheck) {
        return res.json({
            success: true,
            data: { message: 'No health checks performed yet' }
        });
    }
    
    const latest = apiHealthHistory[apiHealthHistory.length - 1];
    const healthy = latest.results.filter(api => api.status === 'HEALTHY').length;
    const total = latest.results.length;
    
    res.json({
        success: true,
        data: {
            healthyAPIs: healthy,
            totalAPIs: total,
            healthPercentage: Math.round((healthy / total) * 100),
            lastCheck,
            status: healthy >= 3 ? 'GOOD' : healthy >= 2 ? 'WARNING' : 'CRITICAL'
        }
    });
});

// Serve monitoring dashboard
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8">
    <title>API Monitoring Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white p-8">
    <h1 class="text-3xl font-bold mb-6">🔍 API Monitoring Dashboard</h1>
    <div id="dashboard" class="space-y-6">
        <div class="text-center">Loading...</div>
    </div>
    
    <script>
        async function updateDashboard() {
            try {
                const response = await fetch('/api/health/summary');
                const data = await response.json();
                
                const healthClass = data.data.status === 'GOOD' ? 'bg-green-900' : 
                                  data.data.status === 'WARNING' ? 'bg-yellow-900' : 'bg-red-900';
                
                document.getElementById('dashboard').innerHTML = \`
                    <div class="\${healthClass} p-6 rounded-lg">
                        <h2 class="text-xl font-bold mb-4">Статус API: \${data.data.status}</h2>
                        <div class="text-2xl font-bold">\${data.data.healthyAPIs}/\${data.data.totalAPIs} APIs Healthy</div>
                        <div class="text-lg">\${data.data.healthPercentage}%</div>
                        <div class="text-sm mt-2">Остання перевірка: \${new Date(data.data.lastCheck).toLocaleString('uk-UA')}</div>
                    </div>
                    <button onclick="location.reload()" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                        Оновити
                    </button>
                \`;
            } catch (error) {
                document.getElementById('dashboard').innerHTML = \`
                    <div class="bg-red-900 p-6 rounded-lg">
                        <h2 class="text-xl font-bold mb-4">Помилка завантаження</h2>
                        <div>\${error.message}</div>
                    </div>
                \`;
            }
        }
        
        updateDashboard();
        setInterval(updateDashboard, 30000); // Update every 30 seconds
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`🔍 Monitoring Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 Health checks: http://localhost:${PORT}/api/health/summary`);
    console.log(`📈 History: http://localhost:${PORT}/api/health/history`);
});
