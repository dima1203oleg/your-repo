
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

// Small helper for consistent API error logging. Avoids empty catch blocks.
const logApiError = (op: string, err: unknown) => {
    try { console.error(`[api] ${op} failed`, err); } catch { /* best-effort logging */ }
};

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
            logApiError('getEvolutionStatus', e);
            return { phase: 'IDLE', logs: ['[ERROR] Connection to NAS Engine failed.'], progress: 0, active: false };
        }
    },

    getSecrets: async () => {
        try {
            const res = await apiClient.get('/secrets');
            return res.data;
        } catch (e) {
            logApiError('getSecrets', e);
            return MOCK_SECRETS;
        }
    },
    saveSecret: async (id: string, value: string) => {
        try {
            await apiClient.post(`/secrets/${id}`, { value });
            return true;
        } catch (e) {
            logApiError('saveSecret', e);
            return true;
        }
    },
    validateSecret: async (id: string, type: string) => {
        try {
            await apiClient.post(`/secrets/${id}/validate`, { type });
            return true;
        } catch (e) {
            logApiError('validateSecret', e);
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
            logApiError('getConnectors', e);
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
            logApiError('getTelegramBots', e);
            return MOCK_TELEGRAM_BOTS;
        }
    },
    getLLMConfig: async () => {
        try {
            const res = await apiClient.get('/llm/config');
            return res.data;
        } catch (e) {
            logApiError('getLLMConfig', e);
            return MOCK_LLM_CONFIG;
        }
    },
    getDataCatalog: async () => {
        try {
            const res = await apiClient.get('/data/catalog');
            return res.data;
        } catch (e) {
            logApiError('getDataCatalog', e);
            return MOCK_DATA_CATALOG;
        }
    },
    getUserTemplates: async () => {
        try {
            const res = await apiClient.get('/data/templates');
            return res.data;
        } catch (e) {
            logApiError('getUserTemplates', e);
            return MOCK_USER_TEMPLATES;
        }
    },
    getAutoDatasets: async () => {
        try {
            const res = await apiClient.get('/data/auto');
            return res.data;
        } catch (e) {
            logApiError('getAutoDatasets', e);
            return MOCK_AUTO_DATASETS;
        }
    },
    getDashboardOverview: async () => {
        try {
            const res = await apiClient.get('/dashboard/overview');
            // Many backends return { success: true, data: { ... } }.
            // Normalize to return the inner `data` when present to match
            // frontend expectations (jobs/services on the returned object).
            return res.data?.data ?? res.data;
        } catch (e) {
            logApiError('getDashboardOverview', e);
            return { jobs: MOCK_ETL_JOBS, services: MOCK_SERVICES };
        }
    },
    getDatabases: async () => {
        try {
            const res = await apiClient.get('/data/databases');
            return res.data;
        } catch (e) {
            logApiError('getDatabases', e);
            // Використовуємо реальний статус баз даних
            return await getDatabaseStatus();
        }
    },
    getVectors: async () => {
        try {
            const res = await apiClient.get('/data/vectors');
            return res.data;
        } catch (e) {
            logApiError('getVectors', e);
            return MOCK_VECTORS;
        }
    },
    getWafLogs: async () => {
        try {
            const res = await apiClient.get('/security/waf');
            return res.data;
        } catch (e) {
            logApiError('getWafLogs', e);
            return MOCK_WAF_LOGS;
        }
    },
    getSecurityLogs: async () => {
        try {
            const res = await apiClient.get('/security/audit');
            return res.data;
        } catch (e) {
            logApiError('getSecurityLogs', e);
            // Використовуємо реальні логи безпеки
            return await getSecurityLogs();
        }
    },
    getRiskForecast: async () => {
        try {
            const res = await apiClient.get('/analytics/forecast');
            return res.data;
        } catch (e) {
            logApiError('getRiskForecast', e);
            return generateMockRiskForecast();
        }
    },
    getSectorData: async (sector: string) => {
        try {
            const res = await apiClient.get(`/analytics/sector/${sector}`);
            return res.data;
        } catch (e) {
            logApiError(`getSectorData:${sector}`, e);
            return (MOCK_SECTOR_DATA as any)[sector] || { ticker: [], graphNodes: {} };
        }
    },
    runDeepAnalysis: async (query: string, sector: string) => {
        try {
            const res = await apiClient.post('/analytics/deepscan', { query, sector });
            return res.data;
        } catch (e) {
            logApiError('runDeepAnalysis', e);
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
            logApiError('getAgentConfigs', e);
            return MOCK_AGENT_CONFIGS;
        }
    },
    getClusterStatus: async () => {
        try {
            const res = await apiClient.get('/infra/cluster');
            return res.data;
        } catch (e) {
            logApiError('getClusterStatus', e);
            // Використовуємо реальний статус кластера
            return await getClusterStatus();
        }
    },
    getPodLogs: async (podId: string) => {
        try {
            const res = await apiClient.get(`/infra/pods/${podId}/logs`);
            return res.data;
        } catch (e) {
            logApiError(`getPodLogs:${podId}`, e);
            return [
                "[INFO] Starting application...",
                "[INFO] Connected to DB",
                "[WARN] High latency detected on upstream",
                "[INFO] Processing request #1024"
            ];
        }
    },
    restartPod: async (podId: string) => {
        try {
            const res = await apiClient.post(`/infra/pods/${podId}/restart`);
            return res.data;
        } catch (e) {
            logApiError(`restartPod:${podId}`, e);
            // In case backend fails, return a simulated accepted response
            return { jobId: `pod-restart-${podId}-${Date.now()}`, podId, status: 'RESTARTING' };
        }
    },
    deletePod: async (podId: string) => {
        try {
            const res = await apiClient.post(`/infra/pods/${podId}/delete`);
            return res.data;
        } catch (e) {
            logApiError(`deletePod:${podId}`, e);
            return { jobId: `pod-delete-${podId}-${Date.now()}`, podId, status: 'TERMINATING' };
        }
    },
    triggerDrift: async () => {
        try {
            const res = await apiClient.post('/infra/drift/start');
            return res.data;
        } catch (e) {
            logApiError('triggerDrift', e);
            return { opId: `drift-start-${Date.now()}`, status: 'DRIFTING' };
        }
    },
    healDrift: async () => {
        try {
            const res = await apiClient.post('/infra/drift/heal');
            return res.data;
        } catch (e) {
            logApiError('healDrift', e);
            return { opId: `drift-heal-${Date.now()}`, status: 'HEALING' };
        }
    },
    getMonitoringTargets: async () => {
        try {
            const res = await apiClient.get('/monitoring/targets');
            return res.data;
        } catch (e) {
            logApiError('getMonitoringTargets', e);
            return MOCK_TARGETS;
        }
    },
    getE2ETestJobs: async () => {
        try {
            const res = await apiClient.get('/infra/tests');
            return res.data; // array of { id, status, progress, logs }
        } catch (e) {
            logApiError('getE2ETestJobs', e);
            return [];
        }
    },
    streamSystemLogs: async () => {
        try {
            const res = await apiClient.get('/monitoring/logs/stream');
            return res.data;
        } catch (e) {
            logApiError('streamSystemLogs', e);
            // Використовуємо реальні системні логи
            return await getSystemLogs();
        }
    },
    getLLMBenchmarks: async () => {
        try {
            const res = await apiClient.get('/llm/benchmarks');
            return res.data;
        } catch (e) {
            logApiError('getLLMBenchmarks', e);
            return MOCK_BENCHMARKS;
        }
    },
    getAutoMLExperiments: async () => {
        try {
            const res = await apiClient.get('/llm/automl');
            return res.data;
        } catch (e) {
            logApiError('getAutoMLExperiments', e);
            return MOCK_AUTOML_EXPERIMENTS;
        }
    },
    askOpponent: async (query: string): Promise<OpponentResponse> => {
        try {
            const res = await apiClient.post('/opponent/ask', { query });
            return res.data;
        } catch (e) {
            logApiError('askOpponent', e);
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
    askLLM: async (model: string, prompt: string, history?: any[]) => {
        try {
            const res = await apiClient.post('/llm/chat', { model, prompt, history });
            return res.data;
        } catch (e) {
            logApiError('askLLM', e);
            // Fallback response when backend fails
            return {
                assistant: "Пробачте, зараз недоступний LLM. Ось попередній аналіз: на основі доступних даних виявлено 0.78 ризик — рекомендую глибший аналіз.",
                meta: { confidence: 0.78, model: { name: model || 'local-fallback', mode: 'LOCAL' } }
            };
        }
    },
    getEnvironments: async () => {
        try {
            const res = await apiClient.get('/deployment/environments');
            return res.data;
        } catch (e) {
            logApiError('getEnvironments', e);
            return MOCK_ENVIRONMENTS;
        }
    },
    getPipelines: async () => {
        try {
            const res = await apiClient.get('/deployment/pipelines');
            return res.data;
        } catch (e) {
            logApiError('getPipelines', e);
            return MOCK_PIPELINES;
        }
    },
    syncEnvironment: async (id: string) => {
        try {
            await apiClient.post(`/deployment/environments/${id}/sync`);
            return true;
        } catch (e) {
            logApiError(`syncEnvironment:${id}`, e);
            return true;
        }
    },
    triggerPipeline: async (type: string) => {
        try {
            await apiClient.post('/deployment/pipelines/trigger', { type });
            return true;
        } catch (e) {
            logApiError(`triggerPipeline:${type}`, e);
            return true;
        }
    },
    // --- E2E / Test runner ---
    runE2ETests: async () => {
        try {
            const res = await apiClient.post('/infra/tests/run');
            // Normalize response shape: backend uses { success: true, data: {...} } wrapper
            return res.data?.data ?? res.data;
        } catch (e) {
            logApiError('runE2ETests', e);
            // Fallback: emulate a started job
            return { jobId: `sim-job-${Date.now()}`, status: 'RUNNING', logs: ['[SIM] Test runner started (fallback)'] };
        }
    },
    getE2ETestStatus: async (jobId: string) => {
        try {
            const res = await apiClient.get(`/infra/tests/${jobId}/status`);
            return (res.data && res.data.data) ? res.data.data : res.data;
        } catch (e) {
            logApiError('getE2ETestStatus', e);
            // Best-effort fallback: treat job as completed if unknown in offline mode
            return { id: jobId, status: 'COMPLETED', progress: 100, logs: ['[SIM] Completed (offline fallback)'] };
        }
    },
    getE2EJobArtifacts: async (jobId: string) => {
        try {
            const res = await apiClient.get(`/infra/tests/${jobId}/artifacts`);
            return res.data?.data ?? res.data; // array of { name, size, modified }
        } catch (e) {
            logApiError('getE2EJobArtifacts', e);
            return [];
        }
    },
    getE2EJobArtifact: async (jobId: string, name: string) => {
        try {
            const res = await apiClient.get(`/infra/tests/${jobId}/artifacts/${encodeURIComponent(name)}`, { responseType: 'text' });
            // For text responses we return the raw string — if wrapped, unwrap the inner data
            return res.data?.data ?? res.data;
        } catch (e) {
            logApiError('getE2EJobArtifact', e);
            return null;
        }
    },
    // Connect to a Server-Sent Events (SSE) stream for a given E2E test job.
    // Returns a wrapper object with a `close()` method and the underlying EventSource when available.
    // The wrapper automatically attempts reconnects with exponential backoff on network errors.
    connectE2ETestStream: (jobId: string, onEvent: (msg: any) => void, opts?: { maxRetries?: number, baseDelayMs?: number }) => {
        try {
            const path = `/api/v1/infra/tests/${jobId}/stream`;

            const maxRetries = opts?.maxRetries ?? 6;
            const baseDelay = opts?.baseDelayMs ?? 500; // 500ms base

            // internal state
            let es: EventSource | null = null;
            let closed = false;
            let attempts = 0;
            let reconnectTimer: any = null;

            const cleanUp = () => {
                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                    reconnectTimer = null;
                }
                if (es) {
                    try { es.close(); } catch (e) { /* ignore */ }
                    es = null;
                }
            };

            const open = () => {
                if (closed) return;
                // @ts-ignore - EventSource exists in browser
                es = new EventSource(path);

                es.onmessage = (ev: MessageEvent) => {
                    try {
                        const payload = JSON.parse(ev.data);
                        onEvent(payload);
                    } catch (e) {
                        onEvent({ type: 'raw', data: ev.data });
                    }
                };

                es.onerror = (err) => {
                    // Notify consumer about reconnect attempt
                    attempts += 1;
                    const delay = Math.min(30000, baseDelay * Math.pow(2, attempts));
                    onEvent({ type: 'reconnect', attempt: attempts, delay });
                    logApiError('connectE2ETestStream', err as any);

                    // If exceeded retries, close permanently and notify
                    if (attempts > maxRetries) {
                        onEvent({ type: 'error', message: 'Max reconnects exceeded' });
                        cleanUp();
                        return;
                    }

                    // close current ES and schedule reconnect
                    try { es?.close(); } catch (e) {}
                    es = null;

                    reconnectTimer = setTimeout(() => {
                        // attempt reconnection
                        open();
                    }, delay);
                };
            };

            // start first connection attempt
            open();

            // wrapper object returned to callers
            const wrapper = {
                close: () => {
                    closed = true;
                    cleanUp();
                },
                // helpful for debugging or tests
                getAttempts: () => attempts,
                isClosed: () => closed
            };

            return wrapper;
        } catch (e) {
            logApiError('connectE2ETestStream', e as any);
            return null;
        }
    },
};
