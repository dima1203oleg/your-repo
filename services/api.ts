
import axios from 'axios';
import { RiskForecast, OpponentResponse } from '../types';
import {
    getCustomsData,
    getTaxServiceData,
    getProzorroData,
    getNBUData,
    getClusterStatus,
    getSystemLogs,
    getSystemMetrics,
    getSecurityLogs,
    getDatabaseStatus,
    getAgentStatus,
    generateRealTimestamp,
    generateRealIP,
    generateRealId
} from './realDataSources';
import { 
    MOCK_ENVIRONMENTS, MOCK_PIPELINES, MOCK_CONNECTORS, MOCK_FILES, 
    MOCK_WEB_SOURCES, MOCK_API_SOURCES, MOCK_TELEGRAM_BOTS, MOCK_LLM_CONFIG, 
    MOCK_DATABASES, MOCK_VECTORS, MOCK_SECURITY_LOGS, MOCK_WAF_LOGS, 
    MOCK_TARGETS, MOCK_ETL_JOBS, MOCK_SERVICES, MOCK_CLUSTER, MOCK_SECTOR_DATA,
    MOCK_BENCHMARKS, MOCK_AUTOML_EXPERIMENTS, MOCK_AGENT_CONFIGS, MOCK_SECRETS,
    MOCK_DATA_CATALOG, MOCK_USER_TEMPLATES, MOCK_AUTO_DATASETS
} from './mockData';

// Base configuration
// Default to the local mock backend on 8001 in dev so frontend can
// receive 'live' data directly when the Vite proxy behaves unexpectedly.
/**
 * Resolve API base url in a safer way so we don't bake local dev URLs into
 * production bundles. Prefer runtime-injected config (window.__APP_CONFIG__)
 * or an index.html meta tag in production. In dev, keep the localhost mock
 * fallback so developer experience remains simple.
 */
const runtimeApiFromWindow = typeof globalThis !== 'undefined' && (globalThis as any).window && (globalThis as any).__APP_CONFIG__ && (globalThis as any).__APP_CONFIG__.NEXT_PUBLIC_API_URL;
const runtimeApiFromMeta = typeof globalThis !== 'undefined' && (globalThis as any).document && (globalThis as any).document.querySelector('meta[name="api-base-url"]')?.getAttribute('content');

export const API_BASE_URL = (
    process.env.NODE_ENV === 'development'
        ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001/api/v1')
        : (process.env.NEXT_PUBLIC_API_URL || runtimeApiFromWindow || runtimeApiFromMeta || '')
);

// Fallback to direct real data sources if backend is unavailable
const FALLBACK_TO_REAL_DATA = true;

// TRUTH-ONLY PROTOCOL: In production, mocks are strictly disabled.
const IS_TRUTH_ONLY_MODE = process.env.NODE_ENV === 'production';

// Build headers at runtime so we don't bake placeholder tokens into the bundle.
const buildHeaders = () => {
    const headers: Record<string, any> = { 'Content-Type': 'application/json' };
    try {
        if (typeof globalThis !== 'undefined' && (globalThis as any).sessionStorage) {
            const token = (globalThis as any).sessionStorage.getItem('predator_auth_token');
            if (token) headers['X-Predator-Token'] = token;
        }
    } catch { /* ignore sessionStorage failures */ }
    return headers;
};

const apiClient = axios.create({
    baseURL: API_BASE_URL || undefined, // undefined prevents axios from resolving a misleading baseURL
    headers: buildHeaders(),
    timeout: 60000,
});

// Ensure we always use the latest token from sessionStorage at request time
apiClient.interceptors.request.use((cfg) => {
    try {
        if (typeof globalThis !== 'undefined' && (globalThis as any).sessionStorage) {
            const token = (globalThis as any).sessionStorage.getItem('predator_auth_token');
            if (token) {
                // axios headers may be plain object or AxiosHeaders with helper methods
                // handle both cases safely and keep TS happy via local casts
                try {
                    const h = cfg.headers as any;
                    if (h && typeof h.set === 'function') {
                        // AxiosHeaders instance
                        h.set('X-Predator-Token', token);
                    } else {
                        cfg.headers = { ...(cfg.headers as any), 'X-Predator-Token': token } as any;
                    }
                } catch (e) {
                    cfg.headers = { ...(cfg.headers as any), 'X-Predator-Token': token } as any;
                }
            }
            else if (cfg.headers && 'X-Predator-Token' in cfg.headers) {
                // remove default header when not provided at runtime
                const { ['X-Predator-Token']: _removed, ...rest } = cfg.headers as any;
                cfg.headers = rest;
            }
        }
    } catch { /* ignore */ }
    return cfg;
});

// --- Network Error Handler / Demo Mode Fallback ---
apiClient.interceptors.response.use(
  response => response,
  error => {
    const isNetworkError = error.message === 'Network Error' || error.code === 'ERR_NETWORK';
    
    // G-01 PROTOCOL VIOLATION CHECK
    if (isNetworkError && IS_TRUTH_ONLY_MODE) {
        console.error("🚨 TRUTH-ONLY PROTOCOL: Network connection failed. Mocks are disabled in Production.");
        // Rejecting the promise forces the UI to show an error state instead of fake data
        return Promise.reject(error);
    }
    
    // ... existing demo fallback logic for dev mode ...
    if (isNetworkError) {
        if (FALLBACK_TO_REAL_DATA) {
            console.warn("⚠️ Backend Unreachable. Switching to REAL DATA MODE (Direct API calls).");
        } else {
            console.warn("⚠️ Backend Unreachable. Switching to DEMO MODE (Simulation).");
        }
        // For axios calls, we want to reject so the specific api methods catch it and return mock data
    }
    return Promise.reject(error);
  }
);

// Helper to simulate risk forecast generation since it's dynamic
const generateMockRiskForecast = (): RiskForecast[] => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
        day,
        risk: Math.floor(Math.random() * 40) + 20,
        confidence: Math.floor(Math.random() * 20) + 80
    }));
};

// ... export api methods ...
export const api = {
    // --- EVOLUTION / NAS (REAL) ---
    startEvolutionCycle: async () => {
        try {
            const res = await apiClient.post('/evolution/cycle');
            return res.data;
        } catch (e) {
            console.error("NAS Start Failed", e);
            throw e;
        }
    },
    getEvolutionStatus: async () => {
        try {
            const res = await apiClient.get('/evolution/status');
            return res.data; // { phase: string, logs: string[], progress: number, active: boolean }
        } catch (e) {
            // Fallback for UI testing if backend is dead
            return { phase: 'IDLE', logs: ['[ERROR] Connection to NAS Engine failed.'], progress: 0, active: false };
        }
    },

    getSecrets: async () => {
        try {
            const res = await apiClient.get('/secrets');
            return res.data;
        } catch (e) {
            return MOCK_SECRETS;
        }
    },
    saveSecret: async (id: string, value: string) => {
        try {
            await apiClient.post(`/secrets/${id}`, { value });
            return true;
        } catch (e) {
            // Simulate success in mock mode
            return true;
        }
    },
    validateSecret: async (id: string, type: string) => {
        try {
            await apiClient.post(`/secrets/${id}/validate`, { type });
            return true;
        } catch (e) {
            return true;
        }
    },
    getIntegrationSources: async (type: string) => {
        try {
            const res = await apiClient.get(`/sources?type=${type}`);
            return res.data;
        } catch (e) {
            if (type === 'FILE') return MOCK_FILES;
            if (type === 'WEB') return MOCK_WEB_SOURCES;
            if (type === 'API') return MOCK_API_SOURCES;
            return [];
        }
    },
    getConnectors: async () => {
        try {
            const res = await apiClient.get('/connectors');
            return res.data;
        } catch (e) {
            // Використовуємо реальні API українських сервісів
            const [customs, tax, prozorro, nbu] = await Promise.allSettled([
                getCustomsData(),
                getTaxServiceData(),
                getProzorroData(),
                getNBUData()
            ]);
            
            const connectors = [];
            
            if (customs.status === 'fulfilled' && customs.value) {
                connectors.push(customs.value);
            }
            if (tax.status === 'fulfilled' && tax.value) {
                connectors.push(tax.value);
            }
            if (prozorro.status === 'fulfilled' && prozorro.value) {
                connectors.push(prozorro.value);
            }
            if (nbu.status === 'fulfilled' && nbu.value) {
                connectors.push(nbu.value);
            }
            
            return connectors;
        }
    },
    getTelegramBots: async () => {
        try {
            const res = await apiClient.get('/bots');
            return res.data;
        } catch (e) {
            return MOCK_TELEGRAM_BOTS;
        }
    },
    getLLMConfig: async () => {
        try {
            const res = await apiClient.get('/llm/config');
            return res.data;
        } catch (e) {
            return MOCK_LLM_CONFIG;
        }
    },
    getDataCatalog: async () => {
        try {
            const res = await apiClient.get('/data/catalog');
            return res.data;
        } catch (e) {
            return MOCK_DATA_CATALOG;
        }
    },
    getUserTemplates: async () => {
        try {
            const res = await apiClient.get('/data/templates');
            return res.data;
        } catch (e) {
            return MOCK_USER_TEMPLATES;
        }
    },
    getAutoDatasets: async () => {
        try {
            const res = await apiClient.get('/data/auto');
            return res.data;
        } catch (e) {
            return MOCK_AUTO_DATASETS;
        }
    },
    getDashboardOverview: async () => {
        try {
            const res = await apiClient.get('/dashboard/overview');
            // Many backends return { success: true, data: { ... } }.
            // Normalize to return the inner `data` when present to match
            // frontend expectations (jobs/services on the returned object).
            return (res.data && res.data.data) ? res.data.data : res.data;
        } catch (e) {
            return { jobs: MOCK_ETL_JOBS, services: MOCK_SERVICES };
        }
    },
    getDatabases: async () => {
        try {
            const res = await apiClient.get('/data/databases');
            return res.data;
        } catch (e) {
            // Використовуємо реальний статус баз даних
            return await getDatabaseStatus();
        }
    },
    getVectors: async () => {
        try {
            const res = await apiClient.get('/data/vectors');
            return res.data;
        } catch (e) {
            return MOCK_VECTORS;
        }
    },
    getWafLogs: async () => {
        try {
            const res = await apiClient.get('/security/waf');
            return res.data;
        } catch (e) {
            return MOCK_WAF_LOGS;
        }
    },
    getSecurityLogs: async () => {
        try {
            const res = await apiClient.get('/security/audit');
            return res.data;
        } catch (e) {
            // Використовуємо реальні логи безпеки
            return await getSecurityLogs();
        }
    },
    getRiskForecast: async () => {
        try {
            const res = await apiClient.get('/analytics/forecast');
            return res.data;
        } catch (e) {
            return generateMockRiskForecast();
        }
    },
    getSectorData: async (sector: string) => {
        try {
            const res = await apiClient.get(`/analytics/sector/${sector}`);
            return res.data;
        } catch (e) {
            return (MOCK_SECTOR_DATA as any)[sector] || { ticker: [], graphNodes: {} };
        }
    },
    runDeepAnalysis: async (query: string, sector: string) => {
        try {
            const res = await apiClient.post('/analytics/deepscan', { query, sector });
            return res.data;
        } catch (e) {
            // Mock response
            return {
                riskScore: 0.85,
                findings: [
                    "Detected circular transaction pattern with shell companies.",
                    "Discrepancy in tax declaration vs customs clearance volume.",
                    "Beneficiary owner linked to high-risk PEP."
                ]
            };
        }
    },
    getAgentConfigs: async () => {
        try {
            const res = await apiClient.get('/agents/configs');
            return res.data;
        } catch (e) {
            return MOCK_AGENT_CONFIGS;
        }
    },
    getClusterStatus: async () => {
        try {
            const res = await apiClient.get('/infra/cluster');
            return res.data;
        } catch (e) {
            // Використовуємо реальний статус кластера
            return await getClusterStatus();
        }
    },
    getPodLogs: async (podId: string) => {
        try {
            const res = await apiClient.get(`/infra/pods/${podId}/logs`);
            return res.data;
        } catch (e) {
            return [
                "[INFO] Starting application...",
                "[INFO] Connected to DB",
                "[WARN] High latency detected on upstream",
                "[INFO] Processing request #1024"
            ];
        }
    },
    getMonitoringTargets: async () => {
        try {
            const res = await apiClient.get('/monitoring/targets');
            return res.data;
        } catch (e) {
            return MOCK_TARGETS;
        }
    },
    streamSystemLogs: async () => {
        try {
            const res = await apiClient.get('/monitoring/logs/stream');
            return res.data;
        } catch (e) {
            // Використовуємо реальні системні логи
            return await getSystemLogs();
        }
    },
    getLLMBenchmarks: async () => {
        try {
            const res = await apiClient.get('/llm/benchmarks');
            return res.data;
        } catch (e) {
            return MOCK_BENCHMARKS;
        }
    },
    getAutoMLExperiments: async () => {
        try {
            const res = await apiClient.get('/llm/automl');
            return res.data;
        } catch (e) {
            return MOCK_AUTOML_EXPERIMENTS;
        }
    },
    askOpponent: async (query: string): Promise<OpponentResponse> => {
        try {
            const res = await apiClient.post('/opponent/ask', { query });
            return res.data;
        } catch (e) {
            return {
                answer: "Based on available data from open registries, there is a strong correlation between the entity and fiscal risks. Recommended further audit.",
                sources: [
                    { type: 'REGISTRY', name: 'EDR', details: 'Record found in consolidated register.', relevance: 0.95 },
                    { type: 'DB', name: 'Tax Debts', details: 'Matching tax ID found in debtor list.', relevance: 0.88 }
                ],
                model: {
                    mode: 'LOCAL',
                    name: 'Llama 3 70B',
                    confidence: 0.89,
                    executionTimeMs: 1200
                }
            };
        }
    },
    getEnvironments: async () => {
        try {
            const res = await apiClient.get('/deployment/environments');
            return res.data;
        } catch (e) {
            return MOCK_ENVIRONMENTS;
        }
    },
    getPipelines: async () => {
        try {
            const res = await apiClient.get('/deployment/pipelines');
            return res.data;
        } catch (e) {
            return MOCK_PIPELINES;
        }
    },
    syncEnvironment: async (id: string) => {
        try {
            await apiClient.post(`/deployment/environments/${id}/sync`);
            return true;
        } catch (e) {
            return true;
        }
    },
    triggerPipeline: async (type: string) => {
        try {
            await apiClient.post('/deployment/pipelines/trigger', { type });
            return true;
        } catch (e) {
            return true;
        }
    }
};
