// WebSocket Live Updates System for Predator Analytics
// Real-time data streaming and notifications

import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { EventEmitter } from 'events';

class WebSocketLiveUpdates extends EventEmitter {
    constructor(port = 3006) {
        super();
        this.port = port;
        this.clients = new Map();
        this.channels = new Map();
        this.messageQueue = [];
        this.maxQueueSize = 1000;
        
        this.initializeServer();
        this.setupChannels();
    }

    initializeServer() {
        this.server = createServer((req, res) => {
            this.handleHttpRequest(req, res);
        });
        
        this.wss = new WebSocketServer({ server: this.server });
        
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        
        this.server.listen(this.port, () => {
            console.log(`🌐 WebSocket Live Updates Server running on port ${this.port}`);
        });
    }

    handleHttpRequest(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        if (req.url === '/status') {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'running',
                clients: this.clients.size,
                channels: Array.from(this.channels.keys()),
                timestamp: new Date().toISOString()
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const clientInfo = {
            id: clientId,
            ws: ws,
            subscriptions: new Set(),
            lastActivity: Date.now(),
            ip: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'] || 'unknown'
        };
        
        this.clients.set(clientId, clientInfo);
        
        console.log(`🔗 Client connected: ${clientId} from ${clientInfo.ip}`);
        
        // Send welcome message
        this.sendToClient(clientId, {
            type: 'welcome',
            clientId: clientId,
            timestamp: new Date().toISOString()
        });
        
        // Send queued messages
        this.flushMessageQueue(clientId);
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleClientMessage(clientId, message);
            } catch (error) {
                console.error(`Invalid message from ${clientId}:`, error);
            }
        });
        
        ws.on('close', (code, reason) => {
            console.log(`🔌 Client disconnected: ${clientId} (${code})`);
            this.handleDisconnection(clientId);
        });
        
        ws.on('error', (error) => {
            console.error(`WebSocket error for ${clientId}:`, error);
            this.handleDisconnection(clientId);
        });
        
        ws.on('pong', () => {
            clientInfo.lastActivity = Date.now();
        });
        
        // Setup heartbeat
        this.setupHeartbeat(clientId);
    }

    handleClientMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        client.lastActivity = Date.now();
        
        switch (message.type) {
            case 'subscribe':
                this.handleSubscription(clientId, message.channels || []);
                break;
            case 'unsubscribe':
                this.handleUnsubscription(clientId, message.channels || []);
                break;
            case 'ping':
                this.sendToClient(clientId, {
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;
            case 'getChannels':
                this.sendToClient(clientId, {
                    type: 'channels',
                    data: Array.from(this.channels.keys()),
                    timestamp: new Date().toISOString()
                });
                break;
            default:
                console.log(`Unknown message type from ${clientId}:`, message.type);
        }
    }

    handleSubscription(clientId, channels) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        channels.forEach(channel => {
            if (this.channels.has(channel)) {
                client.subscriptions.add(channel);
                this.channels.get(channel).add(clientId);
                console.log(`📡 Client ${clientId} subscribed to ${channel}`);
                
                // Send current data for the channel
                this.sendChannelData(clientId, channel);
            }
        });
        
        this.sendToClient(clientId, {
            type: 'subscriptionConfirmed',
            channels: channels,
            timestamp: new Date().toISOString()
        });
    }

    handleUnsubscription(clientId, channels) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        channels.forEach(channel => {
            client.subscriptions.delete(channel);
            if (this.channels.has(channel)) {
                this.channels.get(channel).delete(clientId);
            }
        });
        
        this.sendToClient(clientId, {
            type: 'unsubscriptionConfirmed',
            channels: channels,
            timestamp: new Date().toISOString()
        });
    }

    handleDisconnection(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        // Remove from all channels
        client.subscriptions.forEach(channel => {
            if (this.channels.has(channel)) {
                this.channels.get(channel).delete(clientId);
            }
        });
        
        this.clients.delete(clientId);
    }

    setupChannels() {
        // Default channels
        const defaultChannels = [
            'system-metrics',
            'api-status',
            'real-data',
            'alerts',
            'deployments',
            'logs',
            'user-activity'
        ];
        
        defaultChannels.forEach(channel => {
            this.channels.set(channel, new Set());
        });
    }

    setupHeartbeat(clientId) {
        const interval = setInterval(() => {
            const client = this.clients.get(clientId);
            if (!client) {
                clearInterval(interval);
                return;
            }
            
            // Check if client is still alive
            if (Date.now() - client.lastActivity > 60000) { // 1 minute
                client.ws.terminate();
                this.handleDisconnection(clientId);
                clearInterval(interval);
                return;
            }
            
            // Send ping
            try {
                client.ws.ping();
            } catch (error) {
                this.handleDisconnection(clientId);
                clearInterval(interval);
            }
        }, 30000); // Every 30 seconds
    }

    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client || client.ws.readyState !== 1) return; // WebSocket.OPEN
        
        try {
            client.ws.send(JSON.stringify(message));
        } catch (error) {
            console.error(`Error sending to client ${clientId}:`, error);
            this.handleDisconnection(clientId);
        }
    }

    broadcast(channel, message) {
        if (!this.channels.has(channel)) return;
        
        const subscribers = this.channels.get(channel);
        const messageStr = JSON.stringify({
            ...message,
            channel: channel,
            timestamp: new Date().toISOString()
        });
        
        subscribers.forEach(clientId => {
            const client = this.clients.get(clientId);
            if (client && client.ws.readyState === 1) {
                try {
                    client.ws.send(messageStr);
                } catch (error) {
                    console.error(`Error broadcasting to ${clientId}:`, error);
                    this.handleDisconnection(clientId);
                }
            }
        });
        
        // Add to queue for new clients
        this.addToQueue(channel, message);
        
        console.log(`📡 Broadcasted to ${subscribers.size} clients on channel: ${channel}`);
    }

    addToQueue(channel, message) {
        const queueMessage = {
            channel: channel,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.messageQueue.push(queueMessage);
        
        // Keep queue size manageable
        if (this.messageQueue.length > this.maxQueueSize) {
            this.messageQueue = this.messageQueue.slice(-this.maxQueueSize);
        }
    }

    flushMessageQueue(clientId) {
        const recentMessages = this.messageQueue.slice(-50); // Last 50 messages
        
        recentMessages.forEach(queueMessage => {
            const client = this.clients.get(clientId);
            if (client && client.subscriptions.has(queueMessage.channel)) {
                this.sendToClient(clientId, {
                    ...queueMessage.message,
                    channel: queueMessage.channel,
                    timestamp: queueMessage.timestamp,
                    queued: true
                });
            }
        });
    }

    sendChannelData(clientId, channel) {
        // Send current data for the channel (placeholder)
        // In real implementation, this would fetch current state
        this.sendToClient(clientId, {
            type: 'channelData',
            channel: channel,
            data: { status: 'active' },
            timestamp: new Date().toISOString()
        });
    }

    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // API methods for external use
    publishSystemMetrics(metrics) {
        this.broadcast('system-metrics', {
            type: 'metrics',
            data: metrics
        });
    }

    publishApiStatus(status) {
        this.broadcast('api-status', {
            type: 'status',
            data: status
        });
    }

    publishRealDataUpdate(data) {
        this.broadcast('real-data', {
            type: 'update',
            data: data
        });
    }

    publishAlert(alert) {
        this.broadcast('alerts', {
            type: 'alert',
            data: alert
        });
    }

    publishDeploymentUpdate(deployment) {
        this.broadcast('deployments', {
            type: 'deployment',
            data: deployment
        });
    }

    publishLogEntry(log) {
        this.broadcast('logs', {
            type: 'log',
            data: log
        });
    }

    publishUserActivity(activity) {
        this.broadcast('user-activity', {
            type: 'activity',
            data: activity
        });
    }

    getStats() {
        return {
            clients: this.clients.size,
            channels: Array.from(this.channels.entries()).map(([name, subscribers]) => ({
                name,
                subscribers: subscribers.size
            })),
            queueSize: this.messageQueue.length,
            uptime: process.uptime()
        };
    }

    shutdown() {
        console.log('🔄 Shutting down WebSocket Live Updates server...');
        
        // Notify all clients
        this.broadcast('system', {
            type: 'shutdown',
            message: 'Server is shutting down'
        });
        
        // Close all connections
        this.clients.forEach((client, clientId) => {
            client.ws.close();
        });
        
        this.wss.close();
        this.server.close();
        
        console.log('✅ WebSocket Live Updates server shutdown complete');
    }
}

// Integration with monitoring system
class LiveUpdatesIntegration {
    constructor(monitoringSystem, liveUpdates) {
        this.monitoring = monitoringSystem;
        this.liveUpdates = liveUpdates;
        
        this.setupIntegration();
    }

    setupIntegration() {
        // Forward monitoring metrics to live updates
        setInterval(() => {
            this.liveUpdates.publishSystemMetrics(this.monitoring.metrics);
        }, 5000);
        
        // Forward alerts to live updates
        this.monitoring.on('alert', (alert) => {
            this.liveUpdates.publishAlert(alert);
        });
        
        // Forward real data updates
        setInterval(() => {
            this.liveUpdates.publishRealDataUpdate(this.monitoring.metrics.realData);
        }, 30000);
    }
}

// Run live updates server if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const liveUpdates = new WebSocketLiveUpdates();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        liveUpdates.shutdown();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        liveUpdates.shutdown();
        process.exit(0);
    });
    
    console.log('🎊 WebSocket Live Updates System started!');
    console.log(`📡 Server running on port ${liveUpdates.port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${liveUpdates.port}`);
    
    // Example usage - send test messages every 10 seconds
    setInterval(() => {
        liveUpdates.publishSystemMetrics({
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            timestamp: new Date().toISOString()
        });
        
        liveUpdates.publishRealDataUpdate({
            prozorro: { status: 'online', lastUpdate: new Date().toISOString() },
            nbu: { status: 'online', lastUpdate: new Date().toISOString() }
        });
    }, 10000);
}

export default WebSocketLiveUpdates;
