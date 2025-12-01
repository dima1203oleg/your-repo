// Comprehensive Logging and Audit System for Predator Analytics
// Advanced logging, monitoring, and security auditing

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, statSync, renameSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { hostname } from 'os';

class LoggingAuditSystem {
    constructor() {
        this.config = {
            logDir: './logs',
            auditDir: './logs/audit',
            retentionDays: 30,
            logLevels: ['ERROR', 'WARN', 'INFO', 'DEBUG'],
            auditEvents: ['LOGIN', 'LOGOUT', 'API_ACCESS', 'DATA_ACCESS', 'CONFIG_CHANGE', 'SECURITY_EVENT'],
            maxLogSize: 10 * 1024 * 1024, // 10MB
            enableFileLogging: true,
            enableConsoleLogging: true,
            enableAuditTrail: true
        };
        
        this.ensureLogDirectories();
        this.initializeLogger();
    }

    ensureLogDirectories() {
        const directories = [
            this.config.logDir,
            this.config.auditDir,
            `${this.config.logDir}/app`,
            `${this.config.logDir}/api`,
            `${this.config.logDir}/security`,
            `${this.config.logDir}/performance`
        ];
        
        directories.forEach(dir => {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
        });
    }

    initializeLogger() {
        this.loggers = {
            app: new Logger('app', this.config),
            api: new Logger('api', this.config),
            security: new Logger('security', this.config),
            performance: new Logger('performance', this.config),
            audit: new AuditLogger('audit', this.config)
        };
    }

    async logEvent(category, level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category,
            message,
            metadata,
            pid: process.pid,
            hostname: hostname()
        };
        
        if (this.loggers[category]) {
            await this.loggers[category].log(level, message, metadata);
        } else {
            await this.loggers.app.log(level, message, metadata);
        }
        
        return logEntry;
    }

    async auditEvent(eventType, userId, action, resource, details = {}) {
        if (!this.config.enableAuditTrail) return;
        
        const timestamp = new Date().toISOString();
        const auditEntry = {
            timestamp,
            eventType,
            userId: userId || 'anonymous',
            action,
            resource,
            details,
            ip: details.ip || 'unknown',
            userAgent: details.userAgent || 'unknown',
            sessionId: details.sessionId || 'unknown',
            pid: process.pid,
            hostname: hostname()
        };
        
        await this.loggers.audit.audit(eventType, auditEntry);
        return auditEntry;
    }

    async logApiAccess(req, res, responseTime) {
        const metadata = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            responseTime: responseTime,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress,
            userId: req.user?.id || 'anonymous'
        };
        
        const level = res.statusCode >= 400 ? 'WARN' : 'INFO';
        await this.logEvent('api', level, `API ${req.method} ${req.originalUrl}`, metadata);
        
        // Audit sensitive API calls
        if (req.originalUrl.includes('/admin') || req.originalUrl.includes('/config')) {
            await this.auditEvent('API_ACCESS', metadata.userId, req.method, req.originalUrl, metadata);
        }
    }

    async logSecurityEvent(eventType, severity, details) {
        const metadata = {
            severity,
            ...details
        };
        
        await this.logEvent('security', 'ERROR', `Security Event: ${eventType}`, metadata);
        await this.auditEvent('SECURITY_EVENT', 'system', eventType, 'security', details);
    }

    async logPerformance(operation, duration, metadata = {}) {
        const logData = {
            operation,
            duration,
            ...metadata
        };
        
        const level = duration > 1000 ? 'WARN' : 'INFO';
        await this.logEvent('performance', level, `Performance: ${operation} (${duration}ms)`, logData);
    }

    async generateLogReport() {
        console.log('\n📊 LOGGING AND AUDIT REPORT');
        console.log('=' .repeat(60));
        
        const report = {
            logFiles: this.analyzeLogFiles(),
            auditEvents: this.analyzeAuditEvents(),
            securityEvents: this.analyzeSecurityEvents(),
            performanceMetrics: this.analyzePerformanceMetrics(),
            systemHealth: this.analyzeSystemHealth()
        };
        
        this.displayReport(report);
        return report;
    }

    analyzeLogFiles() {
        const logCategories = ['app', 'api', 'security', 'performance'];
        const analysis = {};
        
        logCategories.forEach(category => {
            const logDir = join(this.config.logDir, category);
            if (existsSync(logDir)) {
                try {
                    const files = execSync(`ls -la ${logDir}/*.log 2>/dev/null || echo "No files"`, { encoding: 'utf8' });
                    const logFiles = files.trim().split('\n').filter(f => f && f !== 'No files');
                    
                    let totalSize = 0;
                    let totalEntries = 0;
                    
                    logFiles.forEach(file => {
                        const parts = file.trim().split(/\s+/);
                        if (parts.length >= 5) {
                            totalSize += parseInt(parts[4]) || 0;
                        }
                    });
                    
                    // Count log entries (approximate)
                    logFiles.forEach(file => {
                        const filePath = file.trim().split(/\s+/).pop();
                        if (existsSync(filePath)) {
                            try {
                                const content = readFileSync(filePath, 'utf8');
                                totalEntries += (content.match(/\n/g) || []).length;
                            } catch (error) {
                                // File might be binary or corrupted
                            }
                        }
                    });
                    
                    analysis[category] = {
                        fileCount: logFiles.length,
                        totalSize: totalSize,
                        totalEntries: totalEntries,
                        sizeMB: (totalSize / 1024 / 1024).toFixed(2)
                    };
                } catch (error) {
                    analysis[category] = { error: error.message };
                }
            } else {
                analysis[category] = { fileCount: 0, totalSize: 0, totalEntries: 0, sizeMB: '0.00' };
            }
        });
        
        return analysis;
    }

    analyzeAuditEvents() {
        const auditLogPath = join(this.config.auditDir, 'audit.log');
        
        if (!existsSync(auditLogPath)) {
            return { totalEvents: 0, eventTypes: {}, recentEvents: [] };
        }
        
        try {
            const content = readFileSync(auditLogPath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            const eventTypes = {};
            const recentEvents = [];
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            lines.forEach(line => {
                try {
                    const event = JSON.parse(line);
                    eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
                    
                    if (new Date(event.timestamp) > oneHourAgo && recentEvents.length < 10) {
                        recentEvents.push({
                            timestamp: event.timestamp,
                            eventType: event.eventType,
                            userId: event.userId,
                            action: event.action
                        });
                    }
                } catch (error) {
                    // Invalid JSON line
                }
            });
            
            return {
                totalEvents: lines.length,
                eventTypes,
                recentEvents
            };
        } catch (error) {
            return { totalEvents: 0, eventTypes: {}, recentEvents: [], error: error.message };
        }
    }

    analyzeSecurityEvents() {
        const securityLogPath = join(this.config.logDir, 'security', 'security.log');
        
        if (!existsSync(securityLogPath)) {
            return { totalEvents: 0, severityLevels: {}, recentThreats: [] };
        }
        
        try {
            const content = readFileSync(securityLogPath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            const severityLevels = {};
            const recentThreats = [];
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            lines.forEach(line => {
                try {
                    const logEntry = JSON.parse(line);
                    if (logEntry.metadata && logEntry.metadata.severity) {
                        const severity = logEntry.metadata.severity;
                        severityLevels[severity] = (severityLevels[severity] || 0) + 1;
                    }
                    
                    if (new Date(logEntry.timestamp) > twentyFourHoursAgo && recentThreats.length < 5) {
                        recentThreats.push({
                            timestamp: logEntry.timestamp,
                            level: logEntry.level,
                            message: logEntry.message
                        });
                    }
                } catch (error) {
                    // Invalid JSON line
                }
            });
            
            return {
                totalEvents: lines.length,
                severityLevels,
                recentThreats
            };
        } catch (error) {
            return { totalEvents: 0, severityLevels: {}, recentThreats: [], error: error.message };
        }
    }

    analyzePerformanceMetrics() {
        const performanceLogPath = join(this.config.logDir, 'performance', 'performance.log');
        
        if (!existsSync(performanceLogPath)) {
            return { totalOperations: 0, averageResponseTime: 0, slowOperations: [] };
        }
        
        try {
            const content = readFileSync(performanceLogPath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            let totalDuration = 0;
            let operationCount = 0;
            const slowOperations = [];
            
            lines.forEach(line => {
                try {
                    const logEntry = JSON.parse(line);
                    if (logEntry.metadata && logEntry.metadata.duration) {
                        totalDuration += logEntry.metadata.duration;
                        operationCount++;
                        
                        if (logEntry.metadata.duration > 1000 && slowOperations.length < 5) {
                            slowOperations.push({
                                timestamp: logEntry.timestamp,
                                operation: logEntry.metadata.operation,
                                duration: logEntry.metadata.duration
                            });
                        }
                    }
                } catch (error) {
                    // Invalid JSON line
                }
            });
            
            const averageResponseTime = operationCount > 0 ? totalDuration / operationCount : 0;
            
            return {
                totalOperations: operationCount,
                averageResponseTime: Math.round(averageResponseTime),
                slowOperations
            };
        } catch (error) {
            return { totalOperations: 0, averageResponseTime: 0, slowOperations: [], error: error.message };
        }
    }

    analyzeSystemHealth() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            return {
                uptime: process.uptime(),
                memoryUsage: {
                    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                    external: Math.round(memUsage.external / 1024 / 1024) // MB
                },
                cpuUsage: {
                    user: cpuUsage.user,
                    system: cpuUsage.system
                },
                nodeVersion: process.version,
                platform: process.platform
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    displayReport(report) {
        console.log('\n📋 Log Files Analysis:');
        Object.entries(report.logFiles).forEach(([category, data]) => {
            if (data.error) {
                console.log(`  ❌ ${category}: Error - ${data.error}`);
            } else {
                console.log(`  📄 ${category}: ${data.fileCount} files, ${data.sizeMB}MB, ${data.totalEntries} entries`);
            }
        });
        
        console.log('\n🔍 Audit Events:');
        console.log(`  • Total Events: ${report.auditEvents.totalEvents}`);
        if (Object.keys(report.auditEvents.eventTypes).length > 0) {
            console.log('  • Event Types:');
            Object.entries(report.auditEvents.eventTypes).forEach(([type, count]) => {
                console.log(`    - ${type}: ${count}`);
            });
        }
        
        console.log('\n🛡️ Security Events:');
        console.log(`  • Total Events: ${report.securityEvents.totalEvents}`);
        if (Object.keys(report.securityEvents.severityLevels).length > 0) {
            console.log('  • Severity Levels:');
            Object.entries(report.securityEvents.severityLevels).forEach(([severity, count]) => {
                console.log(`    - ${severity}: ${count}`);
            });
        }
        
        console.log('\n⚡ Performance Metrics:');
        console.log(`  • Total Operations: ${report.performanceMetrics.totalOperations}`);
        console.log(`  • Average Response Time: ${report.performanceMetrics.averageResponseTime}ms`);
        
        console.log('\n🏥 System Health:');
        if (report.systemHealth.error) {
            console.log(`  ❌ Error: ${report.systemHealth.error}`);
        } else {
            console.log(`  • Uptime: ${Math.round(report.systemHealth.uptime / 60)} minutes`);
            console.log(`  • Memory Usage: ${report.systemHealth.memoryUsage.heapUsed}MB / ${report.systemHealth.memoryUsage.heapTotal}MB`);
            console.log(`  • Node Version: ${report.systemHealth.nodeVersion}`);
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (report.performanceMetrics.averageResponseTime > 500) {
            console.log('  • High average response time detected - consider optimization');
        }
        
        if (report.securityEvents.totalEvents > 100) {
            console.log('  • High number of security events - review security measures');
        }
        
        if (report.auditEvents.totalEvents === 0) {
            console.log('  • No audit events recorded - check audit logging configuration');
        }
        
        const totalLogSize = Object.values(report.logFiles).reduce((sum, data) => 
            sum + (data.totalSize || 0), 0
        );
        
        if (totalLogSize > 100 * 1024 * 1024) { // 100MB
            console.log('  • Large log files - consider log rotation');
        }
    }

    async cleanupOldLogs() {
        console.log('🧹 Cleaning up old logs...');
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
        
        let deletedFiles = 0;
        const logDirs = [
            this.config.logDir,
            this.config.auditDir
        ];
        
        logDirs.forEach(dir => {
            if (existsSync(dir)) {
                try {
                    const result = execSync(`find ${dir} -name "*.log" -type f -mtime +${this.config.retentionDays}`, { encoding: 'utf8' });
                    const oldFiles = result.trim().split('\n').filter(f => f);
                    
                    oldFiles.forEach(file => {
                        try {
                            execSync(`rm "${file}"`);
                            deletedFiles++;
                            console.log(`  🗑️ Deleted old log: ${file}`);
                        } catch (error) {
                            console.error(`  ❌ Failed to delete ${file}: ${error.message}`);
                        }
                    });
                } catch (error) {
                    // No old files found
                }
            }
        });
        
        console.log(`✅ Cleanup complete. Deleted ${deletedFiles} old log files.`);
        return deletedFiles;
    }

    async exportLogs(format = 'json', startDate, endDate) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                format: format,
                startDate: startDate,
                endDate: endDate
            },
            logs: {}
        };
        
        const categories = ['app', 'api', 'security', 'performance'];
        
        for (const category of categories) {
            const logPath = join(this.config.logDir, category, `${category}.log`);
            
            if (existsSync(logPath)) {
                try {
                    const content = readFileSync(logPath, 'utf8');
                    const lines = content.trim().split('\n').filter(line => line);
                    
                    const logs = lines.map(line => {
                        try {
                            return JSON.parse(line);
                        } catch (error) {
                            return { raw: line, parseError: true };
                        }
                    });
                    
                    // Filter by date range if specified
                    let filteredLogs = logs;
                    if (startDate && endDate) {
                        filteredLogs = logs.filter(log => {
                            if (log.timestamp) {
                                const logDate = new Date(log.timestamp);
                                return logDate >= new Date(startDate) && logDate <= new Date(endDate);
                            }
                            return false;
                        });
                    }
                    
                    exportData.logs[category] = filteredLogs;
                } catch (error) {
                    exportData.logs[category] = { error: error.message };
                }
            }
        }
        
        // Export audit logs
        const auditLogPath = join(this.config.auditDir, 'audit.log');
        if (existsSync(auditLogPath)) {
            try {
                const content = readFileSync(auditLogPath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line);
                
                exportData.logs.audit = lines.map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (error) {
                        return { raw: line, parseError: true };
                    }
                });
            } catch (error) {
                exportData.logs.audit = { error: error.message };
            }
        }
        
        // Save export
        const exportFile = join(this.config.logDir, `export-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`);
        
        if (format === 'json') {
            writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
        } else if (format === 'csv') {
            // Convert to CSV format (simplified)
            let csvContent = 'Timestamp,Category,Level,Message,Metadata\n';
            
            Object.entries(exportData.logs).forEach(([category, logs]) => {
                if (Array.isArray(logs)) {
                    logs.forEach(log => {
                        if (!log.parseError) {
                            const metadata = JSON.stringify(log.metadata || {}).replace(/"/g, '""');
                            csvContent += `"${log.timestamp}","${category}","${log.level}","${log.message}","${metadata}"\n`;
                        }
                    });
                }
            });
            
            writeFileSync(exportFile, csvContent);
        }
        
        console.log(`📤 Logs exported to: ${exportFile}`);
        return exportFile;
    }
}

class Logger {
    constructor(category, config) {
        this.category = category;
        this.config = config;
        this.logPath = join(config.logDir, category, `${category}.log`);
        this.ensureLogFile();
    }

    ensureLogFile() {
        const logDir = join(this.config.logDir, this.category);
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
    }

    async log(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            category: this.category,
            message,
            metadata,
            pid: process.pid
        };
        
        const logLine = JSON.stringify(logEntry);
        
        // Console logging
        if (this.config.enableConsoleLogging) {
            const consoleMessage = `[${timestamp}] ${level}: ${message}`;
            switch (level) {
                case 'ERROR':
                    console.error(consoleMessage);
                    break;
                case 'WARN':
                    console.warn(consoleMessage);
                    break;
                case 'INFO':
                    console.info(consoleMessage);
                    break;
                case 'DEBUG':
                    console.debug(consoleMessage);
                    break;
                default:
                    console.log(consoleMessage);
            }
        }
        
        // File logging
        if (this.config.enableFileLogging) {
            try {
                appendFileSync(this.logPath, logLine + '\n');
                
                // Check file size and rotate if necessary
                this.rotateIfNeeded();
            } catch (error) {
                console.error(`Failed to write to log file: ${error.message}`);
            }
        }
    }

    rotateIfNeeded() {
        try {
            const stats = statSync(this.logPath);
            if (stats.size > this.config.maxLogSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = this.logPath.replace('.log', `-${timestamp}.log`);
                renameSync(this.logPath, rotatedPath);
            }
        } catch (error) {
            // File might not exist or other error
        }
    }
}

class AuditLogger extends Logger {
    async audit(eventType, auditEntry) {
        const auditLine = JSON.stringify(auditEntry);
        
        // Console logging for critical events
        if (this.config.enableConsoleLogging) {
            console.log(`[AUDIT] ${eventType}: ${auditEntry.userId} - ${auditEntry.action}`);
        }
        
        // File logging
        if (this.config.enableFileLogging) {
            try {
                appendFileSync(this.logPath, auditLine + '\n');
                this.rotateIfNeeded();
            } catch (error) {
                console.error(`Failed to write audit log: ${error.message}`);
            }
        }
    }
}

// Run logging system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const loggingSystem = new LoggingAuditSystem();
    
    const command = process.argv[2] || 'report';
    
    switch (command) {
        case 'test':
            loggingSystem.logEvent('app', 'INFO', 'Test logging message', { test: true });
            loggingSystem.auditEvent('TEST_EVENT', 'test-user', 'test-action', 'test-resource');
            console.log('✅ Test logs created');
            break;
        case 'report':
            loggingSystem.generateLogReport();
            break;
        case 'cleanup':
            loggingSystem.cleanupOldLogs();
            break;
        case 'export':
            const format = process.argv[3] || 'json';
            loggingSystem.exportLogs(format);
            break;
        default:
            console.log('Usage: node logging-audit-system.js [test|report|cleanup|export [format]]');
    }
}

export default LoggingAuditSystem;
