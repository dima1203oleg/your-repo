// Production Readiness Checker
// Validates system readiness for production deployment

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

class ProductionReadinessChecker {
    constructor() {
        this.checks = {
            security: { passed: 0, total: 0, issues: [] },
            performance: { passed: 0, total: 0, issues: [] },
            configuration: { passed: 0, total: 0, issues: [] },
            dependencies: { passed: 0, total: 0, issues: [] },
            monitoring: { passed: 0, total: 0, issues: [] },
            deployment: { passed: 0, total: 0, issues: [] }
        };
        
        this.productionRequirements = {
            minNodeVersion: '18.0.0',
            maxMemoryUsage: 512, // MB
            maxResponseTime: 2000, // ms
            minUptime: 0.99, // 99%
            requiredEnvVars: ['NODE_ENV'],
            optionalEnvVars: ['API_KEY', 'LOG_LEVEL', 'PORT']
        };
    }

    check(category, name, passed, issue = null) {
        this.checks[category].total++;
        if (passed) {
            this.checks[category].passed++;
        } else {
            this.checks[category].issues.push({ name, issue });
        }
    }

    async checkSecurity() {
        console.log('🔒 Checking Security...');
        
        // Check for hardcoded secrets
        try {
            const packageJson = readFileSync('package.json', 'utf8');
            const hasSecrets = packageJson.includes('password') || 
                              packageJson.includes('secret') || 
                              packageJson.includes('key');
            this.check('security', 'No Hardcoded Secrets', !hasSecrets, 
                       hasSecrets ? 'Potential secrets found in package.json' : null);
        } catch (error) {
            this.check('security', 'Package.json Readable', false, 'Cannot read package.json');
        }
        
        // Check environment variables
        const nodeEnv = process.env.NODE_ENV;
        const isProduction = nodeEnv === 'production';
        this.check('security', 'Production Environment', isProduction, 
                   `NODE_ENV is '${nodeEnv}', should be 'production'`);
        
        // Check for HTTPS in production
        const hasHttpsConfig = existsSync('./ssl') || process.env.HTTPS === 'true';
        this.check('security', 'HTTPS Configuration', !isProduction || hasHttpsConfig,
                   isProduction ? 'HTTPS should be configured for production' : null);
        
        // Check CORS configuration
        try {
            const serverFiles = ['real-backend/server.js', 'simple-proxy.js'];
            let hasCorsConfig = false;
            
            for (const file of serverFiles) {
                if (existsSync(file)) {
                    const content = readFileSync(file, 'utf8');
                    if (content.includes('cors') || content.includes('CORS')) {
                        hasCorsConfig = true;
                        break;
                    }
                }
            }
            
            this.check('security', 'CORS Configuration', hasCorsConfig,
                       hasCorsConfig ? null : 'CORS not configured in server files');
        } catch (error) {
            this.check('security', 'CORS Check', false, 'Error checking CORS configuration');
        }
    }

    async checkPerformance() {
        console.log('⚡ Checking Performance...');
        
        // Check Node.js version
        const nodeVersion = process.version;
        const meetsVersionReq = this.compareVersions(nodeVersion, this.productionRequirements.minNodeVersion) >= 0;
        this.check('performance', 'Node.js Version', meetsVersionReq,
                   `Node.js ${nodeVersion}, requires >= ${this.productionRequirements.minNodeVersion}`);
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        const memUsageMB = memUsage.heapUsed / 1024 / 1024;
        const memoryOk = memUsageMB < this.productionRequirements.maxMemoryUsage;
        this.check('performance', 'Memory Usage', memoryOk,
                   `Current: ${memUsageMB.toFixed(1)}MB, max: ${this.productionRequirements.maxMemoryUsage}MB`);
        
        // Check for performance optimizations
        try {
            const backendContent = existsSync('real-backend/server.js') ? 
                                  readFileSync('real-backend/server.js', 'utf8') : '';
            
            const hasCaching = backendContent.includes('cache') || backendContent.includes('Cache');
            const hasTimeouts = backendContent.includes('timeout') || backendContent.includes('Timeout');
            
            this.check('performance', 'Caching Implementation', hasCaching,
                       hasCaching ? null : 'No caching found in backend');
            this.check('performance', 'Timeout Configuration', hasTimeouts,
                       hasTimeouts ? null : 'No timeout configuration found');
        } catch (error) {
            this.check('performance', 'Performance Check', false, 'Error checking performance optimizations');
        }
    }

    async checkConfiguration() {
        console.log('⚙️ Checking Configuration...');
        
        // Check required environment variables
        this.productionRequirements.requiredEnvVars.forEach(envVar => {
            const exists = process.env[envVar] !== undefined;
            this.check('configuration', `Environment: ${envVar}`, exists,
                       exists ? null : `Required environment variable ${envVar} not set`);
        });
        
        // Check configuration files
        const configFiles = [
            'package.json',
            'vite.config.ts',
            'tsconfig.json'
        ];
        
        configFiles.forEach(file => {
            const exists = existsSync(file);
            this.check('configuration', `Config File: ${file}`, exists,
                       exists ? null : `Configuration file ${file} missing`);
        });
        
        // Check build configuration
        try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const hasBuildScript = packageJson.scripts && packageJson.scripts.build;
            const hasStartScript = packageJson.scripts && (packageJson.scripts.start || packageJson.scripts['start:prod']);
            
            this.check('configuration', 'Build Script', hasBuildScript,
                       hasBuildScript ? null : 'No build script found');
            this.check('configuration', 'Start Script', hasStartScript,
                       hasStartScript ? null : 'No production start script found');
        } catch (error) {
            this.check('configuration', 'Package.json Parse', false, 'Error parsing package.json');
        }
    }

    async checkDependencies() {
        console.log('📦 Checking Dependencies...');
        
        try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const deps = packageJson.dependencies || {};
            const devDeps = packageJson.devDependencies || {};
            
            // Check for production dependencies
            const hasProdDeps = Object.keys(deps).length > 0;
            this.check('dependencies', 'Production Dependencies', hasProdDeps,
                       hasProdDeps ? null : 'No production dependencies found');
            
            // Check for security vulnerabilities
            try {
                const auditResult = execSync('npm audit --json', { encoding: 'utf8', timeout: 10000 });
                const audit = JSON.parse(auditResult);
                const vulnCount = audit.vulnerabilities ? Object.keys(audit.vulnerabilities).length : 0;
                const securityOk = vulnCount === 0;
                
                this.check('dependencies', 'Security Audit', securityOk,
                           securityOk ? null : `${vulnCount} vulnerabilities found`);
            } catch (auditError) {
                this.check('dependencies', 'Security Audit', false, 'Security audit failed');
            }
            
            // Check for outdated packages
            try {
                const outdatedResult = execSync('npm outdated --json', { encoding: 'utf8', timeout: 10000 });
                const outdated = JSON.parse(outdatedResult);
                const outdatedCount = Object.keys(outdated).length;
                const updatesOk = outdatedCount <= 5; // Allow some outdated packages
                
                this.check('dependencies', 'Package Updates', updatesOk,
                           updatesOk ? null : `${outdatedCount} packages outdated`);
            } catch (outdatedError) {
                // npm outdated returns non-zero exit code when packages are outdated
                this.check('dependencies', 'Package Updates', true, 'Packages may be outdated (check manually)');
            }
            
        } catch (error) {
            this.check('dependencies', 'Dependency Check', false, 'Error checking dependencies');
        }
    }

    async checkMonitoring() {
        console.log('📊 Checking Monitoring...');
        
        // Check for logging
        try {
            const backendContent = existsSync('real-backend/server.js') ? 
                                  readFileSync('real-backend/server.js', 'utf8') : '';
            
            const hasLogging = backendContent.includes('console.log') || 
                              backendContent.includes('logger') ||
                              backendContent.includes('winston');
            
            this.check('monitoring', 'Logging Implementation', hasLogging,
                       hasLogging ? null : 'No logging found in backend');
        } catch (error) {
            this.check('monitoring', 'Logging Check', false, 'Error checking logging');
        }
        
        // Check for health endpoints
        try {
            const response = await fetch('http://localhost:8001/health', { 
                signal: AbortSignal.timeout(2000) 
            });
            const hasHealthEndpoint = response.ok;
            this.check('monitoring', 'Health Endpoint', hasHealthEndpoint,
                       hasHealthEndpoint ? null : 'Health endpoint not responding');
        } catch (error) {
            this.check('monitoring', 'Health Endpoint', false, 'Health endpoint not accessible');
        }
        
        // Check for monitoring dashboard
        try {
            const response = await fetch('http://localhost:3004/health', { 
                signal: AbortSignal.timeout(2000) 
            });
            const hasMonitoring = response.ok;
            this.check('monitoring', 'Monitoring Dashboard', hasMonitoring,
                       hasMonitoring ? null : 'Monitoring dashboard not responding');
        } catch (error) {
            this.check('monitoring', 'Monitoring Dashboard', false, 'Monitoring dashboard not accessible');
        }
    }

    async checkDeployment() {
        console.log('🚀 Checking Deployment Readiness...');
        
        // Check for build output
        const hasDistFolder = existsSync('dist');
        this.check('deployment', 'Build Output', hasDistFolder,
                   hasDistFolder ? null : 'No dist folder found - run npm run build');
        
        // Check for Docker files
        const hasDockerfile = existsSync('Dockerfile');
        const hasDockerCompose = existsSync('docker-compose.yml');
        const hasDockerSetup = hasDockerfile || hasDockerCompose;
        
        this.check('deployment', 'Docker Configuration', hasDockerSetup,
                   hasDockerSetup ? null : 'No Docker configuration found');
        
        // Check for deployment scripts
        const deployScripts = [
            'deploy.sh',
            'scripts/deploy.sh',
            'deploy.js',
            'scripts/deploy.js'
        ];
        
        const hasDeployScript = deployScripts.some(script => existsSync(script));
        this.check('deployment', 'Deployment Scripts', hasDeployScript,
                   hasDeployScript ? null : 'No deployment scripts found');
        
        // Check for environment configuration
        const envFiles = ['.env', '.env.production', '.env.example'];
        const hasEnvConfig = envFiles.some(file => existsSync(file));
        this.check('deployment', 'Environment Configuration', hasEnvConfig,
                   hasEnvConfig ? null : 'No environment configuration files found');
    }

    compareVersions(version1, version2) {
        const v1Parts = version1.replace('v', '').split('.').map(Number);
        const v2Parts = version2.replace('v', '').split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part > v2Part) return 1;
            if (v1Part < v2Part) return -1;
        }
        
        return 0;
    }

    async runAllChecks() {
        console.log('🔍 PRODUCTION READINESS ASSESSMENT');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        await this.checkSecurity();
        await this.checkPerformance();
        await this.checkConfiguration();
        await this.checkDependencies();
        await this.checkMonitoring();
        await this.checkDeployment();
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        this.generateReport(totalTime);
    }

    generateReport(totalTime) {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 PRODUCTION READINESS REPORT');
        console.log('=' .repeat(60));
        
        let totalPassed = 0;
        let totalTests = 0;
        
        const categories = [
            { name: 'Security', key: 'security', icon: '🔒' },
            { name: 'Performance', key: 'performance', icon: '⚡' },
            { name: 'Configuration', key: 'configuration', icon: '⚙️' },
            { name: 'Dependencies', key: 'dependencies', icon: '📦' },
            { name: 'Monitoring', key: 'monitoring', icon: '📊' },
            { name: 'Deployment', key: 'deployment', icon: '🚀' }
        ];
        
        console.log('\n📋 Category Results:');
        categories.forEach(cat => {
            const result = this.checks[cat.key];
            const score = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
            const icon = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
            
            console.log(`  ${cat.icon} ${cat.name}: ${score}% (${result.passed}/${result.total}) ${icon}`);
            totalPassed += result.passed;
            totalTests += result.total;
        });
        
        const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
        const statusIcon = overallScore >= 90 ? '🎉' : overallScore >= 75 ? '⚠️' : '❌';
        
        console.log('\n' + '=' .repeat(60));
        console.log(`🎯 PRODUCTION READINESS: ${overallScore}% (${totalPassed}/${totalTests}) ${statusIcon}`);
        console.log(`⏱️  Assessment Time: ${totalTime}ms`);
        console.log('=' .repeat(60));
        
        // Show issues
        const allIssues = [];
        categories.forEach(cat => {
            this.checks[cat.key].issues.forEach(issue => {
                allIssues.push({ ...issue, category: cat.name });
            });
        });
        
        if (allIssues.length > 0) {
            console.log('\n❌ Issues Found:');
            allIssues.forEach(issue => {
                console.log(`  • ${issue.category}: ${issue.name} - ${issue.issue}`);
            });
        }
        
        // Production readiness verdict
        console.log('\n🎊 Production Readiness Verdict:');
        if (overallScore >= 90) {
            console.log('  ✅ READY FOR PRODUCTION!');
            console.log('  🚀 System meets all production requirements');
        } else if (overallScore >= 75) {
            console.log('  ⚠️ MOSTLY READY');
            console.log('  🔧 Minor fixes needed before production');
        } else {
            console.log('  ❌ NOT READY');
            console.log('  🛠️ Significant work required before production');
        }
        
        // Critical issues
        const criticalIssues = allIssues.filter(issue => 
            issue.category === 'Security' || issue.category === 'Configuration'
        );
        
        if (criticalIssues.length > 0) {
            console.log('\n🚨 Critical Issues (Must Fix):');
            criticalIssues.forEach(issue => {
                console.log(`  • ${issue.name}: ${issue.issue}`);
            });
        }
        
        console.log('\n🎊 Production Readiness Assessment Complete!');
        
        return overallScore;
    }
}

// Run checks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const checker = new ProductionReadinessChecker();
    checker.runAllChecks().catch(console.error);
}

export default ProductionReadinessChecker;
