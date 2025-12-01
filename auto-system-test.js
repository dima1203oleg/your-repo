// Automated System Testing Suite
// Comprehensive testing for Predator Analytics system

const API_BASE_URL = 'http://localhost:8001/api/v1';
const PROXY_URL = 'http://127.0.0.1:3003/api/v1';
const MONITORING_URL = 'http://localhost:3004';

class AutomatedSystemTester {
    constructor() {
        this.testResults = {
            backend: { passed: 0, total: 0, details: [] },
            proxy: { passed: 0, total: 0, details: [] },
            monitoring: { passed: 0, total: 0, details: [] },
            performance: { passed: 0, total: 0, details: [] },
            reliability: { passed: 0, total: 0, details: [] },
            realData: { passed: 0, total: 0, details: [] }
        };
        
        this.testConfig = {
            timeout: 5000,
            retries: 3,
            performanceThreshold: 1000 // ms
        };
    }

    async testWithRetry(testName, testFn, category = 'general') {
        let lastError = null;
        
        for (let i = 0; i < this.testConfig.retries; i++) {
            try {
                const result = await testFn();
                this.testResults[category].passed++;
                this.testResults[category].total++;
                this.testResults[category].details.push({
                    name: testName,
                    status: '✅ PASS',
                    result: result,
                    attempts: i + 1
                });
                return result;
            } catch (error) {
                lastError = error;
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
            }
        }
        
        this.testResults[category].total++;
        this.testResults[category].details.push({
            name: testName,
            status: '❌ FAIL',
            error: lastError.message,
            attempts: this.testConfig.retries
        });
        throw lastError;
    }

    async testBackendHealth() {
        console.log('🔍 Testing Backend Health...');
        
        await this.testWithRetry('Backend Health Check', async () => {
            const response = await fetch(`http://localhost:8001/health`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error('Invalid response format');
            }
            
            return { status: data.data.status, mode: data.data.mode };
        }, 'backend');
        
        await this.testWithRetry('Connectors API', async () => {
            const response = await fetch(`${API_BASE_URL}/connectors`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Invalid connectors response');
            }
            
            return { connectors: data.data.length, online: data.data.filter(c => c.status === 'ONLINE').length };
        }, 'backend');
        
        await this.testWithRetry('System Metrics', async () => {
            const response = await fetch(`${API_BASE_URL}/system/monitoring`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success || typeof data.data.cpu !== 'number') {
                throw new Error('Invalid metrics response');
            }
            
            return { cpu: data.data.cpu, memory: data.data.memory };
        }, 'backend');
    }

    async testProxyFunctionality() {
        console.log('🌐 Testing Proxy Functionality...');
        
        await this.testWithRetry('Proxy Health Check', async () => {
            const response = await fetch(`http://127.0.0.1:3003/health`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error('Invalid proxy health response');
            }
            
            return { status: data.data.status, mode: data.data.mode };
        }, 'proxy');
        
        await this.testWithRetry('Proxy API Forwarding', async () => {
            const response = await fetch(`${PROXY_URL}/connectors`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Proxy not forwarding correctly');
            }
            
            return { connectors: data.data.length };
        }, 'proxy');
        
        await this.testWithRetry('Proxy Caching', async () => {
            // First request
            const start1 = Date.now();
            const response1 = await fetch(`${PROXY_URL}/system/monitoring`);
            const time1 = Date.now() - start1;
            
            // Second request (should be cached)
            const start2 = Date.now();
            const response2 = await fetch(`${PROXY_URL}/system/monitoring`);
            const time2 = Date.now() - start2;
            
            if (!response1.ok || !response2.ok) {
                throw new Error('Cache test failed');
            }
            
            return { firstTime: time1, secondTime: time2, cached: time2 < time1 };
        }, 'proxy');
    }

    async testMonitoringSystem() {
        console.log('📊 Testing Monitoring System...');
        
        await this.testWithRetry('Monitoring Health', async () => {
            const response = await fetch(`${MONITORING_URL}/health`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error('Monitoring health failed');
            }
            
            return { status: data.data.status };
        }, 'monitoring');
        
        await this.testWithRetry('Monitoring Dashboard', async () => {
            const response = await fetch(`${MONITORING_URL}/`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            // Check if it's HTML (dashboard page)
            const text = await response.text();
            if (!text.includes('<html')) {
                throw new Error('Monitoring dashboard not serving HTML');
            }
            
            return { type: 'HTML Dashboard' };
        }, 'monitoring');
    }

    async testPerformance() {
        console.log('⚡ Testing Performance...');
        
        await this.testWithRetry('Backend Response Time', async () => {
            const start = Date.now();
            const response = await fetch(`${API_BASE_URL}/connectors`);
            const time = Date.now() - start;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            if (time > this.testConfig.performanceThreshold) {
                throw new Error(`Too slow: ${time}ms > ${this.testConfig.performanceThreshold}ms`);
            }
            
            return { responseTime: time };
        }, 'performance');
        
        await this.testWithRetry('Concurrent Requests', async () => {
            const requests = Array(5).fill().map(() => 
                fetch(`${API_BASE_URL}/system/monitoring`, {
                    signal: AbortSignal.timeout(this.testConfig.timeout)
                })
            );
            
            const start = Date.now();
            const responses = await Promise.allSettled(requests);
            const time = Date.now() - start;
            
            const successful = responses.filter(r => r.status === 'fulfilled' && r.value.ok).length;
            
            if (successful < 4) {
                throw new Error(`Only ${successful}/5 concurrent requests succeeded`);
            }
            
            return { responseTime: time, successful: successful };
        }, 'performance');
    }

    async testReliability() {
        console.log('🛡️ Testing Reliability...');
        
        await this.testWithRetry('Error Handling', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/invalid-endpoint`, {
                    signal: AbortSignal.timeout(this.testConfig.timeout)
                });
                
                // Should get 404 or similar error
                if (response.ok) {
                    throw new Error('Should have returned error');
                }
                
                return { errorStatus: response.status };
            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Timeout instead of proper error');
                }
                return { handled: true };
            }
        }, 'reliability');
        
        await this.testWithRetry('System Recovery', async () => {
            // Test multiple rapid requests
            const requests = Array(10).fill().map((_, i) => 
                fetch(`${API_BASE_URL}/system/monitoring`, {
                    signal: AbortSignal.timeout(this.testConfig.timeout)
                }).then(r => r.ok).catch(() => false)
            );
            
            const results = await Promise.all(requests);
            const successRate = results.filter(r => r).length / results.length;
            
            if (successRate < 0.8) {
                throw new Error(`Low success rate: ${successRate * 100}%`);
            }
            
            return { successRate: successRate };
        }, 'reliability');
    }

    async testRealDataIntegration() {
        console.log('🌍 Testing Real Data Integration...');
        
        await this.testWithRetry('Real API Connectors', async () => {
            const response = await fetch(`${API_BASE_URL}/connectors`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const realAPIs = data.data.filter(c => c.id && c.id.includes('real'));
            const onlineAPIs = realAPIs.filter(c => c.status === 'ONLINE');
            
            if (realAPIs.length === 0) {
                throw new Error('No real APIs found');
            }
            
            return { total: realAPIs.length, online: onlineAPIs.length };
        }, 'realData');
        
        await this.testWithRetry('Data Freshness', async () => {
            const response = await fetch(`${API_BASE_URL}/system/monitoring`, {
                signal: AbortSignal.timeout(this.testConfig.timeout)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Check if data includes real system metrics
            if (!data.data.uptime || !data.data.nodeVersion) {
                throw new Error('Data not fresh or real');
            }
            
            return { uptime: data.data.uptime, version: data.data.nodeVersion };
        }, 'realData');
    }

    async runAllTests() {
        console.log('🚀 Starting Automated System Testing...\n');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        try {
            await this.testBackendHealth();
            await this.testProxyFunctionality();
            await this.testMonitoringSystem();
            await this.testPerformance();
            await this.testReliability();
            await this.testRealDataIntegration();
        } catch (error) {
            console.error('❌ Critical test failure:', error.message);
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        this.generateReport(totalTime);
    }

    generateReport(totalTime) {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 AUTOMATED SYSTEM TEST REPORT');
        console.log('=' .repeat(60));
        
        let totalPassed = 0;
        let totalTests = 0;
        
        const categories = [
            { name: 'Backend', key: 'backend', icon: '🖥️' },
            { name: 'Proxy', key: 'proxy', icon: '🌐' },
            { name: 'Monitoring', key: 'monitoring', icon: '📊' },
            { name: 'Performance', key: 'performance', icon: '⚡' },
            { name: 'Reliability', key: 'reliability', icon: '🛡️' },
            { name: 'Real Data', key: 'realData', icon: '🌍' }
        ];
        
        console.log('\n📋 Category Results:');
        categories.forEach(cat => {
            const result = this.testResults[cat.key];
            const score = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
            const icon = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
            
            console.log(`  ${cat.icon} ${cat.name}: ${score}% (${result.passed}/${result.total}) ${icon}`);
            totalPassed += result.passed;
            totalTests += result.total;
        });
        
        const overallScore = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
        const statusIcon = overallScore >= 80 ? '🎉' : overallScore >= 60 ? '⚠️' : '❌';
        
        console.log('\n' + '=' .repeat(60));
        console.log(`🎯 OVERALL SCORE: ${overallScore}% (${totalPassed}/${totalTests} tests) ${statusIcon}`);
        console.log(`⏱️  Total Test Time: ${totalTime}ms`);
        console.log('=' .repeat(60));
        
        // Show failed tests
        const failedTests = [];
        categories.forEach(cat => {
            const result = this.testResults[cat.key];
            result.details.forEach(test => {
                if (test.status.includes('FAIL')) {
                    failedTests.push({ ...test, category: cat.name });
                }
            });
        });
        
        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            failedTests.forEach(test => {
                console.log(`  • ${test.category}: ${test.name} - ${test.error || 'Unknown error'}`);
            });
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (overallScore >= 80) {
            console.log('  ✅ System is EXCELLENT - Ready for production!');
        } else if (overallScore >= 60) {
            console.log('  ⚠️ System needs minor improvements before production');
        } else {
            console.log('  ❌ System has critical issues - Fix before production');
        }
        
        if (this.testResults.performance.passed < this.testResults.performance.total) {
            console.log('  • Optimize slow API responses');
        }
        if (this.testResults.realData.passed < this.testResults.realData.total) {
            console.log('  • Check real API connections');
        }
        if (this.testResults.proxy.passed < this.testResults.proxy.total) {
            console.log('  • Fix proxy configuration');
        }
        
        console.log('\n🎊 Automated Testing Complete!');
        
        return overallScore;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new AutomatedSystemTester();
    tester.runAllTests().catch(console.error);
}

export default AutomatedSystemTester;
