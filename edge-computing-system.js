// Edge Computing System for Predator Analytics
// Distributed edge processing and caching

import { EventEmitter } from 'events';
import { createHash, randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class EdgeComputingSystem extends EventEmitter {
    constructor() {
        super();
        this.edgeNodes = new Map();
        this.edgeClusters = new Map();
        this.edgeServices = new Map();
        this.edgeCache = new Map();
        this.edgeMetrics = new Map();
        this.edgeWorkloads = new Map();
        
        this.config = {
            enableEdgeNodes: true,
            enableEdgeClusters: true,
            enableEdgeServices: true,
            enableEdgeCache: true,
            enableEdgeMetrics: true,
            enableAutoScaling: true,
            enableLoadBalancing: true,
            enableFailover: true,
            maxEdgeNodes: 10,
            defaultEdgeNodeCapacity: 1000,
            edgeCacheSize: 1024 * 1024 * 1024, // 1GB
            edgeServiceTimeout: 30000, // 30 seconds
            edgeHealthCheckInterval: 30000, // 30 seconds
            edgeMetricsInterval: 60000, // 1 minute
            enableGeographicDistribution: true,
            enableLatencyOptimization: true,
            enableDataPreprocessing: true
        };
        
        this.initializeEdgeComputing();
    }

    initializeEdgeComputing() {
        console.log('🌐 Initializing Edge Computing System...');
        
        // Load existing edge data
        this.loadEdgeData();
        
        // Initialize edge nodes
        if (this.config.enableEdgeNodes) {
            // Edge nodes are created during load/create process
        }
        
        // Initialize edge clusters
        if (this.config.enableEdgeClusters) {
            // Edge clusters are created during load/create process
        }
        
        // Initialize edge services
        if (this.config.enableEdgeServices) {
            // Edge services are created during load/create process
        }
        
        // Start health checks
        this.startEdgeHealthChecks();
        
        // Start metrics collection
        if (this.config.enableEdgeMetrics) {
            this.startEdgeMetricsCollection();
        }
        
        // Start auto-scaling
        if (this.config.enableAutoScaling) {
            this.startEdgeAutoScaling();
        }
        
        console.log('✅ Edge Computing System initialized');
    }

    // Edge Node Management
    createEdgeNode(nodeData) {
        const nodeId = this.generateNodeId();
        const node = {
            id: nodeId,
            name: nodeData.name || `edge-node-${nodeId}`,
            location: nodeData.location || 'default',
            region: nodeData.region || 'us-east-1',
            zone: nodeData.zone || 'us-east-1a',
            ipAddress: nodeData.ipAddress || this.generateIPAddress(),
            port: nodeData.port || 8080,
            status: 'initializing',
            capacity: nodeData.capacity || this.config.defaultEdgeNodeCapacity,
            currentLoad: 0,
            services: new Set(),
            cache: {
                size: 0,
                maxSize: this.config.edgeCacheSize / this.config.maxEdgeNodes,
                entries: new Map(),
                hits: 0,
                misses: 0
            },
            metrics: {
                requests: 0,
                responseTime: 0,
                cpu: 0,
                memory: 0,
                network: 0,
                errors: 0,
                uptime: 0,
                lastHealthCheck: null
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {
                version: nodeData.version || '1.0.0',
                tags: nodeData.tags || [],
                description: nodeData.description || ''
            }
        };
        
        // Initialize node resources
        this.initializeNodeResources(node);
        
        // Store node
        this.edgeNodes.set(nodeId, node);
        
        // Add to cluster
        if (nodeData.clusterId) {
            this.addNodeToCluster(nodeData.clusterId, nodeId);
        }
        
        // Start node
        this.startEdgeNode(nodeId);
        
        this.emit('edgeNodeCreated', node);
        
        console.log(`🌐 Edge node created: ${node.name} (${node.id}) in ${node.location}`);
        
        return node;
    }

    initializeNodeResources(node) {
        // Initialize node-specific resources
        console.log(`🔧 Initializing resources for edge node: ${node.id}`);
    }

    startEdgeNode(nodeId) {
        const node = this.edgeNodes.get(nodeId);
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        // Simulate node startup
        setTimeout(() => {
            node.status = 'active';
            node.updatedAt = Date.now();
            node.metrics.uptime = Date.now() - node.createdAt;
            
            this.emit('edgeNodeStarted', node);
            
            console.log(`🚀 Edge node started: ${node.name} (${node.id})`);
        }, 2000);
    }

    stopEdgeNode(nodeId) {
        const node = this.edgeNodes.get(nodeId);
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        node.status = 'stopping';
        
        // Stop all services on this node
        for (const serviceId of node.services) {
            this.stopEdgeService(serviceId);
        }
        
        // Simulate node shutdown
        setTimeout(() => {
            node.status = 'stopped';
            node.updatedAt = Date.now();
            
            this.emit('edgeNodeStopped', node);
            
            console.log(`🛑 Edge node stopped: ${node.name} (${node.id})`);
        }, 1000);
        
        return true;
    }

    deleteEdgeNode(nodeId) {
        const node = this.edgeNodes.get(nodeId);
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        // Stop node first
        if (node.status === 'active') {
            this.stopEdgeNode(nodeId);
        }
        
        // Remove from cluster
        for (const [clusterId, cluster] of this.edgeClusters.entries()) {
            if (cluster.nodes.has(nodeId)) {
                cluster.nodes.delete(nodeId);
            }
        }
        
        // Clean up node resources
        this.cleanupNodeResources(nodeId);
        
        // Remove node
        this.edgeNodes.delete(nodeId);
        
        this.emit('edgeNodeDeleted', node);
        
        console.log(`🗑️ Edge node deleted: ${node.name} (${node.id})`);
        
        return true;
    }

    cleanupNodeResources(nodeId) {
        // Clean up node-specific resources
        console.log(`🧹 Cleaning up resources for edge node: ${nodeId}`);
    }

    // Edge Cluster Management
    createEdgeCluster(clusterData) {
        const clusterId = this.generateClusterId();
        const cluster = {
            id: clusterId,
            name: clusterData.name || `edge-cluster-${clusterId}`,
            type: clusterData.type || 'geographic',
            strategy: clusterData.strategy || 'round-robin',
            nodes: new Set(),
            loadBalancer: {
                algorithm: clusterData.loadBalancer || 'round-robin',
                healthCheck: true,
                failover: true
            },
            autoScaling: {
                enabled: clusterData.autoScaling || false,
                minNodes: clusterData.minNodes || 1,
                maxNodes: clusterData.maxNodes || 5,
                scaleUpThreshold: clusterData.scaleUpThreshold || 80,
                scaleDownThreshold: clusterData.scaleDownThreshold || 20
            },
            metrics: {
                totalRequests: 0,
                avgResponseTime: 0,
                totalCapacity: 0,
                usedCapacity: 0,
                activeNodes: 0,
                failedNodes: 0
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {
                description: clusterData.description || '',
                tags: clusterData.tags || []
            }
        };
        
        // Store cluster
        this.edgeClusters.set(clusterId, cluster);
        
        this.emit('edgeClusterCreated', cluster);
        
        console.log(`🏗️ Edge cluster created: ${cluster.name} (${cluster.id})`);
        
        return cluster;
    }

    addNodeToCluster(clusterId, nodeId) {
        const cluster = this.edgeClusters.get(clusterId);
        const node = this.edgeNodes.get(nodeId);
        
        if (!cluster) {
            throw new Error('Edge cluster not found');
        }
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        cluster.nodes.add(nodeId);
        cluster.updatedAt = Date.now();
        
        // Update cluster metrics
        cluster.metrics.totalCapacity += node.capacity;
        cluster.metrics.activeNodes++;
        
        this.emit('nodeAddedToCluster', { cluster, node });
        
        console.log(`🔗 Node ${node.name} added to cluster ${cluster.name}`);
        
        return true;
    }

    removeNodeFromCluster(clusterId, nodeId) {
        const cluster = this.edgeClusters.get(clusterId);
        const node = this.edgeNodes.get(nodeId);
        
        if (!cluster) {
            throw new Error('Edge cluster not found');
        }
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        cluster.nodes.delete(nodeId);
        cluster.updatedAt = Date.now();
        
        // Update cluster metrics
        cluster.metrics.totalCapacity -= node.capacity;
        cluster.metrics.activeNodes--;
        
        this.emit('nodeRemovedFromCluster', { cluster, node });
        
        console.log(`🔗 Node ${node.name} removed from cluster ${cluster.name}`);
        
        return true;
    }

    // Edge Service Management
    deployEdgeService(serviceData) {
        const serviceId = this.generateServiceId();
        const service = {
            id: serviceId,
            name: serviceData.name || `edge-service-${serviceId}`,
            type: serviceData.type || 'microservice',
            version: serviceData.version || '1.0.0',
            image: serviceData.image || 'predator/analytics:latest',
            replicas: serviceData.replicas || 1,
            resources: {
                cpu: serviceData.cpu || '100m',
                memory: serviceData.memory || '128Mi',
                storage: serviceData.storage || '100Mi'
            },
            endpoints: serviceData.endpoints || [],
            environment: serviceData.environment || {},
            dependencies: serviceData.dependencies || [],
            healthCheck: {
                path: serviceData.healthCheckPath || '/health',
                interval: serviceData.healthCheckInterval || 30000,
                timeout: serviceData.healthCheckTimeout || 5000
            },
            status: 'deploying',
            nodes: new Set(),
            metrics: {
                requests: 0,
                responseTime: 0,
                errors: 0,
                uptime: 0,
                lastHealthCheck: null
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: {
                description: serviceData.description || '',
                tags: serviceData.tags || []
            }
        };
        
        // Store service
        this.edgeServices.set(serviceId, service);
        
        // Deploy service to nodes
        this.deployServiceToNodes(service);
        
        this.emit('edgeServiceDeployed', service);
        
        console.log(`🚀 Edge service deployed: ${service.name} (${service.id})`);
        
        return service;
    }

    deployServiceToNodes(service) {
        const availableNodes = Array.from(this.edgeNodes.values())
            .filter(node => node.status === 'active')
            .filter(node => node.currentLoad < node.capacity)
            .sort((a, b) => a.currentLoad - b.currentLoad)
            .slice(0, service.replicas);
        
        for (const node of availableNodes) {
            this.deployServiceToNode(service.id, node.id);
        }
        
        if (availableNodes.length === 0) {
            service.status = 'failed';
            console.log(`❌ No available nodes for service: ${service.name}`);
        }
    }

    deployServiceToNode(serviceId, nodeId) {
        const service = this.edgeServices.get(serviceId);
        const node = this.edgeNodes.get(nodeId);
        
        if (!service) {
            throw new Error('Edge service not found');
        }
        
        if (!node) {
            throw new Error('Edge node not found');
        }
        
        // Add service to node
        node.services.add(serviceId);
        node.currentLoad += this.calculateServiceLoad(service);
        
        // Add node to service
        service.nodes.add(nodeId);
        
        // Simulate service deployment
        setTimeout(() => {
            if (service.status !== 'failed') {
                service.status = 'running';
                service.updatedAt = Date.now();
                service.metrics.uptime = Date.now() - service.createdAt;
            }
        }, 3000);
        
        this.emit('serviceDeployedToNode', { service, node });
        
        console.log(`🔧 Service ${service.name} deployed to node ${node.name}`);
        
        return true;
    }

    calculateServiceLoad(service) {
        // Calculate service load based on resources
        const cpuLoad = parseInt(service.resources.cpu) || 100;
        const memoryLoad = parseInt(service.resources.memory) || 128;
        
        return (cpuLoad + memoryLoad) / 2;
    }

    stopEdgeService(serviceId) {
        const service = this.edgeServices.get(serviceId);
        
        if (!service) {
            throw new Error('Edge service not found');
        }
        
        service.status = 'stopping';
        
        // Stop service on all nodes
        for (const nodeId of service.nodes) {
            this.stopServiceOnNode(serviceId, nodeId);
        }
        
        // Simulate service stop
        setTimeout(() => {
            service.status = 'stopped';
            service.updatedAt = Date.now();
            
            this.emit('edgeServiceStopped', service);
            
            console.log(`🛑 Edge service stopped: ${service.name} (${service.id})`);
        }, 2000);
        
        return true;
    }

    stopServiceOnNode(serviceId, nodeId) {
        const service = this.edgeServices.get(serviceId);
        const node = this.edgeNodes.get(nodeId);
        
        if (!service || !node) {
            return false;
        }
        
        // Remove service from node
        node.services.delete(serviceId);
        node.currentLoad -= this.calculateServiceLoad(service);
        
        // Remove node from service
        service.nodes.delete(nodeId);
        
        this.emit('serviceStoppedOnNode', { service, node });
        
        console.log(`🔧 Service ${service.name} stopped on node ${node.name}`);
        
        return true;
    }

    deleteEdgeService(serviceId) {
        const service = this.edgeServices.get(serviceId);
        
        if (!service) {
            throw new Error('Edge service not found');
        }
        
        // Stop service first
        if (service.status === 'running') {
            this.stopEdgeService(serviceId);
        }
        
        // Remove service
        this.edgeServices.delete(serviceId);
        
        this.emit('edgeServiceDeleted', service);
        
        console.log(`🗑️ Edge service deleted: ${service.name} (${service.id})`);
        
        return true;
    }

    // Edge Cache Operations
    setEdgeCache(nodeId, key, value, ttl = null) {
        if (!this.config.enableEdgeCache) {
            return false;
        }
        
        const node = this.edgeNodes.get(nodeId);
        
        if (!node) {
            return false;
        }
        
        const cacheKey = `${nodeId}:${key}`;
        const cacheValue = {
            value: value,
            ttl: ttl || 3600,
            createdAt: Date.now(),
            expiresAt: Date.now() + (ttl || 3600) * 1000,
            size: JSON.stringify(value).length
        };
        
        // Check cache size limit
        if (node.cache.size + cacheValue.size > node.cache.maxSize) {
            this.evictLRUCache(node);
        }
        
        node.cache.entries.set(cacheKey, cacheValue);
        node.cache.size += cacheValue.size;
        
        this.emit('edgeCacheSet', { nodeId, key, value });
        
        return true;
    }

    getEdgeCache(nodeId, key) {
        if (!this.config.enableEdgeCache) {
            return null;
        }
        
        const node = this.edgeNodes.get(nodeId);
        
        if (!node) {
            return null;
        }
        
        const cacheKey = `${nodeId}:${key}`;
        const cacheValue = node.cache.entries.get(cacheKey);
        
        if (!cacheValue) {
            node.cache.misses++;
            return null;
        }
        
        // Check if expired
        if (cacheValue.expiresAt < Date.now()) {
            node.cache.entries.delete(cacheKey);
            node.cache.size -= cacheValue.size;
            node.cache.misses++;
            return null;
        }
        
        node.cache.hits++;
        
        this.emit('edgeCacheGet', { nodeId, key, hit: true });
        
        return cacheValue.value;
    }

    evictLRUCache(node) {
        // Find least recently used entry
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, value] of node.cache.entries.entries()) {
            if (value.createdAt < oldestTime) {
                oldestTime = value.createdAt;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            const evictedValue = node.cache.entries.get(oldestKey);
            node.cache.entries.delete(oldestKey);
            node.cache.size -= evictedValue.size;
            
            this.emit('edgeCacheEvicted', { nodeId: node.id, key: oldestKey });
        }
    }

    // Edge Request Routing
    routeEdgeRequest(request) {
        // Find best node for request
        const bestNode = this.findBestNodeForRequest(request);
        
        if (!bestNode) {
            throw new Error('No available edge nodes');
        }
        
        // Update node metrics
        bestNode.metrics.requests++;
        bestNode.currentLoad++;
        
        // Check cache first
        if (request.cacheKey) {
            const cachedResponse = this.getEdgeCache(bestNode.id, request.cacheKey);
            if (cachedResponse) {
                bestNode.currentLoad--;
                return {
                    source: 'cache',
                    node: bestNode,
                    response: cachedResponse
                };
            }
        }
        
        // Process request on node
        const response = this.processRequestOnNode(bestNode, request);
        
        // Cache response if applicable
        if (request.cacheKey && response.cacheable) {
            this.setEdgeCache(bestNode.id, request.cacheKey, response.data, response.ttl);
        }
        
        bestNode.currentLoad--;
        
        return {
            source: 'node',
            node: bestNode,
            response: response.data
        };
    }

    findBestNodeForRequest(request) {
        const availableNodes = Array.from(this.edgeNodes.values())
            .filter(node => node.status === 'active')
            .filter(node => node.currentLoad < node.capacity);
        
        if (availableNodes.length === 0) {
            return null;
        }
        
        // Geographic routing if enabled
        if (this.config.enableGeographicDistribution && request.location) {
            const nearbyNodes = availableNodes.filter(node => 
                node.location === request.location || node.region === request.region
            );
            
            if (nearbyNodes.length > 0) {
                return this.selectNodeByLoad(nearbyNodes);
            }
        }
        
        // Latency optimization if enabled
        if (this.config.enableLatencyOptimization) {
            return this.selectNodeByLatency(availableNodes);
        }
        
        // Default load-based selection
        return this.selectNodeByLoad(availableNodes);
    }

    selectNodeByLoad(nodes) {
        return nodes.reduce((best, node) => 
            node.currentLoad < best.currentLoad ? node : best
        );
    }

    selectNodeByLatency(nodes) {
        // Simulate latency-based selection
        return nodes.reduce((best, node) => 
            node.metrics.responseTime < best.metrics.responseTime ? node : best
        );
    }

    processRequestOnNode(node, request) {
        // Simulate request processing
        const startTime = Date.now();
        
        // Data preprocessing if enabled
        let processedData = request.data;
        if (this.config.enableDataPreprocessing) {
            processedData = this.preprocessData(request.data);
        }
        
        // Simulate processing time
        const processingTime = Math.random() * 100 + 50; // 50-150ms
        const response = {
            data: processedData,
            cacheable: request.cacheable || false,
            ttl: request.ttl || 3600,
            processingTime: processingTime
        };
        
        // Update node metrics
        const actualTime = Date.now() - startTime;
        node.metrics.responseTime = (node.metrics.responseTime + actualTime) / 2;
        
        return response;
    }

    preprocessData(data) {
        // Simulate data preprocessing
        if (typeof data === 'object') {
            return {
                ...data,
                processed: true,
                timestamp: Date.now(),
                edgeProcessed: true
            };
        }
        
        return data;
    }

    // Edge Health Checks
    startEdgeHealthChecks() {
        setInterval(() => {
            this.performEdgeHealthChecks();
        }, this.config.edgeHealthCheckInterval);
    }

    performEdgeHealthChecks() {
        for (const node of this.edgeNodes.values()) {
            this.checkNodeHealth(node);
        }
        
        for (const service of this.edgeServices.values()) {
            this.checkServiceHealth(service);
        }
    }

    checkNodeHealth(node) {
        // Simulate health check
        const isHealthy = Math.random() > 0.05; // 95% healthy
        
        if (isHealthy) {
            if (node.status === 'unhealthy') {
                node.status = 'active';
                this.emit('nodeRecovered', node);
            }
        } else {
            node.status = 'unhealthy';
            node.metrics.errors++;
            this.emit('nodeUnhealthy', node);
        }
        
        node.metrics.lastHealthCheck = Date.now();
    }

    checkServiceHealth(service) {
        // Simulate health check
        const isHealthy = Math.random() > 0.05; // 95% healthy
        
        if (isHealthy) {
            if (service.status === 'unhealthy') {
                service.status = 'running';
                this.emit('serviceRecovered', service);
            }
        } else {
            service.status = 'unhealthy';
            service.metrics.errors++;
            this.emit('serviceUnhealthy', service);
        }
        
        service.metrics.lastHealthCheck = Date.now();
    }

    // Edge Metrics Collection
    startEdgeMetricsCollection() {
        setInterval(() => {
            this.collectEdgeMetrics();
        }, this.config.edgeMetricsInterval);
    }

    collectEdgeMetrics() {
        for (const node of this.edgeNodes.values()) {
            this.collectNodeMetrics(node);
        }
        
        for (const cluster of this.edgeClusters.values()) {
            this.collectClusterMetrics(cluster);
        }
        
        for (const service of this.edgeServices.values()) {
            this.collectServiceMetrics(service);
        }
    }

    collectNodeMetrics(node) {
        // Simulate metrics collection
        node.metrics.cpu = Math.random() * 100;
        node.metrics.memory = Math.random() * 100;
        node.metrics.network = Math.random() * 100;
        node.metrics.uptime = Date.now() - node.createdAt;
        
        this.emit('nodeMetricsCollected', { nodeId: node.id, metrics: node.metrics });
    }

    collectClusterMetrics(cluster) {
        let totalRequests = 0;
        let totalResponseTime = 0;
        let totalCapacity = 0;
        let usedCapacity = 0;
        let activeNodes = 0;
        let failedNodes = 0;
        
        for (const nodeId of cluster.nodes) {
            const node = this.edgeNodes.get(nodeId);
            if (node) {
                totalRequests += node.metrics.requests;
                totalResponseTime += node.metrics.responseTime;
                totalCapacity += node.capacity;
                usedCapacity += node.currentLoad;
                
                if (node.status === 'active') {
                    activeNodes++;
                } else {
                    failedNodes++;
                }
            }
        }
        
        cluster.metrics.totalRequests = totalRequests;
        cluster.metrics.avgResponseTime = activeNodes > 0 ? totalResponseTime / activeNodes : 0;
        cluster.metrics.totalCapacity = totalCapacity;
        cluster.metrics.usedCapacity = usedCapacity;
        cluster.metrics.activeNodes = activeNodes;
        cluster.metrics.failedNodes = failedNodes;
        
        this.emit('clusterMetricsCollected', { clusterId: cluster.id, metrics: cluster.metrics });
    }

    collectServiceMetrics(service) {
        // Simulate service metrics
        service.metrics.uptime = service.status === 'running' ? 
            Date.now() - service.createdAt : service.metrics.uptime;
        
        this.emit('serviceMetricsCollected', { serviceId: service.id, metrics: service.metrics });
    }

    // Edge Auto-scaling
    startEdgeAutoScaling() {
        setInterval(() => {
            this.performEdgeAutoScaling();
        }, 120000); // Every 2 minutes
    }

    performEdgeAutoScaling() {
        for (const cluster of this.edgeClusters.values()) {
            if (cluster.autoScaling.enabled) {
                this.scaleCluster(cluster);
            }
        }
    }

    scaleCluster(cluster) {
        const utilization = (cluster.metrics.usedCapacity / cluster.metrics.totalCapacity) * 100;
        
        // Scale up if utilization is high
        if (utilization > cluster.autoScaling.scaleUpThreshold) {
            const currentNodes = cluster.nodes.size;
            const maxNodes = cluster.autoScaling.maxNodes;
            
            if (currentNodes < maxNodes) {
                this.scaleUpCluster(cluster);
            }
        }
        
        // Scale down if utilization is low
        if (utilization < cluster.autoScaling.scaleDownThreshold) {
            const currentNodes = cluster.nodes.size;
            const minNodes = cluster.autoScaling.minNodes;
            
            if (currentNodes > minNodes) {
                this.scaleDownCluster(cluster);
            }
        }
    }

    scaleUpCluster(cluster) {
        const newNode = this.createEdgeNode({
            name: `${cluster.name}-node-${Date.now()}`,
            location: cluster.nodes.size > 0 ? 
                this.edgeNodes.get(Array.from(cluster.nodes)[0]).location : 'default',
            clusterId: cluster.id
        });
        
        this.addNodeToCluster(cluster.id, newNode.id);
        
        this.emit('clusterScaledUp', { cluster, newNode });
        
        console.log(`📈 Cluster ${cluster.name} scaled up with node ${newNode.name}`);
    }

    scaleDownCluster(cluster) {
        const nodeIds = Array.from(cluster.nodes);
        const leastLoadedNodeId = nodeIds.reduce((least, nodeId) => {
            const node = this.edgeNodes.get(nodeId);
            const leastNode = this.edgeNodes.get(least);
            return node.currentLoad < leastNode.currentLoad ? nodeId : least;
        });
        
        this.removeNodeFromCluster(cluster.id, leastLoadedNodeId);
        this.deleteEdgeNode(leastLoadedNodeId);
        
        this.emit('clusterScaledDown', { cluster, removedNodeId: leastLoadedNodeId });
        
        console.log(`📉 Cluster ${cluster.name} scaled down, removed node`);
    }

    // Utility Methods
    generateNodeId() {
        return 'edge-node-' + randomBytes(4).toString('hex');
    }

    generateClusterId() {
        return 'edge-cluster-' + randomBytes(4).toString('hex');
    }

    generateServiceId() {
        return 'edge-service-' + randomBytes(4).toString('hex');
    }

    generateIPAddress() {
        return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    // Persistence
    saveEdgeData() {
        try {
            const data = {
                edgeNodes: Array.from(this.edgeNodes.entries()).map(([id, node]) => [
                    id, {
                        ...node,
                        services: Array.from(node.services),
                        cache: {
                            ...node.cache,
                            entries: Array.from(node.cache.entries)
                        }
                    }
                ]),
                edgeClusters: Array.from(this.edgeClusters.entries()).map(([id, cluster]) => [
                    id, {
                        ...cluster,
                        nodes: Array.from(cluster.nodes)
                    }
                ]),
                edgeServices: Array.from(this.edgeServices.entries()).map(([id, service]) => [
                    id, {
                        ...service,
                        nodes: Array.from(service.nodes)
                    }
                ]),
                config: this.config,
                timestamp: Date.now()
            };
            
            writeFileSync('./edge-computing-data.json', JSON.stringify(data, null, 2));
            console.log('💾 Edge computing data saved to file');
        } catch (error) {
            console.error('Error saving edge computing data:', error);
        }
    }

    loadEdgeData() {
        try {
            if (existsSync('./edge-computing-data.json')) {
                const data = JSON.parse(readFileSync('./edge-computing-data.json', 'utf8'));
                
                // Load edge nodes
                if (data.edgeNodes) {
                    data.edgeNodes.forEach(([id, node]) => {
                        node.services = new Set(node.services);
                        node.cache.entries = new Map(node.cache.entries);
                        this.edgeNodes.set(id, node);
                    });
                }
                
                // Load edge clusters
                if (data.edgeClusters) {
                    data.edgeClusters.forEach(([id, cluster]) => {
                        cluster.nodes = new Set(cluster.nodes);
                        this.edgeClusters.set(id, cluster);
                    });
                }
                
                // Load edge services
                if (data.edgeServices) {
                    data.edgeServices.forEach(([id, service]) => {
                        service.nodes = new Set(service.nodes);
                        this.edgeServices.set(id, service);
                    });
                }
                
                console.log('📂 Edge computing data loaded from file');
            } else {
                // Create default edge node
                this.createDefaultEdgeNode();
            }
        } catch (error) {
            console.error('Error loading edge computing data:', error);
            this.createDefaultEdgeNode();
        }
    }

    createDefaultEdgeNode() {
        const defaultNode = this.createEdgeNode({
            name: 'Default Edge Node',
            location: 'us-east-1',
            region: 'us-east-1',
            zone: 'us-east-1a',
            description: 'Default edge node for Predator Analytics'
        });
        
        // Create default cluster
        const defaultCluster = this.createEdgeCluster({
            name: 'Default Edge Cluster',
            type: 'geographic',
            strategy: 'round-robin',
            autoScaling: true,
            minNodes: 1,
            maxNodes: 3,
            description: 'Default edge cluster for Predator Analytics'
        });
        
        // Add node to cluster
        this.addNodeToCluster(defaultCluster.id, defaultNode.id);
        
        // Deploy default service
        const defaultService = this.deployEdgeService({
            name: 'Analytics Edge Service',
            type: 'analytics',
            version: '1.0.0',
            replicas: 1,
            endpoints: ['/analytics', '/metrics'],
            description: 'Default analytics service for edge computing'
        });
        
        console.log('🌐 Created default edge node, cluster, and service');
    }

    // Public API Methods
    getEdgeComputingStatus() {
        return {
            totalNodes: this.edgeNodes.size,
            activeNodes: Array.from(this.edgeNodes.values()).filter(n => n.status === 'active').length,
            totalClusters: this.edgeClusters.size,
            totalServices: this.edgeServices.size,
            runningServices: Array.from(this.edgeServices.values()).filter(s => s.status === 'running').length,
            totalCapacity: Array.from(this.edgeNodes.values()).reduce((sum, n) => sum + n.capacity, 0),
            usedCapacity: Array.from(this.edgeNodes.values()).reduce((sum, n) => sum + n.currentLoad, 0),
            config: this.config
        };
    }

    getEdgeNodeList() {
        return Array.from(this.edgeNodes.values()).map(node => ({
            id: node.id,
            name: node.name,
            location: node.location,
            status: node.status,
            capacity: node.capacity,
            currentLoad: node.currentLoad,
            services: node.services.size,
            uptime: node.metrics.uptime,
            requests: node.metrics.requests
        }));
    }

    getEdgeClusterList() {
        return Array.from(this.edgeClusters.values()).map(cluster => ({
            id: cluster.id,
            name: cluster.name,
            type: cluster.type,
            nodes: cluster.nodes.size,
            totalCapacity: cluster.metrics.totalCapacity,
            usedCapacity: cluster.metrics.usedCapacity,
            utilization: cluster.metrics.totalCapacity > 0 ? 
                (cluster.metrics.usedCapacity / cluster.metrics.totalCapacity) * 100 : 0,
            autoScaling: cluster.autoScaling.enabled
        }));
    }

    getEdgeServiceList() {
        return Array.from(this.edgeServices.values()).map(service => ({
            id: service.id,
            name: service.name,
            type: service.type,
            status: service.status,
            replicas: service.nodes.size,
            requests: service.metrics.requests,
            uptime: service.metrics.uptime
        }));
    }

    shutdown() {
        console.log('🔄 Shutting down Edge Computing System...');
        
        // Stop all services
        for (const service of this.edgeServices.values()) {
            if (service.status === 'running') {
                this.stopEdgeService(service.id);
            }
        }
        
        // Stop all nodes
        for (const node of this.edgeNodes.values()) {
            if (node.status === 'active') {
                this.stopEdgeNode(node.id);
            }
        }
        
        // Save edge data
        this.saveEdgeData();
        
        console.log('✅ Edge Computing System shutdown complete');
    }
}

// Run edge computing system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const edgeComputing = new EdgeComputingSystem();
    
    // Demo edge computing operations
    console.log('🌐 Demo Edge Computing Operations:');
    
    try {
        // Create additional edge nodes
        console.log('\n1. Creating additional edge nodes...');
        const node1 = edgeComputing.createEdgeNode({
            name: 'Europe Edge Node',
            location: 'eu-west-1',
            region: 'eu-west-1',
            zone: 'eu-west-1a',
            description: 'Edge node for European region'
        });
        
        const node2 = edgeComputing.createEdgeNode({
            name: 'Asia Edge Node',
            location: 'ap-southeast-1',
            region: 'ap-southeast-1',
            zone: 'ap-southeast-1a',
            description: 'Edge node for Asia Pacific region'
        });
        
        console.log('Created nodes:', node1.name, node2.name);
        
        // Create a geo-distributed cluster
        console.log('\n2. Creating geo-distributed cluster...');
        const geoCluster = edgeComputing.createEdgeCluster({
            name: 'Global Analytics Cluster',
            type: 'geographic',
            strategy: 'geographic',
            autoScaling: true,
            minNodes: 2,
            maxNodes: 5,
            description: 'Global cluster for analytics processing'
        });
        
        // Add nodes to cluster
        edgeComputing.addNodeToCluster(geoCluster.id, node1.id);
        edgeComputing.addNodeToCluster(geoCluster.id, node2.id);
        
        console.log('Created cluster:', geoCluster.name);
        
        // Deploy edge services
        console.log('\n3. Deploying edge services...');
        const analyticsService = edgeComputing.deployEdgeService({
            name: 'Analytics Edge Service',
            type: 'analytics',
            version: '1.0.0',
            replicas: 2,
            endpoints: ['/analytics', '/metrics', '/health'],
            description: 'Analytics processing service'
        });
        
        const cacheService = edgeComputing.deployEdgeService({
            name: 'Edge Cache Service',
            type: 'cache',
            version: '1.0.0',
            replicas: 1,
            endpoints: ['/cache', '/purge'],
            description: 'Edge caching service'
        });
        
        console.log('Deployed services:', analyticsService.name, cacheService.name);
        
        // Test edge routing
        console.log('\n4. Testing edge request routing...');
        const requests = [
            {
                endpoint: '/analytics',
                data: { query: 'SELECT * FROM metrics' },
                cacheKey: 'analytics_query_1',
                cacheable: true,
                location: 'eu-west-1'
            },
            {
                endpoint: '/cache',
                data: { key: 'test_key', value: 'test_value' },
                cacheKey: 'cache_operation_1',
                cacheable: false,
                location: 'ap-southeast-1'
            }
        ];
        
        for (const request of requests) {
            try {
                const result = edgeComputing.routeEdgeRequest(request);
                console.log(`Request routed to ${result.node.name} via ${result.source}`);
            } catch (error) {
                console.log('Request failed:', error.message);
            }
        }
        
        // Get system status
        console.log('\n🌐 Edge Computing System Status:');
        const status = edgeComputing.getEdgeComputingStatus();
        console.log('Total nodes:', status.totalNodes);
        console.log('Active nodes:', status.activeNodes);
        console.log('Total clusters:', status.totalClusters);
        console.log('Total services:', status.totalServices);
        console.log('Running services:', status.runningServices);
        console.log('Total capacity:', status.totalCapacity);
        console.log('Used capacity:', status.usedCapacity);
        
        // List all nodes
        console.log('\n📋 All Edge Nodes:');
        const nodes = edgeComputing.getEdgeNodeList();
        nodes.forEach(node => {
            console.log(`- ${node.name} (${node.location}) - ${node.status} - ${node.currentLoad}/${node.capacity} load`);
        });
        
        // List all clusters
        console.log('\n📋 All Edge Clusters:');
        const clusters = edgeComputing.getEdgeClusterList();
        clusters.forEach(cluster => {
            console.log(`- ${cluster.name} (${cluster.type}) - ${cluster.nodes} nodes - ${cluster.utilization.toFixed(2)}% utilization`);
        });
        
        // List all services
        console.log('\n📋 All Edge Services:');
        const services = edgeComputing.getEdgeServiceList();
        services.forEach(service => {
            console.log(`- ${service.name} (${service.type}) - ${service.status} - ${service.replicas} replicas`);
        });
        
    } catch (error) {
        console.error('Demo error:', error.message);
    }
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        edgeComputing.shutdown();
        process.exit(0);
    });
    
    console.log('\n🎊 Edge Computing System started!');
    console.log('🌐 Distributed edge processing ready...');
}

export default EdgeComputingSystem;
