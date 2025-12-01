// Final Production Readiness Check for Predator Analytics
// Comprehensive system validation before production deployment

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

class FinalProductionCheck {
    constructor() {
        this.checks = {
            system: { status: 'pending', score: 0, issues: [] },
            security: { status: 'pending', score: 0, issues: [] },
            performance: { status: 'pending', score: 0, issues: [] },
            infrastructure: { status: 'pending', score: 0, issues: [] },
            monitoring: { status: 'pending', score: 0, issues: [] },
            deployment: { status: 'pending', score: 0, issues: [] },
            documentation: { status: 'pending', score: 0, issues: [] }
        };
        
        this.overallScore = 0;
        this.criticalIssues = [];
        this.recommendations = [];
        
        this.runProductionCheck();
    }

    async runProductionCheck() {
        console.log('🚀 Starting Final Production Readiness Check...\n');
        
        const startTime = Date.now();
        
        try {
            // Run all checks
            await this.checkSystemRequirements();
            await this.checkSecurityCompliance();
            await this.checkPerformanceMetrics();
            await this.checkInfrastructureReadiness();
            await this.checkMonitoringSystems();
            await this.checkDeploymentReadiness();
            await this.checkDocumentationCompleteness();
            
            // Calculate overall score
            this.calculateOverallScore();
            
            // Generate final report
            this.generateFinalReport();
            
            const duration = Date.now() - startTime;
            console.log(`\n⏱️ Production check completed in ${duration}ms`);
            
        } catch (error) {
            console.error('❌ Production check failed:', error.message);
            process.exit(1);
        }
    }

    async checkSystemRequirements() {
        console.log('🔍 Checking System Requirements...');
        
        const issues = [];
        let score = 100;
        
        // Check Node.js version
        try {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            
            if (majorVersion < 18) {
                issues.push({
                    severity: 'critical',
                    category: 'system',
                    issue: 'Node.js version too old',
                    details: `Current: ${nodeVersion}, Required: >=18.0.0`,
                    recommendation: 'Upgrade Node.js to version 18 or later'
                });
                score -= 20;
            }
        } catch (error) {
            issues.push({
                severity: 'high',
                category: 'system',
                issue: 'Could not determine Node.js version',
                recommendation: 'Ensure Node.js is properly installed'
            });
            score -= 10;
        }
        
        // Check memory requirements
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapTotal / 1024 / 1024; // MB
        
        if (totalMemory > 512) {
            issues.push({
                severity: 'medium',
                category: 'system',
                issue: 'High memory usage detected',
                details: `Current: ${totalMemory.toFixed(2)}MB`,
                recommendation: 'Optimize memory usage or increase system memory'
            });
            score -= 10;
        }
        
        // Check disk space
        try {
            const result = execSync('df -h . | tail -1', { encoding: 'utf8' });
            const parts = result.trim().split(/\s+/);
            const diskUsage = parseInt(parts[4].replace('%', ''));
            
            if (diskUsage > 85) {
                issues.push({
                    severity: 'high',
                    category: 'system',
                    issue: 'Low disk space',
                    details: `Disk usage: ${diskUsage}%`,
                    recommendation: 'Free up disk space or expand storage'
                });
                score -= 15;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'system',
                issue: 'Could not check disk space',
                recommendation: 'Ensure df command is available'
            });
            score -= 5;
        }
        
        // Check required files
        const requiredFiles = [
            'package.json',
            'App.tsx',
            'index.tsx',
            'vite.config.ts'
        ];
        
        requiredFiles.forEach(file => {
            if (!existsSync(file)) {
                issues.push({
                    severity: 'critical',
                    category: 'system',
                    issue: `Missing required file: ${file}`,
                    recommendation: 'Ensure all required files are present'
                });
                score -= 10;
            }
        });
        
        // Check environment variables
        const requiredEnvVars = ['NODE_ENV', 'PORT'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            issues.push({
                severity: 'high',
                category: 'system',
                issue: 'Missing environment variables',
                details: missingEnvVars.join(', '),
                recommendation: 'Set all required environment variables'
            });
            score -= 10;
        }
        
        this.checks.system = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ System Requirements: ${this.checks.system.score}/100 (${this.checks.system.status})`);
    }

    async checkSecurityCompliance() {
        console.log('🔒 Checking Security Compliance...');
        
        const issues = [];
        let score = 100;
        
        // Check for security middleware
        const securityFiles = [
            'middleware/security-headers.js',
            'middleware/rate-limiting.js',
            'middleware/authentication.js',
            'middleware/input-validation.js'
        ];
        
        const missingSecurityFiles = securityFiles.filter(file => !existsSync(file));
        
        if (missingSecurityFiles.length > 0) {
            issues.push({
                severity: 'high',
                category: 'security',
                issue: 'Missing security middleware',
                details: missingSecurityFiles.join(', '),
                recommendation: 'Run security hardening script to create security middleware'
            });
            score -= missingSecurityFiles.length * 10;
        }
        
        // Check for .env file exposure
        if (existsSync('.env')) {
            try {
                const envContent = readFileSync('.env', 'utf8');
                if (envContent.includes('password') || envContent.includes('secret')) {
                    issues.push({
                        severity: 'critical',
                        category: 'security',
                        issue: 'Potential secrets in .env file',
                        recommendation: 'Use secret management or environment variables'
                    });
                    score -= 20;
                }
            } catch (error) {
                // Could not read file
            }
        }
        
        // Check for HTTPS configuration
        const hasSSL = existsSync('./ssl') || process.env.ENABLE_HTTPS === 'true';
        if (!hasSSL) {
            issues.push({
                severity: 'high',
                category: 'security',
                issue: 'HTTPS not configured',
                recommendation: 'Configure SSL/TLS for production'
            });
            score -= 15;
        }
        
        // Check for CORS configuration
        try {
            const serverFiles = ['simple-proxy.js', 'real-backend/server.js'];
            let hasCORS = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        if (content.includes('cors')) {
                            hasCORS = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasCORS) {
                issues.push({
                    severity: 'medium',
                    category: 'security',
                    issue: 'CORS not configured',
                    recommendation: 'Configure CORS properly'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'security',
                issue: 'Could not check CORS configuration',
                recommendation: 'Ensure CORS is properly configured'
            });
            score -= 5;
        }
        
        // Check for rate limiting
        try {
            const serverFiles = ['simple-proxy.js', 'real-backend/server.js'];
            let hasRateLimit = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        if (content.includes('rate-limit') || content.includes('rateLimit')) {
                            hasRateLimit = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasRateLimit) {
                issues.push({
                    severity: 'high',
                    category: 'security',
                    issue: 'Rate limiting not implemented',
                    recommendation: 'Implement rate limiting to prevent DDoS attacks'
                });
                score -= 15;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'security',
                issue: 'Could not check rate limiting',
                recommendation: 'Implement rate limiting'
            });
            score -= 5;
        }
        
        this.checks.security = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Security Compliance: ${this.checks.security.score}/100 (${this.checks.security.status})`);
    }

    async checkPerformanceMetrics() {
        console.log('⚡ Checking Performance Metrics...');
        
        const issues = [];
        let score = 100;
        
        // Check bundle size
        if (existsSync('./dist')) {
            try {
                const result = execSync('du -sh ./dist 2>/dev/null || echo "0"', { encoding: 'utf8' });
                const sizeStr = result.trim().split('\t')[0];
                
                let sizeMB = 0;
                if (sizeStr.includes('M')) {
                    sizeMB = parseFloat(sizeStr.replace('M', ''));
                } else if (sizeStr.includes('K')) {
                    sizeMB = parseFloat(sizeStr.replace('K', '')) / 1024;
                }
                
                if (sizeMB > 5) {
                    issues.push({
                        severity: 'medium',
                        category: 'performance',
                        issue: 'Large bundle size',
                        details: `Size: ${sizeMB}MB`,
                        recommendation: 'Implement code splitting and optimize assets'
                    });
                    score -= 15;
                } else if (sizeMB > 2) {
                    issues.push({
                        severity: 'low',
                        category: 'performance',
                        issue: 'Moderate bundle size',
                        details: `Size: ${sizeMB}MB`,
                        recommendation: 'Consider further optimization'
                    });
                    score -= 5;
                }
            } catch (error) {
                issues.push({
                    severity: 'medium',
                    category: 'performance',
                    issue: 'Could not check bundle size',
                    recommendation: 'Ensure dist folder exists and is accessible'
                });
                score -= 10;
            }
        } else {
            issues.push({
                severity: 'high',
                category: 'performance',
                issue: 'No production build found',
                recommendation: 'Run npm run build to create production build'
            });
            score -= 25;
        }
        
        // Check for lazy loading
        try {
            const appContent = readFileSync('./App.tsx', 'utf8');
            if (!appContent.includes('lazy') || !appContent.includes('Suspense')) {
                issues.push({
                    severity: 'medium',
                    category: 'performance',
                    issue: 'Lazy loading not implemented',
                    recommendation: 'Implement React.lazy() and Suspense for better performance'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'performance',
                issue: 'Could not check for lazy loading',
                recommendation: 'Implement lazy loading for better performance'
            });
            score -= 5;
        }
        
        // Check for caching
        try {
            const proxyContent = readFileSync('./simple-proxy.js', 'utf8');
            if (!proxyContent.includes('cache') && !proxyContent.includes('Cache')) {
                issues.push({
                    severity: 'medium',
                    category: 'performance',
                    issue: 'No caching implemented',
                    recommendation: 'Implement caching for better performance'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'performance',
                issue: 'Could not check caching implementation',
                recommendation: 'Implement caching for better performance'
            });
            score -= 5;
        }
        
        // Check for compression
        try {
            const serverFiles = ['simple-proxy.js', 'real-backend/server.js'];
            let hasCompression = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        if (content.includes('gzip') || content.includes('compression')) {
                            hasCompression = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasCompression) {
                issues.push({
                    severity: 'low',
                    category: 'performance',
                    issue: 'No compression implemented',
                    recommendation: 'Implement gzip compression for better performance'
                });
                score -= 5;
            }
        } catch (error) {
            issues.push({
                severity: 'low',
                category: 'performance',
                issue: 'Could not check compression',
                recommendation: 'Implement compression for better performance'
            });
            score -= 2;
        }
        
        this.checks.performance = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Performance Metrics: ${this.checks.performance.score}/100 (${this.checks.performance.status})`);
    }

    async checkInfrastructureReadiness() {
        console.log('🏗️ Checking Infrastructure Readiness...');
        
        const issues = [];
        let score = 100;
        
        // Check Docker configuration
        if (!existsSync('./Dockerfile')) {
            issues.push({
                severity: 'high',
                category: 'infrastructure',
                issue: 'Dockerfile not found',
                recommendation: 'Create Dockerfile for containerization'
            });
            score -= 20;
        }
        
        if (!existsSync('./docker-compose.prod.yml')) {
            issues.push({
                severity: 'medium',
                category: 'infrastructure',
                issue: 'Production docker-compose not found',
                recommendation: 'Create docker-compose.prod.yml for production deployment'
            });
            score -= 15;
        }
        
        // Check CI/CD configuration
        if (!existsSync('./.github/workflows/ci-cd.yml')) {
            issues.push({
                severity: 'medium',
                category: 'infrastructure',
                issue: 'CI/CD pipeline not configured',
                recommendation: 'Create GitHub Actions workflow for CI/CD'
            });
            score -= 15;
        }
        
        // Check backup system
        if (!existsSync('./backup-system.js')) {
            issues.push({
                severity: 'medium',
                category: 'infrastructure',
                issue: 'Backup system not found',
                recommendation: 'Implement automated backup system'
            });
            score -= 10;
        }
        
        // Check logging system
        if (!existsSync('./logging-audit-system.js')) {
            issues.push({
                severity: 'medium',
                category: 'infrastructure',
                issue: 'Logging system not found',
                recommendation: 'Implement comprehensive logging system'
            });
            score -= 10;
        }
        
        // Check monitoring system
        if (!existsSync('./realtime-monitoring.js')) {
            issues.push({
                severity: 'low',
                category: 'infrastructure',
                issue: 'Real-time monitoring not found',
                recommendation: 'Implement real-time monitoring system'
            });
            score -= 5;
        }
        
        // Check environment template
        if (!existsSync('./.env.template')) {
            issues.push({
                severity: 'medium',
                category: 'infrastructure',
                issue: 'Environment template not found',
                recommendation: 'Create .env.template for environment configuration'
            });
            score -= 10;
        }
        
        this.checks.infrastructure = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Infrastructure Readiness: ${this.checks.infrastructure.score}/100 (${this.checks.infrastructure.status})`);
    }

    async checkMonitoringSystems() {
        console.log('📊 Checking Monitoring Systems...');
        
        const issues = [];
        let score = 100;
        
        // Check if monitoring server is running
        try {
            const result = execSync('curl -s -w "%{http_code}" http://localhost:3005/health -o /dev/null', { 
                encoding: 'utf8',
                timeout: 5000
            });
            
            if (result !== '200') {
                issues.push({
                    severity: 'medium',
                    category: 'monitoring',
                    issue: 'Real-time monitoring server not running',
                    recommendation: 'Start monitoring server: node realtime-monitoring.js'
                });
                score -= 15;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'monitoring',
                issue: 'Real-time monitoring server not accessible',
                recommendation: 'Start monitoring server: node realtime-monitoring.js'
            });
            score -= 15;
        }
        
        // Check if WebSocket server is running
        try {
            const result = execSync('curl -s -w "%{http_code}" http://localhost:3006/status -o /dev/null', { 
                encoding: 'utf8',
                timeout: 5000
            });
            
            if (result !== '200') {
                issues.push({
                    severity: 'low',
                    category: 'monitoring',
                    issue: 'WebSocket live updates server not running',
                    recommendation: 'Start WebSocket server: node websocket-live-updates.js'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'low',
                category: 'monitoring',
                issue: 'WebSocket live updates server not accessible',
                recommendation: 'Start WebSocket server: node websocket-live-updates.js'
            });
            score -= 10;
        }
        
        // Check for alert system
        if (!existsSync('./alert-notification-system.js')) {
            issues.push({
                severity: 'medium',
                category: 'monitoring',
                issue: 'Alert system not found',
                recommendation: 'Implement alert notification system'
            });
            score -= 10;
        }
        
        // Check log directory
        if (!existsSync('./logs')) {
            issues.push({
                severity: 'medium',
                category: 'monitoring',
                issue: 'Logs directory not found',
                recommendation: 'Create logs directory for logging'
            });
            score -= 10;
        }
        
        // Check for health endpoints
        try {
            const serverFiles = ['simple-proxy.js', 'real-backend/server.js'];
            let hasHealthEndpoint = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        if (content.includes('/health')) {
                            hasHealthEndpoint = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasHealthEndpoint) {
                issues.push({
                    severity: 'medium',
                    category: 'monitoring',
                    issue: 'Health endpoints not implemented',
                    recommendation: 'Implement /health endpoints for monitoring'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'monitoring',
                issue: 'Could not check health endpoints',
                recommendation: 'Implement health endpoints for monitoring'
            });
            score -= 5;
        }
        
        this.checks.monitoring = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Monitoring Systems: ${this.checks.monitoring.score}/100 (${this.checks.monitoring.status})`);
    }

    async checkDeploymentReadiness() {
        console.log('🚀 Checking Deployment Readiness...');
        
        const issues = [];
        let score = 100;
        
        // Check for deployment guide
        if (!existsSync('./DEPLOYMENT_GUIDE.md')) {
            issues.push({
                severity: 'medium',
                category: 'deployment',
                issue: 'Deployment guide not found',
                recommendation: 'Create comprehensive deployment guide'
            });
            score -= 15;
        }
        
        // Check for production scripts
        const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
        const scripts = packageJson.scripts || {};
        
        if (!scripts.build) {
            issues.push({
                severity: 'high',
                category: 'deployment',
                issue: 'Build script not found',
                recommendation: 'Add build script to package.json'
            });
            score -= 15;
        }
        
        if (!scripts.start) {
            issues.push({
                severity: 'high',
                category: 'deployment',
                issue: 'Start script not found',
                recommendation: 'Add start script to package.json'
            });
            score -= 15;
        }
        
        // Check for production dependencies
        try {
            const result = execSync('npm ls --depth=0 --production 2>/dev/null | wc -l', { encoding: 'utf8' });
            const prodDeps = parseInt(result.trim());
            
            if (prodDeps < 5) {
                issues.push({
                    severity: 'medium',
                    category: 'deployment',
                    issue: 'Insufficient production dependencies',
                    details: `Found: ${prodDeps}`,
                    recommendation: 'Ensure all production dependencies are installed'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'medium',
                category: 'deployment',
                issue: 'Could not check production dependencies',
                recommendation: 'Ensure production dependencies are properly installed'
            });
            score -= 5;
        }
        
        // Check for environment-specific configuration
        if (!existsSync('./vite.config.ts') && !existsSync('./vite.config.js')) {
            issues.push({
                severity: 'medium',
                category: 'deployment',
                issue: 'Vite configuration not found',
                recommendation: 'Create proper Vite configuration for production'
            });
            score -= 10;
        }
        
        // Check for process management
        const hasPM2 = scripts['start:pm2'] || scripts['pm2:start'];
        if (!hasPM2) {
            issues.push({
                severity: 'low',
                category: 'deployment',
                issue: 'PM2 configuration not found',
                recommendation: 'Configure PM2 for process management in production'
            });
            score -= 5;
        }
        
        this.checks.deployment = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Deployment Readiness: ${this.checks.deployment.score}/100 (${this.checks.deployment.status})`);
    }

    async checkDocumentationCompleteness() {
        console.log('📚 Checking Documentation Completeness...');
        
        const issues = [];
        let score = 100;
        
        // Check for README
        if (!existsSync('./README.md')) {
            issues.push({
                severity: 'high',
                category: 'documentation',
                issue: 'README.md not found',
                recommendation: 'Create comprehensive README.md'
            });
            score -= 20;
        }
        
        // Check for API documentation
        if (!existsSync('./API_DOCUMENTATION.md')) {
            issues.push({
                severity: 'medium',
                category: 'documentation',
                issue: 'API documentation not found',
                recommendation: 'Create API documentation'
            });
            score -= 15;
        }
        
        // Check for architecture documentation
        if (!existsSync('./ARCHITECTURE.md')) {
            issues.push({
                severity: 'low',
                category: 'documentation',
                issue: 'Architecture documentation not found',
                recommendation: 'Create architecture documentation'
            });
            score -= 10;
        }
        
        // Check for changelog
        if (!existsSync('./CHANGELOG.md')) {
            issues.push({
                severity: 'low',
                category: 'documentation',
                issue: 'CHANGELOG.md not found',
                recommendation: 'Create changelog for version tracking'
            });
            score -= 5;
        }
        
        // Check for contributing guidelines
        if (!existsSync('./CONTRIBUTING.md')) {
            issues.push({
                severity: 'low',
                category: 'documentation',
                issue: 'Contributing guidelines not found',
                recommendation: 'Create contributing guidelines'
            });
            score -= 5;
        }
        
        // Check code comments
        try {
            const tsxFiles = execSync('find . -name "*.tsx" -not -path "./node_modules/*"', { encoding: 'utf8' });
            const files = tsxFiles.trim().split('\n').filter(file => file);
            
            let commentedFiles = 0;
            files.forEach(file => {
                try {
                    const content = readFileSync(file, 'utf8');
                    if (content.includes('//') || content.includes('/*') || content.includes('*')) {
                        commentedFiles++;
                    }
                } catch (error) {
                    // Could not read file
                }
            });
            
            const commentRatio = commentedFiles / files.length;
            if (commentRatio < 0.5) {
                issues.push({
                    severity: 'low',
                    category: 'documentation',
                    issue: 'Insufficient code comments',
                    details: `${commentedFiles}/${files.length} files have comments`,
                    recommendation: 'Add comprehensive code comments'
                });
                score -= 10;
            }
        } catch (error) {
            issues.push({
                severity: 'low',
                category: 'documentation',
                issue: 'Could not check code comments',
                recommendation: 'Add comprehensive code comments'
            });
            score -= 5;
        }
        
        this.checks.documentation = {
            status: score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail',
            score: Math.max(0, score),
            issues
        };
        
        console.log(`✅ Documentation Completeness: ${this.checks.documentation.score}/100 (${this.checks.documentation.status})`);
    }

    calculateOverallScore() {
        const scores = Object.values(this.checks).map(check => check.score);
        this.overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        
        // Collect critical issues
        Object.values(this.checks).forEach(check => {
            check.issues.forEach(issue => {
                if (issue.severity === 'critical') {
                    this.criticalIssues.push(issue);
                }
            });
        });
        
        // Generate recommendations
        this.generateRecommendations();
    }

    generateRecommendations() {
        this.recommendations = [
            'Address all critical issues before production deployment',
            'Implement missing security middleware',
            'Set up proper monitoring and alerting',
            'Create comprehensive documentation',
            'Test all deployment procedures',
            'Implement backup and recovery procedures',
            'Set up proper logging and audit trails',
            'Configure SSL/TLS for production',
            'Implement rate limiting and input validation',
            'Set up CI/CD pipeline for automated deployments'
        ];
        
        // Add specific recommendations based on issues
        const issueTypes = [...new Set(this.criticalIssues.map(issue => issue.category))];
        
        issueTypes.forEach(type => {
            switch (type) {
                case 'security':
                    this.recommendations.unshift('Implement comprehensive security measures');
                    break;
                case 'system':
                    this.recommendations.unshift('Fix system requirements and dependencies');
                    break;
                case 'performance':
                    this.recommendations.unshift('Optimize application performance');
                    break;
                case 'infrastructure':
                    this.recommendations.unshift('Complete infrastructure setup');
                    break;
                case 'deployment':
                    this.recommendations.unshift('Finalize deployment configuration');
                    break;
            }
        });
    }

    generateFinalReport() {
        console.log('\n📊 FINAL PRODUCTION READINESS REPORT');
        console.log('=' .repeat(70));
        
        console.log(`\n🎯 Overall Score: ${this.overallScore}/100`);
        
        const overallStatus = this.overallScore >= 80 ? 'READY FOR PRODUCTION' : 
                            this.overallScore >= 60 ? 'NEEDS ATTENTION' : 'NOT READY';
        
        console.log(`📋 Status: ${overallStatus}`);
        
        if (this.criticalIssues.length > 0) {
            console.log(`\n🚨 Critical Issues (${this.criticalIssues.length}):`);
            this.criticalIssues.forEach((issue, index) => {
                console.log(`  ${index + 1}. ${issue.issue}`);
                console.log(`     Category: ${issue.category}`);
                console.log(`     Recommendation: ${issue.recommendation}`);
            });
        }
        
        console.log('\n📋 Category Breakdown:');
        Object.entries(this.checks).forEach(([category, check]) => {
            const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
            console.log(`  ${icon} ${category.charAt(0).toUpperCase() + category.slice(1)}: ${check.score}/100 (${check.status})`);
            
            if (check.issues.length > 0) {
                const highSeverityIssues = check.issues.filter(i => i.severity === 'high' || i.severity === 'critical');
                if (highSeverityIssues.length > 0) {
                    console.log(`    ⚠️ ${highSeverityIssues.length} high/critical issues`);
                }
            }
        });
        
        console.log('\n💡 Top Recommendations:');
        this.recommendations.slice(0, 5).forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
        
        console.log('\n🎯 Production Deployment Checklist:');
        const checklist = [
            '✅ All critical issues resolved',
            '✅ Security measures implemented',
            '✅ Monitoring systems active',
            '✅ Backup procedures tested',
            '✅ Documentation complete',
            '✅ CI/CD pipeline configured',
            '✅ Performance optimized',
            '✅ SSL/TLS configured',
            '✅ Environment variables set',
            '✅ Health endpoints working'
        ];
        
        checklist.forEach(item => {
            console.log(`  ${item}`);
        });
        
        console.log('\n🚀 Next Steps:');
        if (this.overallScore >= 80) {
            console.log('  1. 🎉 READY FOR PRODUCTION DEPLOYMENT!');
            console.log('  2. Run final pre-deployment tests');
            console.log('  3. Deploy to staging environment');
            console.log('  4. Monitor system performance');
            console.log('  5. Plan production deployment');
        } else if (this.overallScore >= 60) {
            console.log('  1. ⚠️ Address high-priority issues');
            console.log('  2. Implement missing security measures');
            console.log('  3. Complete infrastructure setup');
            console.log('  4. Test all systems thoroughly');
            console.log('  5. Re-run production check');
        } else {
            console.log('  1. 🚨 CRITICAL ISSUES MUST BE RESOLVED');
            console.log('  2. Fix all critical security issues');
            console.log('  3. Complete system requirements');
            console.log('  4. Implement monitoring and logging');
            console.log('  5. Re-run production check after fixes');
        }
        
        console.log('\n📊 Production Readiness Summary:');
        console.log(`  • Overall Score: ${this.overallScore}/100`);
        console.log(`  • Critical Issues: ${this.criticalIssues.length}`);
        console.log(`  • Total Issues: ${Object.values(this.checks).reduce((sum, check) => sum + check.issues.length, 0)}`);
        console.log(`  • Categories Passing: ${Object.values(this.checks).filter(check => check.status === 'pass').length}/7`);
        
        // Save report to file
        this.saveReportToFile();
        
        console.log('\n🎊 FINAL PRODUCTION CHECK COMPLETED!');
        console.log(`📄 Report saved to: ./PRODUCTION_READINESS_REPORT.md`);
    }

    saveReportToFile() {
        const report = `# Predator Analytics - Production Readiness Report

**Generated:** ${new Date().toISOString()}
**Overall Score:** ${this.overallScore}/100
**Status:** ${this.overallScore >= 80 ? 'READY FOR PRODUCTION' : this.overallScore >= 60 ? 'NEEDS ATTENTION' : 'NOT READY'}

## Executive Summary

${this.overallScore >= 80 ? 
    '🎉 **SYSTEM IS READY FOR PRODUCTION DEPLOYMENT**' : 
    this.overallScore >= 60 ? 
    '⚠️ **SYSTEM NEEDS ATTENTION BEFORE PRODUCTION**' : 
    '🚨 **SYSTEM IS NOT READY FOR PRODUCTION**'}

## Category Breakdown

${Object.entries(this.checks).map(([category, check]) => 
    `### ${category.charAt(0).toUpperCase() + category.slice(1)}
**Score:** ${check.score}/100
**Status:** ${check.status.toUpperCase()}
${check.issues.length > 0 ? 
    '**Issues:** ' + check.issues.map(i => `- ${i.issue} (${i.severity})`).join('\n') : 
    '**Issues:** None'}
`).join('\n')}

## Critical Issues

${this.criticalIssues.length > 0 ? 
    this.criticalIssues.map((issue, index) => 
        `${index + 1}. **${issue.issue}**\n   - Category: ${issue.category}\n   - Recommendation: ${issue.recommendation}`
    ).join('\n\n') : 
    'No critical issues found.'}

## Recommendations

${this.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}

## Production Deployment Checklist

- [ ] All critical issues resolved
- [ ] Security measures implemented
- [ ] Monitoring systems active
- [ ] Backup procedures tested
- [ ] Documentation complete
- [ ] CI/CD pipeline configured
- [ ] Performance optimized
- [ ] SSL/TLS configured
- [ ] Environment variables set
- [ ] Health endpoints working

---

*This report was generated automatically by the Production Readiness Check system.*
`;
        
        try {
            writeFileSync('./PRODUCTION_READINESS_REPORT.md', report);
        } catch (error) {
            console.error('Error saving report:', error);
        }
    }
}

// Run production check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    new FinalProductionCheck();
}

export default FinalProductionCheck;
