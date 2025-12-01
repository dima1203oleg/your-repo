// Auto-Scaling System for Predator Analytics
// Intelligent resource management and load balancing

import { EventEmitter } from 'events';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

class AutoScalingSystem extends EventEmitter {
    constructor() {
        super();
        this.config = {
            minInstances: 1,
            maxInstances: 10,
            targetCPUUtilization: 70,
            targetMemoryUtilization: 80,
            scaleUpCooldown: 300000, // 5 minutes
            scaleDownCooldown: 600000, // 10 minutes
            healthCheckInterval: 30000, // 30 seconds
            metricsRetentionPeriod: 3600000, // 1 hour
            enablePredictiveScaling: true,
            enableCostOptimization: true
        };
        
        this.instances = new Map();
        this.metrics = [];
        this.scalingHistory = [];
        this.lastScaleTime = { up: 0, down: 0 };
        this.predictions = [];
        
        this.initializeAutoScaling();
    }

    initializeAutoScaling() {
        console.log('🔄 Initializing Auto-Scaling System...');
        
        // Start with minimum instances
        this.initializeInstances();
        
        // Start monitoring
        this.startMetricsCollection();
        
        // Start scaling engine
        this.startScalingEngine();
        
        // Start predictive analytics
        if (this.config.enablePredictiveScaling) {
            this.startPredictiveAnalytics();
        }
        
        console.log('✅ Auto-Scaling System initialized');
    }

    initializeInstances() {
        for (let i = 0; i < this.config.minInstances; i++) {
            this.addInstance(`instance-${i + 1}`);
        }
        
        console.log(`🚀 Initialized ${this.config.minInstances} instances`);
    }

    addInstance(instanceId) {
        const instance = {
            id: instanceId,
            status: 'starting',
            cpu: 0,
            memory: 0,
            requests: 0,
            responseTime: 0,
            startTime: Date.now(),
            lastHealthCheck: Date.now(),
            healthStatus: 'unknown'
        };
        
        this.instances.set(instanceId, instance);
        
        // Simulate instance startup
        setTimeout(() => {
            instance.status = 'running';
            instance.healthStatus = 'healthy';
            console.log(`✅ Instance ${instanceId} is now running`);
            this.emit('instanceStarted', instance);
        }, 5000);
        
        return instance;
    }

    removeInstance(instanceId) {
        const instance = this.instances.get(instanceId);
        if (!instance) return false;
        
        // Check if it's safe to remove
        if (instance.status === 'running' && this.instances.size > this.config.minInstances) {
            instance.status = 'terminating';
            
            // Simulate graceful shutdown
            setTimeout(() => {
                this.instances.delete(instanceId);
                console.log(`🗑️ Instance ${instanceId} terminated`);
                this.emit('instanceTerminated', instanceId);
            }, 3000);
            
            return true;
        }
        
        return false;
    }

    startMetricsCollection() {
        setInterval(() => {
            this.collectMetrics();
            this.updateInstanceHealth();
        }, this.config.healthCheckInterval);
    }

    collectMetrics() {
        const timestamp = Date.now();
        
        // Collect system metrics
        const systemMetrics = this.getSystemMetrics();
        
        // Collect instance metrics
        const instanceMetrics = Array.from(this.instances.values()).map(instance => ({
            instanceId: instance.id,
            cpu: instance.cpu,
            memory: instance.memory,
            requests: instance.requests,
            responseTime: instance.responseTime,
            status: instance.status
        }));
        
        const metrics = {
            timestamp,
            system: systemMetrics,
            instances: instanceMetrics,
            totalInstances: this.instances.size,
            runningInstances: Array.from(this.instances.values()).filter(i => i.status === 'running').length
        };
        
        this.metrics.push(metrics);
        
        // Keep only recent metrics
        const cutoff = timestamp - this.config.metricsRetentionPeriod;
        this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
        
        this.emit('metricsCollected', metrics);
    }

    getSystemMetrics() {
        try {
            // Get CPU usage
            const cpuUsage = process.cpuUsage();
            const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000;
            
            // Get memory usage
            const memUsage = process.memoryUsage();
            const memoryPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            // Get load average (Unix systems)
            let loadAverage = [0, 0, 0];
            try {
                const result = execSync('uptime', { encoding: 'utf8' });
                const match = result.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
                if (match) {
                    loadAverage = [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])];
                }
            } catch (error) {
                // Fallback for non-Unix systems
            }
            
            return {
                cpu: Math.round(cpuPercent * 100) / 100,
                memory: Math.round(memoryPercent * 100) / 100,
                loadAverage,
                timestamp: Date.now()
            };
        } catch (error) {
            return { cpu: 0, memory: 0, loadAverage: [0, 0, 0], timestamp: Date.now() };
        }
    }

    updateInstanceHealth() {
        this.instances.forEach(instance => {
            if (instance.status !== 'running') return;
            
            // Simulate health check
            const isHealthy = Math.random() > 0.05; // 95% healthy
            instance.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
            instance.lastHealthCheck = Date.now();
            
            // Update instance metrics (simulated)
            instance.cpu = Math.random() * 100;
            instance.memory = Math.random() * 100;
            instance.requests = Math.floor(Math.random() * 1000);
            instance.responseTime = Math.random() * 500;
            
            // Handle unhealthy instances
            if (!isHealthy) {
                console.log(`⚠️ Instance ${instance.id} is unhealthy`);
                this.emit('instanceUnhealthy', instance);
                
                // Replace unhealthy instance
                setTimeout(() => {
                    this.removeInstance(instance.id);
                    this.addInstance(`instance-${Date.now()}`);
                }, 10000);
            }
        });
    }

    startScalingEngine() {
        setInterval(() => {
            this.evaluateScaling();
        }, this.config.healthCheckInterval);
    }

    evaluateScaling() {
        const now = Date.now();
        const runningInstances = Array.from(this.instances.values()).filter(i => i.status === 'running');
        
        if (runningInstances.length === 0) return;
        
        // Calculate average metrics
        const avgCPU = runningInstances.reduce((sum, i) => sum + i.cpu, 0) / runningInstances.length;
        const avgMemory = runningInstances.reduce((sum, i) => sum + i.memory, 0) / runningInstances.length;
        const avgResponseTime = runningInstances.reduce((sum, i) => sum + i.responseTime, 0) / runningInstances.length;
        
        // Check scale up conditions
        if (this.shouldScaleUp(avgCPU, avgMemory, avgResponseTime, now)) {
            this.scaleUp();
        }
        // Check scale down conditions
        else if (this.shouldScaleDown(avgCPU, avgMemory, avgResponseTime, now)) {
            this.scaleDown();
        }
        
        // Emit scaling decision
        this.emit('scalingEvaluated', {
            avgCPU, avgMemory, avgResponseTime,
            instanceCount: runningInstances.length,
            timestamp: now
        });
    }

    shouldScaleUp(avgCPU, avgMemory, avgResponseTime, now) {
        const cooldownPassed = now - this.lastScaleTime.up > this.config.scaleUpCooldown;
        const canScaleUp = this.instances.size < this.config.maxInstances;
        
        return cooldownPassed && canScaleUp && (
            avgCPU > this.config.targetCPUUtilization ||
            avgMemory > this.config.targetMemoryUtilization ||
            avgResponseTime > 1000
        );
    }

    shouldScaleDown(avgCPU, avgMemory, avgResponseTime, now) {
        const cooldownPassed = now - this.lastScaleTime.down > this.config.scaleDownCooldown;
        const canScaleDown = this.instances.size > this.config.minInstances;
        
        return cooldownPassed && canScaleDown && (
            avgCPU < this.config.targetCPUUtilization * 0.5 &&
            avgMemory < this.config.targetMemoryUtilization * 0.5 &&
            avgResponseTime < 200
        );
    }

    scaleUp() {
        const newInstanceId = `instance-${Date.now()}`;
        const newInstance = this.addInstance(newInstanceId);
        
        this.lastScaleTime.up = Date.now();
        
        const scalingEvent = {
            type: 'scale_up',
            instanceId: newInstanceId,
            totalInstances: this.instances.size,
            timestamp: Date.now(),
            reason: 'High resource utilization'
        };
        
        this.scalingHistory.push(scalingEvent);
        console.log(`📈 Scaling UP: Added ${newInstanceId} (Total: ${this.instances.size})`);
        this.emit('scaledUp', scalingEvent);
    }

    scaleDown() {
        const runningInstances = Array.from(this.instances.values()).filter(i => i.status === 'running');
        
        if (runningInstances.length <= this.config.minInstances) return;
        
        // Select instance to remove (least busy)
        const instanceToRemove = runningInstances.reduce((min, current) => 
            current.requests < min.requests ? current : min
        );
        
        if (this.removeInstance(instanceToRemove.id)) {
            this.lastScaleTime.down = Date.now();
            
            const scalingEvent = {
                type: 'scale_down',
                instanceId: instanceToRemove.id,
                totalInstances: this.instances.size,
                timestamp: Date.now(),
                reason: 'Low resource utilization'
            };
            
            this.scalingHistory.push(scalingEvent);
            console.log(`📉 Scaling DOWN: Removed ${instanceToRemove.id} (Total: ${this.instances.size})`);
            this.emit('scaledDown', scalingEvent);
        }
    }

    startPredictiveAnalytics() {
        setInterval(() => {
            this.generatePredictions();
        }, 60000); // Every minute
    }

    generatePredictions() {
        if (this.metrics.length < 10) return;
        
        // Simple linear regression for prediction
        const recentMetrics = this.metrics.slice(-20);
        const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.system.cpu));
        const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.system.memory));
        const requestTrend = this.calculateTrend(recentMetrics.map(m => m.system.totalRequests || 0));
        
        // Predict next hour
        const prediction = {
            timestamp: Date.now(),
            predictions: {
                cpu: this.predictNextValue(cpuTrend, recentMetrics.map(m => m.system.cpu)),
                memory: this.predictNextValue(memoryTrend, recentMetrics.map(m => m.system.memory)),
                requests: this.predictNextValue(requestTrend, recentMetrics.map(m => m.system.totalRequests || 0)),
                recommendedInstances: this.predictOptimalInstanceCount(cpuTrend, memoryTrend)
            },
            confidence: this.calculatePredictionConfidence(recentMetrics)
        };
        
        this.predictions.push(prediction);
        
        // Keep only recent predictions
        this.predictions = this.predictions.slice(-50);
        
        // Proactive scaling based on predictions
        if (prediction.confidence > 0.7) {
            this.proactiveScaling(prediction);
        }
        
        this.emit('predictionGenerated', prediction);
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return slope;
    }

    predictNextValue(trend, recentValues) {
        if (recentValues.length === 0) return 0;
        const lastValue = recentValues[recentValues.length - 1];
        const prediction = lastValue + trend * 10; // Predict 10 periods ahead
        return Math.max(0, Math.min(100, prediction)); // Clamp between 0-100
    }

    predictOptimalInstanceCount(cpuTrend, memoryTrend) {
        const currentInstances = this.instances.size;
        const predictedCPU = this.predictNextValue(cpuTrend, this.metrics.slice(-10).map(m => m.system.cpu));
        const predictedMemory = this.predictNextValue(memoryTrend, this.metrics.slice(-10).map(m => m.system.memory));
        
        let recommendedInstances = currentInstances;
        
        if (predictedCPU > 80 || predictedMemory > 85) {
            recommendedInstances = Math.min(this.config.maxInstances, currentInstances + 2);
        } else if (predictedCPU > 70 || predictedMemory > 75) {
            recommendedInstances = Math.min(this.config.maxInstances, currentInstances + 1);
        } else if (predictedCPU < 30 && predictedMemory < 40) {
            recommendedInstances = Math.max(this.config.minInstances, currentInstances - 1);
        }
        
        return recommendedInstances;
    }

    calculatePredictionConfidence(metrics) {
        // Simple confidence calculation based on metrics stability
        if (metrics.length < 10) return 0;
        
        const cpuValues = metrics.map(m => m.system.cpu);
        const cpuStdDev = this.calculateStandardDeviation(cpuValues);
        const cpuMean = cpuValues.reduce((sum, val) => sum + val, 0) / cpuValues.length;
        
        const coefficientOfVariation = cpuStdDev / cpuMean;
        const confidence = Math.max(0, 1 - coefficientOfVariation);
        
        return Math.round(confidence * 100) / 100;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(variance);
    }

    proactiveScaling(prediction) {
        const recommendedInstances = prediction.predictions.recommendedInstances;
        const currentInstances = this.instances.size;
        
        if (recommendedInstances > currentInstances) {
            console.log(`🔮 Proactive scaling UP predicted: ${currentInstances} → ${recommendedInstances}`);
            this.scaleUp();
        } else if (recommendedInstances < currentInstances) {
            console.log(`🔮 Proactive scaling DOWN predicted: ${currentInstances} → ${recommendedInstances}`);
            this.scaleDown();
        }
    }

    // Cost optimization
    optimizeCosts() {
        if (!this.config.enableCostOptimization) return;
        
        const runningInstances = Array.from(this.instances.values()).filter(i => i.status === 'running');
        const avgUtilization = runningInstances.reduce((sum, i) => sum + (i.cpu + i.memory) / 2, 0) / runningInstances.length;
        
        // If utilization is consistently low, consider scaling down
        if (avgUtilization < 30 && runningInstances.length > this.config.minInstances) {
            console.log(`💰 Cost optimization: Low utilization (${avgUtilization.toFixed(1)}%), considering scale down`);
            this.scaleDown();
        }
    }

    // Load balancing
    distributeLoad(request) {
        const runningInstances = Array.from(this.instances.values()).filter(i => i.status === 'running');
        
        if (runningInstances.length === 0) {
            throw new Error('No running instances available');
        }
        
        // Select instance with least load
        const selectedInstance = runningInstances.reduce((min, current) => 
            current.requests < min.requests ? current : min
        );
        
        selectedInstance.requests++;
        
        return {
            instanceId: selectedInstance.id,
            instanceLoad: selectedInstance.requests,
            totalInstances: runningInstances.length
        };
    }

    // Public API methods
    getMetrics() {
        return {
            instances: Array.from(this.instances.values()),
            currentMetrics: this.metrics[this.metrics.length - 1] || null,
            scalingHistory: this.scalingHistory.slice(-20),
            predictions: this.predictions.slice(-10),
            config: this.config
        };
    }

    getStatus() {
        const runningInstances = Array.from(this.instances.values()).filter(i => i.status === 'running');
        const healthyInstances = runningInstances.filter(i => i.healthStatus === 'healthy');
        
        return {
            totalInstances: this.instances.size,
            runningInstances: runningInstances.length,
            healthyInstances: healthyInstances.length,
            status: healthyInstances.length === runningInstances.length ? 'healthy' : 'degraded',
            lastScaleTime: this.lastScaleTime,
            uptime: process.uptime()
        };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Auto-scaling configuration updated');
        this.emit('configUpdated', this.config);
    }

    forceScaleUp(count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.instances.size < this.config.maxInstances) {
                this.scaleUp();
            }
        }
    }

    forceScaleDown(count = 1) {
        for (let i = 0; i < count; i++) {
            if (this.instances.size > this.config.minInstances) {
                this.scaleDown();
            }
        }
    }

    // Health check for all instances
    performHealthCheck() {
        const results = [];
        
        this.instances.forEach(instance => {
            const health = {
                instanceId: instance.id,
                status: instance.status,
                healthStatus: instance.healthStatus,
                lastCheck: instance.lastHealthCheck,
                uptime: Date.now() - instance.startTime,
                metrics: {
                    cpu: instance.cpu,
                    memory: instance.memory,
                    requests: instance.requests,
                    responseTime: instance.responseTime
                }
            };
            
            results.push(health);
        });
        
        return results;
    }

    shutdown() {
        console.log('🔄 Shutting down Auto-Scaling System...');
        
        // Terminate all instances
        this.instances.forEach((instance, id) => {
            if (instance.status === 'running') {
                this.removeInstance(id);
            }
        });
        
        console.log('✅ Auto-Scaling System shutdown complete');
    }
}

// Run auto-scaling system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const autoScaling = new AutoScalingSystem();
    
    // Demo scaling events
    setInterval(() => {
        // Simulate load increase
        const instances = Array.from(autoScaling.instances.values());
        instances.forEach(instance => {
            if (instance.status === 'running') {
                instance.requests += Math.floor(Math.random() * 100);
                instance.cpu = Math.min(100, instance.cpu + Math.random() * 10);
                instance.memory = Math.min(100, instance.memory + Math.random() * 5);
            }
        });
    }, 5000);
    
    // Display status every 30 seconds
    setInterval(() => {
        const status = autoScaling.getStatus();
        console.log(`📊 Auto-scaling Status: ${status.healthyInstances}/${status.runningInstances} healthy, ${status.totalInstances} total`);
    }, 30000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        autoScaling.shutdown();
        process.exit(0);
    });
    
    console.log('🎊 Auto-Scaling System started!');
    console.log('📡 Monitoring and scaling automatically...');
}

export default AutoScalingSystem;
