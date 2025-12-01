// AI/ML Analytics System for Predator Analytics
// Advanced predictive analytics and machine learning models

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

class AIMLAnalyticsSystem extends EventEmitter {
    constructor() {
        super();
        this.models = new Map();
        this.trainingData = [];
        this.predictions = [];
        this.anomalies = [];
        this.insights = [];
        
        this.config = {
            enableTimeSeriesForecasting: true,
            enableAnomalyDetection: true,
            enableSentimentAnalysis: true,
            enableRecommendationEngine: true,
            enablePredictiveMaintenance: true,
            modelUpdateInterval: 3600000, // 1 hour
            predictionHorizon: 24, // hours
            anomalyThreshold: 2.5, // standard deviations
            minTrainingSamples: 100,
            modelAccuracyThreshold: 0.85
        };
        
        this.initializeAIAnalytics();
    }

    initializeAIAnalytics() {
        console.log('🤖 Initializing AI/ML Analytics System...');
        
        // Initialize ML models
        this.initializeModels();
        
        // Start data collection
        this.startDataCollection();
        
        // Start model training
        this.startModelTraining();
        
        // Start prediction engine
        this.startPredictionEngine();
        
        // Start anomaly detection
        if (this.config.enableAnomalyDetection) {
            this.startAnomalyDetection();
        }
        
        console.log('✅ AI/ML Analytics System initialized');
    }

    initializeModels() {
        // Time series forecasting model
        this.models.set('timeSeries', {
            type: 'ARIMA',
            parameters: { p: 1, d: 1, q: 1 },
            accuracy: 0,
            lastTrained: null,
            predictions: []
        });
        
        // Anomaly detection model
        this.models.set('anomaly', {
            type: 'IsolationForest',
            parameters: { contamination: 0.1 },
            accuracy: 0,
            lastTrained: null,
            anomalies: []
        });
        
        // Sentiment analysis model
        this.models.set('sentiment', {
            type: 'NaiveBayes',
            parameters: { alpha: 1.0 },
            accuracy: 0,
            lastTrained: null,
            sentiments: []
        });
        
        // Recommendation engine
        this.models.set('recommendation', {
            type: 'CollaborativeFiltering',
            parameters: { n_factors: 50, regularization: 0.01 },
            accuracy: 0,
            lastTrained: null,
            recommendations: []
        });
        
        // Predictive maintenance model
        this.models.set('maintenance', {
            type: 'RandomForest',
            parameters: { n_estimators: 100, max_depth: 10 },
            accuracy: 0,
            lastTrained: null,
            predictions: []
        });
        
        console.log(`🤖 Initialized ${this.models.size} ML models`);
    }

    startDataCollection() {
        setInterval(() => {
            this.collectTrainingData();
        }, 60000); // Every minute
    }

    collectTrainingData() {
        try {
            // Collect system metrics
            const systemMetrics = this.getSystemMetrics();
            
            // Collect API metrics
            const apiMetrics = this.getAPIMetrics();
            
            // Collect user behavior data
            const userMetrics = this.getUserMetrics();
            
            // Collect external data (if available)
            const externalMetrics = this.getExternalMetrics();
            
            const dataPoint = {
                timestamp: Date.now(),
                system: systemMetrics,
                api: apiMetrics,
                user: userMetrics,
                external: externalMetrics
            };
            
            this.trainingData.push(dataPoint);
            
            // Keep only recent data
            if (this.trainingData.length > 10000) {
                this.trainingData = this.trainingData.slice(-5000);
            }
            
            this.emit('dataCollected', dataPoint);
            
        } catch (error) {
            console.error('Error collecting training data:', error);
        }
    }

    getSystemMetrics() {
        try {
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            return {
                cpu: (cpuUsage.user + cpuUsage.system) / 1000000,
                memory: memUsage.heapUsed / memUsage.heapTotal * 100,
                uptime: process.uptime(),
                timestamp: Date.now()
            };
        } catch (error) {
            return { cpu: 0, memory: 0, uptime: 0, timestamp: Date.now() };
        }
    }

    getAPIMetrics() {
        // Simulate API metrics collection
        return {
            requests: Math.floor(Math.random() * 1000),
            errors: Math.floor(Math.random() * 50),
            responseTime: Math.random() * 500,
            timestamp: Date.now()
        };
    }

    getUserMetrics() {
        // Simulate user metrics collection
        return {
            activeUsers: Math.floor(Math.random() * 100),
            sessions: Math.floor(Math.random() * 200),
            bounceRate: Math.random() * 100,
            timestamp: Date.now()
        };
    }

    getExternalMetrics() {
        // Simulate external data collection (Prozorro, NBU, etc.)
        return {
            prozorro: {
                status: Math.random() > 0.1 ? 'online' : 'offline',
                responseTime: Math.random() * 1000,
                timestamp: Date.now()
            },
            nbu: {
                status: Math.random() > 0.05 ? 'online' : 'offline',
                responseTime: Math.random() * 500,
                timestamp: Date.now()
            },
            tax: {
                status: Math.random() > 0.08 ? 'online' : 'offline',
                responseTime: Math.random() * 800,
                timestamp: Date.now()
            },
            customs: {
                status: Math.random() > 0.15 ? 'online' : 'offline',
                responseTime: Math.random() * 2000,
                timestamp: Date.now()
            }
        };
    }

    startModelTraining() {
        setInterval(() => {
            this.trainModels();
        }, this.config.modelUpdateInterval);
    }

    trainModels() {
        if (this.trainingData.length < this.config.minTrainingSamples) {
            console.log(`⏳ Insufficient training data: ${this.trainingData.length}/${this.config.minTrainingSamples}`);
            return;
        }
        
        console.log('🧠 Training ML models...');
        
        // Train time series model
        if (this.config.enableTimeSeriesForecasting) {
            this.trainTimeSeriesModel();
        }
        
        // Train anomaly detection model
        if (this.config.enableAnomalyDetection) {
            this.trainAnomalyDetectionModel();
        }
        
        // Train sentiment analysis model
        if (this.config.enableSentimentAnalysis) {
            this.trainSentimentModel();
        }
        
        // Train recommendation engine
        if (this.config.enableRecommendationEngine) {
            this.trainRecommendationModel();
        }
        
        // Train predictive maintenance model
        if (this.config.enablePredictiveMaintenance) {
            this.trainMaintenanceModel();
        }
        
        console.log('✅ Model training completed');
    }

    trainTimeSeriesModel() {
        const model = this.models.get('timeSeries');
        const data = this.trainingData.slice(-100); // Last 100 data points
        
        // Simple ARIMA-like implementation
        const cpuData = data.map(d => d.system.cpu);
        const memoryData = data.map(d => d.system.memory);
        const requestData = data.map(d => d.api.requests);
        
        // Calculate moving averages and trends
        const cpuForecast = this.simpleForecast(cpuData, 24);
        const memoryForecast = this.simpleForecast(memoryData, 24);
        const requestForecast = this.simpleForecast(requestData, 24);
        
        // Calculate model accuracy (simplified)
        const accuracy = this.calculateForecastAccuracy(cpuData, cpuForecast.slice(0, cpuData.length));
        
        model.predictions = {
            cpu: cpuForecast,
            memory: memoryForecast,
            requests: requestForecast,
            timestamp: Date.now()
        };
        
        model.accuracy = accuracy;
        model.lastTrained = Date.now();
        
        console.log(`📈 Time series model trained (accuracy: ${(accuracy * 100).toFixed(1)}%)`);
    }

    simpleForecast(data, horizon) {
        if (data.length < 3) return Array(horizon).fill(data[0] || 0);
        
        // Simple linear regression forecast
        const n = data.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = data.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * data[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Generate forecast
        const forecast = [];
        for (let i = 0; i < horizon; i++) {
            forecast.push(slope * (n + i) + intercept);
        }
        
        return forecast;
    }

    calculateForecastAccuracy(actual, predicted) {
        if (actual.length !== predicted.length) return 0;
        
        const mse = actual.reduce((sum, val, i) => {
            const diff = val - predicted[i];
            return sum + diff * diff;
        }, 0) / actual.length;
        
        const variance = actual.reduce((sum, val) => {
            const diff = val - (actual.reduce((s, v) => s + v, 0) / actual.length);
            return sum + diff * diff;
        }, 0) / actual.length;
        
        return Math.max(0, 1 - (mse / variance));
    }

    trainAnomalyDetectionModel() {
        const model = this.models.get('anomaly');
        const data = this.trainingData.slice(-200);
        
        // Simple statistical anomaly detection
        const cpuValues = data.map(d => d.system.cpu);
        const memoryValues = data.map(d => d.system.memory);
        const requestValues = data.map(d => d.api.requests);
        
        const cpuStats = this.calculateStatistics(cpuValues);
        const memoryStats = this.calculateStatistics(memoryValues);
        const requestStats = this.calculateStatistics(requestValues);
        
        // Detect anomalies in recent data
        const recentData = this.trainingData.slice(-10);
        const anomalies = [];
        
        recentData.forEach((point, index) => {
            const cpuAnomaly = Math.abs(point.system.cpu - cpuStats.mean) > this.config.anomalyThreshold * cpuStats.stdDev;
            const memoryAnomaly = Math.abs(point.system.memory - memoryStats.mean) > this.config.anomalyThreshold * memoryStats.stdDev;
            const requestAnomaly = Math.abs(point.api.requests - requestStats.mean) > this.config.anomalyThreshold * requestStats.stdDev;
            
            if (cpuAnomaly || memoryAnomaly || requestAnomaly) {
                anomalies.push({
                    timestamp: point.timestamp,
                    type: cpuAnomaly ? 'cpu' : memoryAnomaly ? 'memory' : 'requests',
                    value: cpuAnomaly ? point.system.cpu : memoryAnomaly ? point.system.memory : point.api.requests,
                    expected: cpuAnomaly ? cpuStats.mean : memoryAnomaly ? memoryStats.mean : requestStats.mean,
                    deviation: cpuAnomaly ? 
                        Math.abs(point.system.cpu - cpuStats.mean) / cpuStats.stdDev :
                        memoryAnomaly ? 
                            Math.abs(point.system.memory - memoryStats.mean) / memoryStats.stdDev :
                            Math.abs(point.api.requests - requestStats.mean) / requestStats.stdDev
                });
            }
        });
        
        model.anomalies = anomalies;
        model.lastTrained = Date.now();
        
        // Add to global anomalies list
        this.anomalies.push(...anomalies);
        
        console.log(`🚨 Anomaly detection model trained (${anomalies.length} anomalies detected)`);
    }

    calculateStatistics(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        return { mean, variance, stdDev, min, max };
    }

    trainSentimentModel() {
        const model = this.models.get('sentiment');
        
        // Simulate sentiment analysis training
        const sentiments = [
            { text: 'System running smoothly', sentiment: 'positive' },
            { text: 'Performance issues detected', sentiment: 'negative' },
            { text: 'API response times improved', sentiment: 'positive' },
            { text: 'Error rate increasing', sentiment: 'negative' },
            { text: 'User satisfaction high', sentiment: 'positive' }
        ];
        
        // Simple keyword-based sentiment analysis
        const positiveKeywords = ['smoothly', 'improved', 'high', 'good', 'excellent', 'fast'];
        const negativeKeywords = ['issues', 'error', 'slow', 'problem', 'fail', 'decreasing'];
        
        model.sentiments = sentiments;
        model.positiveKeywords = positiveKeywords;
        model.negativeKeywords = negativeKeywords;
        model.lastTrained = Date.now();
        
        console.log('💭 Sentiment analysis model trained');
    }

    trainRecommendationModel() {
        const model = this.models.get('recommendation');
        
        // Simulate recommendation engine training
        const userBehavior = [
            { userId: 'user1', action: 'view_dashboard', frequency: 10 },
            { userId: 'user1', action: 'check_api_status', frequency: 8 },
            { userId: 'user2', action: 'view_analytics', frequency: 15 },
            { userId: 'user2', action: 'export_data', frequency: 5 }
        ];
        
        // Simple collaborative filtering
        const recommendations = [
            { userId: 'user1', recommendation: 'view_analytics', confidence: 0.8 },
            { userId: 'user1', recommendation: 'export_data', confidence: 0.6 },
            { userId: 'user2', recommendation: 'view_dashboard', confidence: 0.7 },
            { userId: 'user2', recommendation: 'check_api_status', confidence: 0.5 }
        ];
        
        model.recommendations = recommendations;
        model.lastTrained = Date.now();
        
        console.log('🎯 Recommendation engine trained');
    }

    trainMaintenanceModel() {
        const model = this.models.get('maintenance');
        
        // Simulate predictive maintenance training
        const systemHealth = this.trainingData.slice(-100).map(d => ({
            timestamp: d.timestamp,
            cpu: d.system.cpu,
            memory: d.system.memory,
            uptime: d.system.uptime,
            errors: d.api.errors,
            responseTime: d.api.responseTime
        }));
        
        // Simple rule-based maintenance prediction
        const predictions = systemHealth.map(point => ({
            timestamp: point.timestamp,
            maintenanceNeeded: point.cpu > 80 || point.memory > 85 || point.errors > 20,
            urgency: point.cpu > 95 || point.memory > 90 ? 'high' : 'medium',
            estimatedTime: point.cpu > 80 ? 24 : 48 // hours
        }));
        
        model.predictions = predictions;
        model.lastTrained = Date.now();
        
        console.log('🔧 Predictive maintenance model trained');
    }

    startPredictionEngine() {
        setInterval(() => {
            this.generatePredictions();
        }, 300000); // Every 5 minutes
    }

    generatePredictions() {
        const predictions = [];
        
        // Generate time series predictions
        if (this.config.enableTimeSeriesForecasting) {
            const timeSeriesModel = this.models.get('timeSeries');
            if (timeSeriesModel.predictions) {
                predictions.push({
                    type: 'time_series',
                    model: 'timeSeries',
                    predictions: timeSeriesModel.predictions,
                    confidence: timeSeriesModel.accuracy,
                    timestamp: Date.now()
                });
            }
        }
        
        // Generate maintenance predictions
        if (this.config.enablePredictiveMaintenance) {
            const maintenanceModel = this.models.get('maintenance');
            if (maintenanceModel.predictions && maintenanceModel.predictions.length > 0) {
                const latestPrediction = maintenanceModel.predictions[maintenanceModel.predictions.length - 1];
                predictions.push({
                    type: 'maintenance',
                    model: 'maintenance',
                    prediction: latestPrediction,
                    timestamp: Date.now()
                });
            }
        }
        
        // Generate recommendations
        if (this.config.enableRecommendationEngine) {
            const recommendationModel = this.models.get('recommendation');
            if (recommendationModel.recommendations) {
                predictions.push({
                    type: 'recommendation',
                    model: 'recommendation',
                    recommendations: recommendationModel.recommendations,
                    timestamp: Date.now()
                });
            }
        }
        
        this.predictions.push(...predictions);
        
        // Keep only recent predictions
        if (this.predictions.length > 100) {
            this.predictions = this.predictions.slice(-50);
        }
        
        this.emit('predictionsGenerated', predictions);
    }

    startAnomalyDetection() {
        setInterval(() => {
            this.detectAnomalies();
        }, 60000); // Every minute
    }

    detectAnomalies() {
        const recentData = this.trainingData.slice(-5);
        const anomalies = [];
        
        recentData.forEach(point => {
            // Check for system anomalies
            if (point.system.cpu > 90) {
                anomalies.push({
                    timestamp: point.timestamp,
                    type: 'system',
                    metric: 'cpu',
                    value: point.system.cpu,
                    severity: 'high'
                });
            }
            
            if (point.system.memory > 95) {
                anomalies.push({
                    timestamp: point.timestamp,
                    type: 'system',
                    metric: 'memory',
                    value: point.system.memory,
                    severity: 'critical'
                });
            }
            
            // Check for API anomalies
            if (point.api.errors > 50) {
                anomalies.push({
                    timestamp: point.timestamp,
                    type: 'api',
                    metric: 'errors',
                    value: point.api.errors,
                    severity: 'high'
                });
            }
            
            if (point.api.responseTime > 1000) {
                anomalies.push({
                    timestamp: point.timestamp,
                    type: 'api',
                    metric: 'response_time',
                    value: point.api.responseTime,
                    severity: 'medium'
                });
            }
        });
        
        if (anomalies.length > 0) {
            this.anomalies.push(...anomalies);
            this.emit('anomaliesDetected', anomalies);
            console.log(`🚨 ${anomalies.length} anomalies detected`);
        }
    }

    // Public API methods
    analyzeSentiment(text) {
        const model = this.models.get('sentiment');
        if (!model.positiveKeywords || !model.negativeKeywords) {
            return { sentiment: 'neutral', confidence: 0.5 };
        }
        
        const words = text.toLowerCase().split(' ');
        const positiveScore = words.filter(word => model.positiveKeywords.includes(word)).length;
        const negativeScore = words.filter(word => model.negativeKeywords.includes(word)).length;
        
        if (positiveScore > negativeScore) {
            return { sentiment: 'positive', confidence: positiveScore / words.length };
        } else if (negativeScore > positiveScore) {
            return { sentiment: 'negative', confidence: negativeScore / words.length };
        } else {
            return { sentiment: 'neutral', confidence: 0.5 };
        }
    }

    getRecommendations(userId) {
        const model = this.models.get('recommendation');
        if (!model.recommendations) return [];
        
        return model.recommendations.filter(rec => rec.userId === userId);
    }

    predictMaintenance() {
        const model = this.models.get('maintenance');
        if (!model.predictions || model.predictions.length === 0) {
            return { maintenanceNeeded: false, urgency: 'none', estimatedTime: 0 };
        }
        
        const latestPrediction = model.predictions[model.predictions.length - 1];
        return latestPrediction;
    }

    getForecast(horizon = 24) {
        const model = this.models.get('timeSeries');
        if (!model.predictions) {
            return { cpu: [], memory: [], requests: [] };
        }
        
        return {
            cpu: model.predictions.cpu.slice(0, horizon),
            memory: model.predictions.memory.slice(0, horizon),
            requests: model.predictions.requests.slice(0, horizon)
        };
    }

    getAnomalies(timeRange = 3600000) { // 1 hour default
        const cutoff = Date.now() - timeRange;
        return this.anomalies.filter(anomaly => anomaly.timestamp > cutoff);
    }

    getInsights() {
        const insights = [];
        
        // Generate insights from predictions
        const timeSeriesModel = this.models.get('timeSeries');
        if (timeSeriesModel.predictions && timeSeriesModel.predictions.cpu) {
            const avgCpuForecast = timeSeriesModel.predictions.cpu.reduce((sum, val) => sum + val, 0) / timeSeriesModel.predictions.cpu.length;
            
            if (avgCpuForecast > 80) {
                insights.push({
                    type: 'performance',
                    message: 'High CPU usage predicted in next 24 hours',
                    recommendation: 'Consider scaling up resources',
                    priority: 'high',
                    timestamp: Date.now()
                });
            }
        }
        
        // Generate insights from anomalies
        const recentAnomalies = this.getAnomalies();
        if (recentAnomalies.length > 5) {
            insights.push({
                type: 'anomaly',
                message: `High anomaly rate detected: ${recentAnomalies.length} in last hour`,
                recommendation: 'Investigate system performance and stability',
                priority: 'medium',
                timestamp: Date.now()
            });
        }
        
        // Generate insights from maintenance predictions
        const maintenancePrediction = this.predictMaintenance();
        if (maintenancePrediction.maintenanceNeeded) {
            insights.push({
                type: 'maintenance',
                message: 'System maintenance predicted',
                recommendation: `Schedule maintenance within ${maintenancePrediction.estimatedTime} hours`,
                priority: maintenancePrediction.urgency === 'high' ? 'high' : 'medium',
                timestamp: Date.now()
            });
        }
        
        this.insights = insights;
        return insights;
    }

    getModelStatus() {
        const status = {};
        
        this.models.forEach((model, name) => {
            status[name] = {
                type: model.type,
                accuracy: model.accuracy,
                lastTrained: model.lastTrained,
                status: model.lastTrained ? 'trained' : 'untrained'
            };
        });
        
        return status;
    }

    getAnalyticsSummary() {
        return {
            models: this.getModelStatus(),
            trainingData: {
                samples: this.trainingData.length,
                timeRange: this.trainingData.length > 0 ? 
                    Date.now() - this.trainingData[0].timestamp : 0
            },
            predictions: {
                total: this.predictions.length,
                recent: this.predictions.slice(-10).length
            },
            anomalies: {
                total: this.anomalies.length,
                recent: this.getAnomalies().length
            },
            insights: this.getInsights(),
            config: this.config
        };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ AI/ML Analytics configuration updated');
        this.emit('configUpdated', this.config);
    }

    shutdown() {
        console.log('🔄 Shutting down AI/ML Analytics System...');
        
        // Save models and data
        this.saveModels();
        
        console.log('✅ AI/ML Analytics System shutdown complete');
    }

    saveModels() {
        try {
            const modelData = {
                models: Object.fromEntries(this.models),
                trainingData: this.trainingData.slice(-1000), // Save last 1000 samples
                predictions: this.predictions.slice(-100),
                anomalies: this.anomalies.slice(-100),
                insights: this.insights,
                config: this.config,
                timestamp: Date.now()
            };
            
            writeFileSync('./ai-ml-models.json', JSON.stringify(modelData, null, 2));
            console.log('💾 AI/ML models saved to file');
        } catch (error) {
            console.error('Error saving models:', error);
        }
    }
}

// Run AI/ML analytics system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const aiML = new AIMLAnalyticsSystem();
    
    // Demo predictions every 30 seconds
    setInterval(() => {
        const insights = aiML.getInsights();
        if (insights.length > 0) {
            console.log('💡 AI Insights:', insights.map(i => i.message).join(', '));
        }
    }, 30000);
    
    // Display model status every 2 minutes
    setInterval(() => {
        const status = aiML.getModelStatus();
        console.log('🤖 Model Status:', Object.entries(status).map(([name, model]) => 
            `${name}: ${model.status} (${(model.accuracy * 100).toFixed(1)}%)`
        ).join(', '));
    }, 120000);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        aiML.shutdown();
        process.exit(0);
    });
    
    console.log('🎊 AI/ML Analytics System started!');
    console.log('🧠 Training models and generating predictions...');
}

export default AIMLAnalyticsSystem;
