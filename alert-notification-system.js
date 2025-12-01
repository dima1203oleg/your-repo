// Advanced Alert and Notification System for Predator Analytics
// Multi-channel alerting with escalation and intelligent routing

import { EventEmitter } from 'events';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';

class AlertNotificationSystem extends EventEmitter {
    constructor() {
        super();
        this.alerts = [];
        this.rules = new Map();
        this.channels = new Map();
        this.escalationPolicies = new Map();
        this.alertHistory = [];
        this.maxHistorySize = 10000;
        
        this.config = {
            maxActiveAlerts: 100,
            alertCooldown: 300000, // 5 minutes
            escalationTimeout: 900000, // 15 minutes
            autoResolveTimeout: 1800000, // 30 minutes
            enableEmail: false,
            enableSlack: false,
            enableWebhook: false,
            enableConsole: true
        };
        
        this.initializeChannels();
        this.loadDefaultRules();
        this.startAlertProcessor();
    }

    initializeChannels() {
        // Console channel (always available)
        this.channels.set('console', {
            name: 'Console',
            priority: 1,
            enabled: this.config.enableConsole,
            send: (alert) => this.sendConsoleAlert(alert)
        });
        
        // Email channel
        this.channels.set('email', {
            name: 'Email',
            priority: 2,
            enabled: this.config.enableEmail,
            send: (alert) => this.sendEmailAlert(alert)
        });
        
        // Slack channel
        this.channels.set('slack', {
            name: 'Slack',
            priority: 3,
            enabled: this.config.enableSlack,
            send: (alert) => this.sendSlackAlert(alert)
        });
        
        // Webhook channel
        this.channels.set('webhook', {
            name: 'Webhook',
            priority: 4,
            enabled: this.config.enableWebhook,
            send: (alert) => this.sendWebhookAlert(alert)
        });
    }

    loadDefaultRules() {
        // System performance rules
        this.addRule('high_cpu', {
            name: 'High CPU Usage',
            condition: (metrics) => metrics.cpu > 80,
            severity: 'warning',
            message: 'CPU usage is {{cpu}}%',
            cooldown: 300000,
            channels: ['console'],
            escalation: ['email', 'slack']
        });
        
        this.addRule('critical_cpu', {
            name: 'Critical CPU Usage',
            condition: (metrics) => metrics.cpu > 95,
            severity: 'critical',
            message: 'CRITICAL: CPU usage is {{cpu}}%',
            cooldown: 60000,
            channels: ['console', 'email'],
            escalation: ['slack', 'webhook']
        });
        
        this.addRule('high_memory', {
            name: 'High Memory Usage',
            condition: (metrics) => metrics.memory > 85,
            severity: 'warning',
            message: 'Memory usage is {{memory}}%',
            cooldown: 300000,
            channels: ['console'],
            escalation: ['email']
        });
        
        this.addRule('critical_memory', {
            name: 'Critical Memory Usage',
            condition: (metrics) => metrics.memory > 95,
            severity: 'critical',
            message: 'CRITICAL: Memory usage is {{memory}}%',
            cooldown: 60000,
            channels: ['console', 'email'],
            escalation: ['slack', 'webhook']
        });
        
        // API performance rules
        this.addRule('api_errors', {
            name: 'High API Error Rate',
            condition: (metrics) => metrics.errors > 10,
            severity: 'error',
            message: 'API error rate is {{errors}} errors',
            cooldown: 300000,
            channels: ['console'],
            escalation: ['email']
        });
        
        this.addRule('slow_response', {
            name: 'Slow API Response',
            condition: (metrics) => metrics.responseTime > 2000,
            severity: 'warning',
            message: 'API response time is {{responseTime}}ms',
            cooldown: 300000,
            channels: ['console'],
            escalation: ['email']
        });
        
        // Real data API rules
        this.addRule('api_down', {
            name: 'API Service Down',
            condition: (data) => data.status === 'offline' || data.status === 'error',
            severity: 'critical',
            message: 'API {{name}} is {{status}}',
            cooldown: 60000,
            channels: ['console', 'email'],
            escalation: ['slack', 'webhook']
        });
        
        // Security rules
        this.addRule('security_event', {
            name: 'Security Event',
            condition: (event) => event.type === 'security',
            severity: 'critical',
            message: 'Security event: {{event}}',
            cooldown: 0,
            channels: ['console', 'email', 'slack'],
            escalation: ['webhook']
        });
        
        // Deployment rules
        this.addRule('deployment_failure', {
            name: 'Deployment Failure',
            condition: (deployment) => deployment.status === 'failed',
            severity: 'error',
            message: 'Deployment failed: {{service}}',
            cooldown: 0,
            channels: ['console', 'email'],
            escalation: ['slack']
        });
    }

    addRule(id, rule) {
        this.rules.set(id, {
            ...rule,
            id: id,
            lastTriggered: 0,
            triggerCount: 0,
            activeAlerts: new Set()
        });
    }

    checkRules(metrics, context = {}) {
        this.rules.forEach((rule, ruleId) => {
            try {
                if (this.shouldTriggerRule(rule, metrics, context)) {
                    this.triggerRule(ruleId, metrics, context);
                }
            } catch (error) {
                console.error(`Error checking rule ${ruleId}:`, error);
            }
        });
    }

    shouldTriggerRule(rule, metrics, context) {
        // Check cooldown
        const now = Date.now();
        if (now - rule.lastTriggered < rule.cooldown) {
            return false;
        }
        
        // Check condition
        try {
            return rule.condition(metrics);
        } catch (error) {
            console.error(`Error in rule condition for ${rule.id}:`, error);
            return false;
        }
    }

    triggerRule(ruleId, metrics, context) {
        const rule = this.rules.get(ruleId);
        if (!rule) return;
        
        const now = Date.now();
        rule.lastTriggered = now;
        rule.triggerCount++;
        
        // Create alert
        const alert = this.createAlert(rule, metrics, context);
        
        // Add to active alerts
        rule.activeAlerts.add(alert.id);
        this.alerts.push(alert);
        
        // Send notifications
        this.sendAlert(alert);
        
        // Add to history
        this.addToHistory(alert);
        
        // Emit event
        this.emit('alert', alert);
        
        console.log(`🚨 Alert triggered: ${rule.name} (${alert.severity})`);
        
        // Schedule escalation
        if (rule.escalation && rule.escalation.length > 0) {
            this.scheduleEscalation(alert, rule);
        }
        
        // Schedule auto-resolve
        if (this.config.autoResolveTimeout > 0) {
            this.scheduleAutoResolve(alert);
        }
    }

    createAlert(rule, metrics, context) {
        const alert = {
            id: this.generateAlertId(),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: this.formatMessage(rule.message, metrics, context),
            metrics: metrics,
            context: context,
            timestamp: new Date().toISOString(),
            status: 'active',
            acknowledged: false,
            escalated: false,
            channels: rule.channels,
            escalation: rule.escalation
        };
        
        return alert;
    }

    formatMessage(template, metrics, context) {
        let message = template;
        
        // Replace {{variable}} placeholders
        message = message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            if (metrics[key] !== undefined) {
                return metrics[key];
            }
            if (context[key] !== undefined) {
                return context[key];
            }
            return match;
        });
        
        return message;
    }

    generateAlertId() {
        return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    sendAlert(alert) {
        const channels = alert.channels || ['console'];
        
        channels.forEach(channelName => {
            const channel = this.channels.get(channelName);
            if (channel && channel.enabled) {
                try {
                    channel.send(alert);
                } catch (error) {
                    console.error(`Error sending alert to ${channelName}:`, error);
                }
            }
        });
    }

    sendConsoleAlert(alert) {
        const timestamp = new Date(alert.timestamp).toLocaleString();
        const severityIcon = this.getSeverityIcon(alert.severity);
        
        console.log(`${severityIcon} [${timestamp}] ${alert.severity.toUpperCase()}: ${alert.message}`);
        
        if (alert.metrics && Object.keys(alert.metrics).length > 0) {
            console.log(`   Metrics: ${JSON.stringify(alert.metrics, null, 2)}`);
        }
    }

    sendEmailAlert(alert) {
        // Placeholder for email implementation
        console.log(`📧 Email alert would be sent: ${alert.message}`);
        
        // In real implementation, you would use nodemailer or similar:
        // await this.emailService.send({
        //     to: this.config.emailRecipients,
        //     subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
        //     text: this.formatEmailContent(alert)
        // });
    }

    sendSlackAlert(alert) {
        // Placeholder for Slack implementation
        console.log(`💬 Slack alert would be sent: ${alert.message}`);
        
        // In real implementation, you would use Slack Web API:
        // await this.slackService.postMessage({
        //     channel: this.config.slackChannel,
        //     text: this.formatSlackMessage(alert)
        // });
    }

    sendWebhookAlert(alert) {
        // Placeholder for webhook implementation
        console.log(`🔗 Webhook alert would be sent: ${alert.message}`);
        
        // In real implementation, you would use fetch or axios:
        // await fetch(this.config.webhookUrl, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(alert)
        // });
    }

    getSeverityIcon(severity) {
        const icons = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            critical: '🔴'
        };
        return icons[severity] || '📢';
    }

    scheduleEscalation(alert, rule) {
        setTimeout(() => {
            if (alert.status === 'active' && !alert.escalated) {
                this.escalateAlert(alert, rule);
            }
        }, this.config.escalationTimeout);
    }

    escalateAlert(alert, rule) {
        alert.escalated = true;
        alert.escalationTime = new Date().toISOString();
        
        // Send to escalation channels
        const escalationChannels = alert.escalation || [];
        escalationChannels.forEach(channelName => {
            const channel = this.channels.get(channelName);
            if (channel && channel.enabled) {
                try {
                    channel.send({
                        ...alert,
                        message: `🚨 ESCALATED: ${alert.message}`,
                        channels: [channelName]
                    });
                } catch (error) {
                    console.error(`Error sending escalation to ${channelName}:`, error);
                }
            }
        });
        
        console.log(`🚨 Alert escalated: ${alert.id}`);
        this.emit('escalation', alert);
    }

    scheduleAutoResolve(alert) {
        setTimeout(() => {
            if (alert.status === 'active') {
                this.resolveAlert(alert.id, 'auto-resolve');
            }
        }, this.config.autoResolveTimeout);
    }

    acknowledgeAlert(alertId, userId = 'system') {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert && alert.status === 'active') {
            alert.acknowledged = true;
            alert.acknowledgedBy = userId;
            alert.acknowledgedTime = new Date().toISOString();
            
            console.log(`✅ Alert acknowledged: ${alertId} by ${userId}`);
            this.emit('acknowledged', alert);
            
            return true;
        }
        return false;
    }

    resolveAlert(alertId, reason = 'manual') {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert && alert.status === 'active') {
            alert.status = 'resolved';
            alert.resolvedTime = new Date().toISOString();
            alert.resolveReason = reason;
            
            // Remove from active alerts in rules
            const rule = this.rules.get(alert.ruleId);
            if (rule) {
                rule.activeAlerts.delete(alertId);
            }
            
            console.log(`✅ Alert resolved: ${alertId} (${reason})`);
            this.emit('resolved', alert);
            
            return true;
        }
        return false;
    }

    addToHistory(alert) {
        this.alertHistory.push({
            ...alert,
            action: 'created',
            timestamp: new Date().toISOString()
        });
        
        // Keep history size manageable
        if (this.alertHistory.length > this.maxHistorySize) {
            this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
        }
    }

    startAlertProcessor() {
        // Clean up old alerts every minute
        setInterval(() => {
            this.cleanupOldAlerts();
        }, 60000);
        
        // Check alert limits every 5 minutes
        setInterval(() => {
            this.checkAlertLimits();
        }, 300000);
    }

    cleanupOldAlerts() {
        const now = Date.now();
        const oneHourAgo = now - 3600000; // 1 hour
        
        // Remove resolved alerts older than 1 hour
        const beforeCount = this.alerts.length;
        this.alerts = this.alerts.filter(alert => {
            if (alert.status === 'resolved') {
                const resolvedTime = new Date(alert.resolvedTime || alert.timestamp).getTime();
                return resolvedTime > oneHourAgo;
            }
            return true;
        });
        
        const removedCount = beforeCount - this.alerts.length;
        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} old resolved alerts`);
        }
    }

    checkAlertLimits() {
        const activeAlerts = this.alerts.filter(a => a.status === 'active');
        
        if (activeAlerts.length > this.config.maxActiveAlerts) {
            // Resolve oldest alerts to make room
            const excessCount = activeAlerts.length - this.config.maxActiveAlerts;
            const oldestAlerts = activeAlerts
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .slice(0, excessCount);
            
            oldestAlerts.forEach(alert => {
                this.resolveAlert(alert.id, 'auto-cleanup');
            });
            
            console.log(`🧹 Auto-resolved ${excessCount} oldest alerts due to limit`);
        }
    }

    // Public API methods
    getActiveAlerts() {
        return this.alerts.filter(a => a.status === 'active');
    }

    getAlertsBySeverity(severity) {
        return this.alerts.filter(a => a.severity === severity && a.status === 'active');
    }

    getAlertsByRule(ruleId) {
        return this.alerts.filter(a => a.ruleId === ruleId && a.status === 'active');
    }

    getAlertStats() {
        const stats = {
            total: this.alerts.length,
            active: this.alerts.filter(a => a.status === 'active').length,
            resolved: this.alerts.filter(a => a.status === 'resolved').length,
            acknowledged: this.alerts.filter(a => a.acknowledged).length,
            escalated: this.alerts.filter(a => a.escalated).length
        };
        
        // Count by severity
        stats.bySeverity = {
            info: this.alerts.filter(a => a.severity === 'info' && a.status === 'active').length,
            warning: this.alerts.filter(a => a.severity === 'warning' && a.status === 'active').length,
            error: this.alerts.filter(a => a.severity === 'error' && a.status === 'active').length,
            critical: this.alerts.filter(a => a.severity === 'critical' && a.status === 'active').length
        };
        
        // Count by rule
        stats.byRule = {};
        this.rules.forEach((rule, ruleId) => {
            stats.byRule[ruleId] = {
                name: rule.name,
                active: rule.activeAlerts.size,
                triggered: rule.triggerCount,
                lastTriggered: rule.lastTriggered
            };
        });
        
        return stats;
    }

    clearAllAlerts() {
        const activeCount = this.alerts.filter(a => a.status === 'active').length;
        
        this.alerts.forEach(alert => {
            if (alert.status === 'active') {
                alert.status = 'resolved';
                alert.resolvedTime = new Date().toISOString();
                alert.resolveReason = 'manual-clear';
                
                const rule = this.rules.get(alert.ruleId);
                if (rule) {
                    rule.activeAlerts.delete(alert.id);
                }
            }
        });
        
        console.log(`🧹 Cleared ${activeCount} active alerts`);
        this.emit('cleared', { count: activeCount });
        
        return activeCount;
    }

    exportAlerts(format = 'json') {
        const data = {
            timestamp: new Date().toISOString(),
            alerts: this.alerts,
            history: this.alertHistory.slice(-1000), // Last 1000 history entries
            rules: Array.from(this.rules.entries()).map(([id, rule]) => ({
                id: rule.id,
                name: rule.name,
                triggerCount: rule.triggerCount,
                lastTriggered: rule.lastTriggered,
                activeAlerts: rule.activeAlerts.size
            }))
        };
        
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
            // Simple CSV export
            let csv = 'ID,Rule,Severity,Message,Timestamp,Status,Acknowledged\n';
            this.alerts.forEach(alert => {
                csv += `${alert.id},"${alert.ruleName}",${alert.severity},"${alert.message}","${alert.timestamp}",${alert.status},${alert.acknowledged}\n`;
            });
            return csv;
        }
        
        return data;
    }

    // Integration methods
    processSystemMetrics(metrics) {
        this.checkRules(metrics, { type: 'system' });
    }

    processApiMetrics(metrics) {
        this.checkRules(metrics, { type: 'api' });
    }

    processRealDataStatus(apiName, status) {
        this.checkRules({ name: apiName, status: status }, { type: 'realdata' });
    }

    processSecurityEvent(event) {
        this.checkRules({ event: event }, { type: 'security' });
    }

    processDeploymentStatus(deployment) {
        this.checkRules(deployment, { type: 'deployment' });
    }
}

// Run alert system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const alertSystem = new AlertNotificationSystem();
    
    // Test alerts
    setTimeout(() => {
        alertSystem.processSystemMetrics({ cpu: 85, memory: 70 });
    }, 5000);
    
    setTimeout(() => {
        alertSystem.processSystemMetrics({ cpu: 98, memory: 95 });
    }, 10000);
    
    setTimeout(() => {
        alertSystem.processRealDataStatus('prozorro', 'offline');
    }, 15000);
    
    // Show stats every 30 seconds
    setInterval(() => {
        console.log('\n📊 Alert System Stats:');
        const stats = alertSystem.getAlertStats();
        console.log(`  Active: ${stats.active}, Resolved: ${stats.resolved}`);
        console.log(`  By Severity:`, stats.bySeverity);
    }, 30000);
    
    console.log('🎊 Alert Notification System started!');
    console.log('📡 Processing test alerts...');
}

export default AlertNotificationSystem;
