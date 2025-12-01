// Multi-Tenancy System for Predator Analytics
// Enterprise-grade multi-tenant architecture

import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class MultiTenancySystem extends EventEmitter {
    constructor() {
        super();
        this.tenants = new Map();
        this.tenantConfigs = new Map();
        this.tenantDatabases = new Map();
        this.tenantCaches = new Map();
        this.tenantMetrics = new Map();
        this.tenantAuditLogs = new Map();
        
        this.config = {
            enableTenantIsolation: true,
            enableTenantMetrics: true,
            enableTenantAuditLogging: true,
            enableTenantCaching: true,
            enableTenantDatabase: true,
            defaultTenantPlan: 'basic',
            tenantPlans: {
                basic: {
                    name: 'Basic',
                    maxUsers: 10,
                    maxAPIRequests: 10000,
                    maxStorage: 1024 * 1024 * 1024, // 1GB
                    features: ['dashboard', 'analytics', 'basic-monitoring']
                },
                professional: {
                    name: 'Professional',
                    maxUsers: 50,
                    maxAPIRequests: 100000,
                    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
                    features: ['dashboard', 'analytics', 'advanced-monitoring', 'api-access', 'custom-reports']
                },
                enterprise: {
                    name: 'Enterprise',
                    maxUsers: 1000,
                    maxAPIRequests: 1000000,
                    maxStorage: 100 * 1024 * 1024 * 1024, // 100GB
                    features: ['dashboard', 'analytics', 'advanced-monitoring', 'api-access', 'custom-reports', 'sso', 'advanced-security', 'priority-support']
                }
            },
            enableTenantThrottling: true,
            enableTenantQuotas: true,
            enableTenantFeatureFlags: true
        };
        
        this.initializeMultiTenancy();
    }

    initializeMultiTenancy() {
        console.log('🏢 Initializing Multi-Tenancy System...');
        
        // Load existing tenant data
        this.loadTenantData();
        
        // Start tenant metrics collection
        if (this.config.enableTenantMetrics) {
            this.startTenantMetricsCollection();
        }
        
        // Start tenant cleanup
        this.startTenantCleanup();
        
        console.log('✅ Multi-Tenancy System initialized');
    }

    // Tenant Management
    createTenant(tenantData) {
        const tenantId = this.generateTenantId();
        const tenant = {
            id: tenantId,
            name: tenantData.name,
            domain: tenantData.domain || `${tenantData.name.toLowerCase().replace(/\s+/g, '-')}.predator.analytics`,
            plan: tenantData.plan || this.config.defaultTenantPlan,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            settings: {
                timezone: tenantData.timezone || 'UTC',
                language: tenantData.language || 'en',
                theme: tenantData.theme || 'default',
                customBranding: tenantData.customBranding || {},
                notifications: tenantData.notifications || {},
                integrations: tenantData.integrations || {}
            },
            limits: this.getTenantLimits(tenantData.plan || this.config.defaultTenantPlan),
            usage: {
                users: 0,
                apiRequests: 0,
                storage: 0,
                lastReset: Date.now()
            },
            features: this.getTenantFeatures(tenantData.plan || this.config.defaultTenantPlan),
            metadata: {
                createdBy: tenantData.createdBy || 'system',
                tags: tenantData.tags || [],
                description: tenantData.description || ''
            }
        };
        
        // Initialize tenant resources
        this.initializeTenantResources(tenant);
        
        // Store tenant
        this.tenants.set(tenantId, tenant);
        
        // Create tenant configuration
        this.createTenantConfig(tenant);
        
        // Initialize tenant database
        if (this.config.enableTenantDatabase) {
            this.initializeTenantDatabase(tenant);
        }
        
        // Initialize tenant cache
        if (this.config.enableTenantCaching) {
            this.initializeTenantCache(tenant);
        }
        
        // Initialize tenant metrics
        if (this.config.enableTenantMetrics) {
            this.initializeTenantMetrics(tenant);
        }
        
        // Initialize tenant audit logs
        if (this.config.enableTenantAuditLogging) {
            this.initializeTenantAuditLogs(tenant);
        }
        
        this.emit('tenantCreated', tenant);
        
        console.log(`🏢 Tenant created: ${tenant.name} (${tenant.id})`);
        
        return tenant;
    }

    initializeTenantResources(tenant) {
        // Create tenant-specific directories
        const tenantDir = `./tenants/${tenant.id}`;
        
        // In production, this would create actual directories and resources
        console.log(`📁 Initializing resources for tenant: ${tenant.id}`);
    }

    createTenantConfig(tenant) {
        const config = {
            tenantId: tenant.id,
            database: {
                type: 'postgresql',
                host: `db-${tenant.id}.predator.analytics`,
                port: 5432,
                database: `tenant_${tenant.id}`,
                username: `tenant_${tenant.id}_user`,
                password: this.generateDatabasePassword(),
                pool: {
                    min: 2,
                    max: 10
                }
            },
            cache: {
                type: 'redis',
                host: `cache-${tenant.id}.predator.analytics`,
                port: 6379,
                db: 0,
                ttl: 3600
            },
            storage: {
                type: 's3',
                bucket: `predator-analytics-${tenant.id}`,
                region: 'us-east-1',
                accessKey: this.generateStorageKey(),
                secretKey: this.generateStorageSecret()
            },
            monitoring: {
                enabled: true,
                metrics: true,
                alerts: true,
                dashboards: true
            },
            security: {
                encryption: true,
                audit: true,
                rbac: true,
                mfa: tenant.plan === 'enterprise'
            },
            integrations: {
                prozorro: tenant.features.includes('api-access'),
                nbu: tenant.features.includes('api-access'),
                tax: tenant.features.includes('api-access'),
                customs: tenant.features.includes('api-access')
            }
        };
        
        this.tenantConfigs.set(tenant.id, config);
    }

    initializeTenantDatabase(tenant) {
        const database = {
            tenantId: tenant.id,
            connections: 0,
            maxConnections: 10,
            queries: 0,
            slowQueries: 0,
            errors: 0,
            lastBackup: Date.now(),
            size: 0,
            tables: ['users', 'analytics', 'reports', 'configurations']
        };
        
        this.tenantDatabases.set(tenant.id, database);
    }

    initializeTenantCache(tenant) {
        const cache = {
            tenantId: tenant.id,
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0,
            maxSize: 100 * 1024 * 1024, // 100MB
            keys: new Map(),
            ttl: 3600
        };
        
        this.tenantCaches.set(tenant.id, cache);
    }

    initializeTenantMetrics(tenant) {
        const metrics = {
            tenantId: tenant.id,
            apiRequests: {
                total: 0,
                success: 0,
                error: 0,
                avgResponseTime: 0,
                lastRequest: null
            },
            users: {
                total: 0,
                active: 0,
                concurrent: 0
            },
            storage: {
                used: 0,
                available: tenant.limits.maxStorage,
                lastCleanup: Date.now()
            },
            performance: {
                cpu: 0,
                memory: 0,
                disk: 0,
                network: 0
            },
            uptime: {
                started: Date.now(),
                total: 0,
                lastRestart: null
            },
            errors: {
                total: 0,
                critical: 0,
                warning: 0,
                info: 0
            }
        };
        
        this.tenantMetrics.set(tenant.id, metrics);
    }

    initializeTenantAuditLogs(tenant) {
        const auditLogs = {
            tenantId: tenant.id,
            logs: [],
            maxSize: 10000,
            retention: 90 * 24 * 60 * 60 * 1000, // 90 days
            lastCleanup: Date.now()
        };
        
        this.tenantAuditLogs.set(tenant.id, auditLogs);
    }

    // Tenant Operations
    getTenant(tenantId) {
        const tenant = this.tenants.get(tenantId);
        
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        
        // Update last activity
        tenant.updatedAt = Date.now();
        
        return tenant;
    }

    updateTenant(tenantId, updates) {
        const tenant = this.getTenant(tenantId);
        
        // Apply updates
        Object.assign(tenant, updates);
        tenant.updatedAt = Date.now();
        
        // Update tenant config if plan changed
        if (updates.plan && updates.plan !== tenant.plan) {
            tenant.limits = this.getTenantLimits(updates.plan);
            tenant.features = this.getTenantFeatures(updates.plan);
            this.updateTenantConfig(tenantId, updates.plan);
        }
        
        this.emit('tenantUpdated', tenant);
        
        console.log(`🏢 Tenant updated: ${tenant.name} (${tenant.id})`);
        
        return tenant;
    }

    deleteTenant(tenantId) {
        const tenant = this.getTenant(tenantId);
        
        // Clean up tenant resources
        this.cleanupTenantResources(tenantId);
        
        // Remove tenant from all collections
        this.tenants.delete(tenantId);
        this.tenantConfigs.delete(tenantId);
        this.tenantDatabases.delete(tenantId);
        this.tenantCaches.delete(tenantId);
        this.tenantMetrics.delete(tenantId);
        this.tenantAuditLogs.delete(tenantId);
        
        this.emit('tenantDeleted', tenant);
        
        console.log(`🏢 Tenant deleted: ${tenant.name} (${tenant.id})`);
        
        return true;
    }

    cleanupTenantResources(tenantId) {
        // In production, this would clean up actual resources
        console.log(`🧹 Cleaning up resources for tenant: ${tenantId}`);
    }

    updateTenantConfig(tenantId, plan) {
        const config = this.tenantConfigs.get(tenantId);
        const limits = this.getTenantLimits(plan);
        
        if (config) {
            // Update database pool size
            config.database.pool.max = Math.min(10, Math.max(2, limits.maxUsers / 10));
            
            // Update cache size
            config.cache.ttl = plan === 'enterprise' ? 7200 : 3600;
            
            // Update monitoring settings
            config.monitoring.dashboards = plan === 'enterprise';
            
            // Update security settings
            config.security.mfa = plan === 'enterprise';
        }
    }

    // Tenant User Management
    addTenantUser(tenantId, userData) {
        const tenant = this.getTenant(tenantId);
        
        // Check user limit
        if (tenant.usage.users >= tenant.limits.maxUsers) {
            throw new Error('User limit exceeded');
        }
        
        const user = {
            id: this.generateUserId(),
            tenantId: tenantId,
            username: userData.username,
            email: userData.email,
            roles: userData.roles || ['user'],
            permissions: userData.permissions || [],
            status: 'active',
            createdAt: Date.now(),
            lastLogin: null,
            metadata: userData.metadata || {}
        };
        
        // Update tenant usage
        tenant.usage.users++;
        
        // Update metrics
        const metrics = this.tenantMetrics.get(tenantId);
        if (metrics) {
            metrics.users.total++;
        }
        
        // Log audit event
        this.logTenantAuditEvent(tenantId, 'user_added', {
            userId: user.id,
            username: user.username,
            roles: user.roles
        });
        
        this.emit('tenantUserAdded', { tenant, user });
        
        return user;
    }

    removeTenantUser(tenantId, userId) {
        const tenant = this.getTenant(tenantId);
        
        // Update tenant usage
        if (tenant.usage.users > 0) {
            tenant.usage.users--;
        }
        
        // Update metrics
        const metrics = this.tenantMetrics.get(tenantId);
        if (metrics && metrics.users.total > 0) {
            metrics.users.total--;
        }
        
        // Log audit event
        this.logTenantAuditEvent(tenantId, 'user_removed', {
            userId: userId
        });
        
        this.emit('tenantUserRemoved', { tenantId, userId });
        
        return true;
    }

    // Tenant API Request Handling
    handleTenantAPIRequest(tenantId, request) {
        const tenant = this.getTenant(tenantId);
        
        // Check API request limit
        if (this.config.enableTenantQuotas && tenant.usage.apiRequests >= tenant.limits.maxAPIRequests) {
            throw new Error('API request limit exceeded');
        }
        
        // Check tenant status
        if (tenant.status !== 'active') {
            throw new Error('Tenant not active');
        }
        
        // Update usage
        tenant.usage.apiRequests++;
        
        // Update metrics
        const metrics = this.tenantMetrics.get(tenantId);
        if (metrics) {
            metrics.apiRequests.total++;
            metrics.apiRequests.lastRequest = Date.now();
        }
        
        // Check throttling
        if (this.config.enableTenantThrottling) {
            this.checkTenantThrottling(tenantId);
        }
        
        // Log audit event
        this.logTenantAuditEvent(tenantId, 'api_request', {
            endpoint: request.endpoint,
            method: request.method,
            userAgent: request.userAgent,
            ip: request.ip
        });
        
        return true;
    }

    checkTenantThrottling(tenantId) {
        const metrics = this.tenantMetrics.get(tenantId);
        
        if (!metrics) {
            return;
        }
        
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // Count requests in last minute
        const recentRequests = metrics.apiRequests.lastRequest > oneMinuteAgo ? 1 : 0;
        
        // Check if exceeding rate limit
        const rateLimit = this.getTenantRateLimit(tenantId);
        
        if (recentRequests > rateLimit) {
            throw new Error('Rate limit exceeded');
        }
    }

    getTenantRateLimit(tenantId) {
        const tenant = this.getTenant(tenantId);
        
        const rateLimits = {
            basic: 60, // 60 requests per minute
            professional: 300, // 300 requests per minute
            enterprise: 1000 // 1000 requests per minute
        };
        
        return rateLimits[tenant.plan] || rateLimits.basic;
    }

    // Tenant Cache Operations
    setTenantCache(tenantId, key, value, ttl = null) {
        if (!this.config.enableTenantCaching) {
            return false;
        }
        
        const cache = this.tenantCaches.get(tenantId);
        
        if (!cache) {
            return false;
        }
        
        const cacheKey = `${tenantId}:${key}`;
        const cacheValue = {
            value: value,
            ttl: ttl || cache.ttl,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl || cache.ttl) * 1000
        };
        
        cache.keys.set(cacheKey, cacheValue);
        cache.sets++;
        cache.size += JSON.stringify(value).length;
        
        // Log audit event
        this.logTenantAuditEvent(tenantId, 'cache_set', {
            key: key,
            ttl: ttl
        });
        
        return true;
    }

    getTenantCache(tenantId, key) {
        if (!this.config.enableTenantCaching) {
            return null;
        }
        
        const cache = this.tenantCaches.get(tenantId);
        
        if (!cache) {
            return null;
        }
        
        const cacheKey = `${tenantId}:${key}`;
        const cacheValue = cache.keys.get(cacheKey);
        
        if (!cacheValue) {
            cache.misses++;
            return null;
        }
        
        // Check if expired
        if (cacheValue.expiresAt < Date.now()) {
            cache.keys.delete(cacheKey);
            cache.misses++;
            return null;
        }
        
        cache.hits++;
        
        // Log audit event
        this.logTenantAuditEvent(tenantId, 'cache_get', {
            key: key,
            hit: true
        });
        
        return cacheValue.value;
    }

    deleteTenantCache(tenantId, key) {
        if (!this.config.enableTenantCaching) {
            return false;
        }
        
        const cache = this.tenantCaches.get(tenantId);
        
        if (!cache) {
            return false;
        }
        
        const cacheKey = `${tenantId}:${key}`;
        const deleted = cache.keys.delete(cacheKey);
        
        if (deleted) {
            cache.deletes++;
            
            // Log audit event
            this.logTenantAuditEvent(tenantId, 'cache_delete', {
                key: key
            });
        }
        
        return deleted;
    }

    // Tenant Metrics
    getTenantMetrics(tenantId) {
        const metrics = this.tenantMetrics.get(tenantId);
        
        if (!metrics) {
            throw new Error('Tenant metrics not found');
        }
        
        return {
            ...metrics,
            calculated: {
                apiSuccessRate: metrics.apiRequests.total > 0 ? 
                    (metrics.apiRequests.success / metrics.apiRequests.total) * 100 : 0,
                cacheHitRate: (cache.hits + cache.misses) > 0 ? 
                    (cache.hits / (cache.hits + cache.misses)) * 100 : 0,
                storageUtilization: (metrics.storage.used / metrics.storage.available) * 100,
                uptime: Date.now() - metrics.uptime.started
            }
        };
    }

    updateTenantMetrics(tenantId, updates) {
        const metrics = this.tenantMetrics.get(tenantId);
        
        if (!metrics) {
            return;
        }
        
        Object.assign(metrics, updates);
        
        // Emit metrics update event
        this.emit('tenantMetricsUpdated', { tenantId, metrics, updates });
    }

    // Tenant Audit Logging
    logTenantAuditEvent(tenantId, event, data) {
        if (!this.config.enableTenantAuditLogging) {
            return;
        }
        
        const auditLogs = this.tenantAuditLogs.get(tenantId);
        
        if (!auditLogs) {
            return;
        }
        
        const logEntry = {
            id: this.generateLogId(),
            timestamp: Date.now(),
            event: event,
            data: data,
            severity: this.getEventSeverity(event),
            userId: data.userId || null,
            sessionId: data.sessionId || null,
            ipAddress: data.ip || null,
            userAgent: data.userAgent || null
        };
        
        auditLogs.logs.push(logEntry);
        
        // Keep only recent logs
        if (auditLogs.logs.length > auditLogs.maxSize) {
            auditLogs.logs = auditLogs.logs.slice(-auditLogs.maxSize / 2);
        }
        
        // Emit audit event
        this.emit('tenantAuditEvent', { tenantId, logEntry });
    }

    getTenantAuditLogs(tenantId, limit = 100) {
        const auditLogs = this.tenantAuditLogs.get(tenantId);
        
        if (!auditLogs) {
            return [];
        }
        
        return auditLogs.logs.slice(-limit);
    }

    // Utility Methods
    generateTenantId() {
        return 'tenant_' + randomBytes(8).toString('hex');
    }

    generateUserId() {
        return 'user_' + randomBytes(8).toString('hex');
    }

    generateLogId() {
        return 'log_' + randomBytes(8).toString('hex');
    }

    generateDatabasePassword() {
        return randomBytes(16).toString('hex');
    }

    generateStorageKey() {
        return randomBytes(16).toString('hex');
    }

    generateStorageSecret() {
        return randomBytes(32).toString('hex');
    }

    getTenantLimits(plan) {
        return this.config.tenantPlans[plan] || this.config.tenantPlans[this.config.defaultTenantPlan];
    }

    getTenantFeatures(plan) {
        const planConfig = this.config.tenantPlans[plan] || this.config.tenantPlans[this.config.defaultTenantPlan];
        return planConfig.features || [];
    }

    getEventSeverity(event) {
        const severityMap = {
            'user_added': 'info',
            'user_removed': 'warning',
            'api_request': 'info',
            'cache_set': 'info',
            'cache_get': 'info',
            'cache_delete': 'info',
            'tenant_created': 'info',
            'tenant_updated': 'info',
            'tenant_deleted': 'critical',
            'security_breach': 'critical',
            'quota_exceeded': 'warning',
            'rate_limit_exceeded': 'warning'
        };
        
        return severityMap[event] || 'info';
    }

    // System Operations
    startTenantMetricsCollection() {
        setInterval(() => {
            this.collectTenantMetrics();
        }, 60000); // Every minute
    }

    collectTenantMetrics() {
        for (const [tenantId, tenant] of this.tenants.entries()) {
            const metrics = this.tenantMetrics.get(tenantId);
            
            if (!metrics) {
                continue;
            }
            
            // Update performance metrics (simulated)
            metrics.performance = {
                cpu: Math.random() * 100,
                memory: Math.random() * 100,
                disk: Math.random() * 100,
                network: Math.random() * 100
            };
            
            // Update uptime
            metrics.uptime.total = Date.now() - metrics.uptime.started;
            
            // Update storage usage
            metrics.storage.used = tenant.usage.storage;
            
            // Update active users (simulated)
            metrics.users.active = Math.floor(Math.random() * tenant.usage.users);
            metrics.users.concurrent = Math.floor(Math.random() * metrics.users.active);
            
            this.emit('tenantMetricsCollected', { tenantId, metrics });
        }
    }

    startTenantCleanup() {
        setInterval(() => {
            this.cleanupExpiredData();
        }, 3600000); // Every hour
    }

    cleanupExpiredData() {
        const now = Date.now();
        
        // Clean up expired cache entries
        for (const [tenantId, cache] of this.tenantCaches.entries()) {
            let cleanedCount = 0;
            
            for (const [key, value] of cache.keys.entries()) {
                if (value.expiresAt < now) {
                    cache.keys.delete(key);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                this.logTenantAuditEvent(tenantId, 'cache_cleanup', {
                    cleanedEntries: cleanedCount
                });
            }
        }
        
        // Clean up old audit logs
        for (const [tenantId, auditLogs] of this.tenantAuditLogs.entries()) {
            const cutoff = now - auditLogs.retention;
            const originalLength = auditLogs.logs.length;
            
            auditLogs.logs = auditLogs.logs.filter(log => log.timestamp > cutoff);
            
            const cleanedCount = originalLength - auditLogs.logs.length;
            
            if (cleanedCount > 0) {
                this.logTenantAuditEvent(tenantId, 'audit_cleanup', {
                    cleanedEntries: cleanedCount
                });
            }
        }
    }

    // Persistence
    saveTenantData() {
        try {
            const data = {
                tenants: Array.from(this.tenants.entries()),
                tenantConfigs: Array.from(this.tenantConfigs.entries()),
                tenantMetrics: Array.from(this.tenantMetrics.entries()),
                auditLogs: Array.from(this.tenantAuditLogs.entries()).map(([id, logs]) => [id, logs.logs.slice(-1000)]),
                config: this.config,
                timestamp: Date.now()
            };
            
            writeFileSync('./multi-tenancy-data.json', JSON.stringify(data, null, 2));
            console.log('💾 Multi-tenancy data saved to file');
        } catch (error) {
            console.error('Error saving multi-tenancy data:', error);
        }
    }

    loadTenantData() {
        try {
            if (existsSync('./multi-tenancy-data.json')) {
                const data = JSON.parse(readFileSync('./multi-tenancy-data.json', 'utf8'));
                
                this.tenants = new Map(data.tenants || []);
                this.tenantConfigs = new Map(data.tenantConfigs || []);
                this.tenantMetrics = new Map(data.tenantMetrics || []);
                
                // Load audit logs
                if (data.auditLogs) {
                    data.auditLogs.forEach(([tenantId, logs]) => {
                        const auditLogs = this.tenantAuditLogs.get(tenantId) || { logs: [] };
                        auditLogs.logs = logs;
                        this.tenantAuditLogs.set(tenantId, auditLogs);
                    });
                }
                
                console.log('📂 Multi-tenancy data loaded from file');
            } else {
                // Create default tenant
                this.createDefaultTenant();
            }
        } catch (error) {
            console.error('Error loading multi-tenancy data:', error);
            this.createDefaultTenant();
        }
    }

    createDefaultTenant() {
        const defaultTenant = this.createTenant({
            name: 'Predator Analytics Demo',
            domain: 'demo.predator.analytics',
            plan: 'professional',
            timezone: 'UTC',
            language: 'en',
            description: 'Default demo tenant for Predator Analytics'
        });
        
        // Add demo user
        this.addTenantUser(defaultTenant.id, {
            username: 'demo',
            email: 'demo@predator.analytics',
            roles: ['admin'],
            permissions: ['*:*']
        });
        
        console.log('👥 Created default tenant and user');
    }

    // Public API Methods
    getMultiTenancyStatus() {
        return {
            totalTenants: this.tenants.size,
            activeTenants: Array.from(this.tenants.values()).filter(t => t.status === 'active').length,
            tenantPlans: Object.keys(this.config.tenantPlans),
            totalUsers: Array.from(this.tenants.values()).reduce((sum, t) => sum + t.usage.users, 0),
            totalAPIRequests: Array.from(this.tenants.values()).reduce((sum, t) => sum + t.usage.apiRequests, 0),
            totalStorage: Array.from(this.tenants.values()).reduce((sum, t) => sum + t.usage.storage, 0),
            config: this.config
        };
    }

    getTenantList() {
        return Array.from(this.tenants.values()).map(tenant => ({
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            plan: tenant.plan,
            status: tenant.status,
            createdAt: tenant.createdAt,
            users: tenant.usage.users,
            apiRequests: tenant.usage.apiRequests,
            storage: tenant.usage.storage
        }));
    }

    getTenantUsage(tenantId) {
        const tenant = this.getTenant(tenantId);
        const metrics = this.tenantMetrics.get(tenantId);
        
        return {
            tenant: {
                id: tenant.id,
                name: tenant.name,
                plan: tenant.plan
            },
            usage: tenant.usage,
            limits: tenant.limits,
            utilization: {
                users: (tenant.usage.users / tenant.limits.maxUsers) * 100,
                apiRequests: (tenant.usage.apiRequests / tenant.limits.maxAPIRequests) * 100,
                storage: (tenant.usage.storage / tenant.limits.maxStorage) * 100
            },
            metrics: metrics || null
        };
    }

    shutdown() {
        console.log('🔄 Shutting down Multi-Tenancy System...');
        
        // Save tenant data
        this.saveTenantData();
        
        console.log('✅ Multi-Tenancy System shutdown complete');
    }
}

// Run multi-tenancy system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const multiTenancy = new MultiTenancySystem();
    
    // Demo tenant operations
    console.log('🏢 Demo Multi-Tenancy Operations:');
    
    try {
        // Create a new tenant
        console.log('\n1. Creating new tenant...');
        const newTenant = multiTenancy.createTenant({
            name: 'Acme Corporation',
            domain: 'acme.predator.analytics',
            plan: 'enterprise',
            timezone: 'America/New_York',
            language: 'en',
            description: 'Acme Corporation Analytics Platform'
        });
        console.log('Tenant created:', newTenant.name, '(', newTenant.id, ')');
        
        // Add users to tenant
        console.log('\n2. Adding users to tenant...');
        const user1 = multiTenancy.addTenantUser(newTenant.id, {
            username: 'john.doe',
            email: 'john.doe@acme.com',
            roles: ['admin'],
            permissions: ['*:*']
        });
        console.log('User added:', user1.username);
        
        const user2 = multiTenancy.addTenantUser(newTenant.id, {
            username: 'jane.smith',
            email: 'jane.smith@acme.com',
            roles: ['analyst'],
            permissions: ['analytics:read', 'dashboard:read']
        });
        console.log('User added:', user2.username);
        
        // Handle API requests
        console.log('\n3. Handling API requests...');
        for (let i = 0; i < 10; i++) {
            multiTenancy.handleTenantAPIRequest(newTenant.id, {
                endpoint: '/api/v1/analytics',
                method: 'GET',
                userAgent: 'Predator Analytics Client',
                ip: '192.168.1.100'
            });
        }
        console.log('API requests handled:', newTenant.usage.apiRequests);
        
        // Cache operations
        console.log('\n4. Testing cache operations...');
        multiTenancy.setTenantCache(newTenant.id, 'test-key', { data: 'test-value' }, 3600);
        const cachedValue = multiTenancy.getTenantCache(newTenant.id, 'test-key');
        console.log('Cache value:', cachedValue);
        
        // Get tenant metrics
        console.log('\n5. Getting tenant metrics...');
        const metrics = multiTenancy.getTenantMetrics(newTenant.id);
        console.log('API requests:', metrics.apiRequests.total);
        console.log('Users:', metrics.users.total);
        
        // Get tenant usage
        console.log('\n6. Getting tenant usage...');
        const usage = multiTenancy.getTenantUsage(newTenant.id);
        console.log('Users utilization:', usage.utilization.users.toFixed(2) + '%');
        console.log('API requests utilization:', usage.utilization.apiRequests.toFixed(2) + '%');
        
        // Get audit logs
        console.log('\n7. Getting audit logs...');
        const auditLogs = multiTenancy.getTenantAuditLogs(newTenant.id, 5);
        console.log('Recent audit events:', auditLogs.length);
        
        // Display system status
        console.log('\n🏢 Multi-Tenancy System Status:');
        const status = multiTenancy.getMultiTenancyStatus();
        console.log('Total tenants:', status.totalTenants);
        console.log('Active tenants:', status.activeTenants);
        console.log('Total users:', status.totalUsers);
        console.log('Total API requests:', status.totalAPIRequests);
        
        // List all tenants
        console.log('\n📋 All Tenants:');
        const tenants = multiTenancy.getTenantList();
        tenants.forEach(tenant => {
            console.log(`- ${tenant.name} (${tenant.plan}) - ${tenant.users} users, ${tenant.apiRequests} requests`);
        });
        
    } catch (error) {
        console.error('Demo error:', error.message);
    }
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        multiTenancy.shutdown();
        process.exit(0);
    });
    
    console.log('\n🎊 Multi-Tenancy System started!');
    console.log('🏢 Enterprise multi-tenant architecture ready...');
}

export default MultiTenancySystem;
