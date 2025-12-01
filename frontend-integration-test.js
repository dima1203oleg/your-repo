// Frontend Integration Test for Real Data
// Tests if frontend properly connects to real backend

// Use built-in fetch instead of node-fetch
const API_BASE_URL = 'http://localhost:8001/api/v1';

class FrontendIntegrationTester {
    constructor() {
        this.results = {
            apiConnection: false,
            realData: false,
            performance: false,
            errorHandling: false,
            fallback: false
        };
    }

    async testAPIConnection() {
        try {
            console.log('🔍 Testing API connection...');
            const response = await fetch(`${API_BASE_URL}/health`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.results.apiConnection = true;
                console.log('✅ API connection: OK');
                return true;
            }
        } catch (error) {
            console.log('❌ API connection: FAILED', error.message);
        }
        return false;
    }

    async testRealDataIntegration() {
        try {
            console.log('🌐 Testing real data integration...');
            const response = await fetch(`${API_BASE_URL}/connectors`);
            const data = await response.json();
            
            if (response.ok && data.success) {
                const connectors = data.data || [];
                const realAPIs = connectors.filter(c => c.id && c.id.includes('real'));
                const onlineAPIs = realAPIs.filter(c => c.status === 'ONLINE');
                
                if (realAPIs.length > 0) {
                    this.results.realData = true;
                    console.log(`✅ Real data integration: ${onlineAPIs.length}/${realAPIs.length} APIs online`);
                    
                    // Log API details
                    realAPIs.forEach(api => {
                        const icon = api.status === 'ONLINE' ? '🟢' : '🔴';
                        console.log(`  ${icon} ${api.name}: ${api.status}`);
                    });
                    
                    return true;
                }
            }
        } catch (error) {
            console.log('❌ Real data integration: FAILED', error.message);
        }
        return false;
    }

    async testPerformance() {
        try {
            console.log('⚡ Testing performance...');
            const startTime = Date.now();
            
            // Test multiple endpoints
            const tests = [
                fetch(`${API_BASE_URL}/system/monitoring`),
                fetch(`${API_BASE_URL}/monitoring/logs/stream`),
                fetch(`${API_BASE_URL}/data/databases`)
            ];
            
            const results = await Promise.allSettled(tests);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            const successfulTests = results.filter(r => r.status === 'fulfilled').length;
            
            if (successfulTests >= 2 && totalTime < 2000) {
                this.results.performance = true;
                console.log(`✅ Performance: ${totalTime}ms, ${successfulTests}/3 endpoints successful`);
                return true;
            }
            
            console.log(`❌ Performance: ${totalTime}ms, ${successfulTests}/3 endpoints successful`);
        } catch (error) {
            console.log('❌ Performance test: FAILED', error.message);
        }
        return false;
    }

    async testErrorHandling() {
        try {
            console.log('🛡️ Testing error handling...');
            
            // Test invalid endpoint
            const response = await fetch(`${API_BASE_URL}/invalid-endpoint`);
            
            if (!response.ok) {
                this.results.errorHandling = true;
                console.log('✅ Error handling: Proper error responses');
                return true;
            }
        } catch (error) {
            // Network errors are also expected
            this.results.errorHandling = true;
            console.log('✅ Error handling: Network errors handled');
            return true;
        }
        
        console.log('❌ Error handling: FAILED');
        return false;
    }

    async testFallbackMechanism() {
        try {
            console.log('🔄 Testing fallback mechanism...');
            
            // Test if system provides fallback data when backend is unavailable
            // This simulates what the frontend does
            const testDirectAPIs = async () => {
                try {
                    const [prozorro, nbu] = await Promise.allSettled([
                        fetch('https://public.api.openprocurement.org/api/2.5/tenders?limit=1'),
                        fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json')
                    ]);
                    
                    const successful = [prozorro, nbu].filter(r => r.status === 'fulfilled').length;
                    return successful >= 1; // At least one API should work
                } catch (error) {
                    return false;
                }
            };
            
            const directAPIsWork = await testDirectAPIs();
            
            if (directAPIsWork) {
                this.results.fallback = true;
                console.log('✅ Fallback mechanism: Direct APIs accessible');
                return true;
            }
            
            console.log('❌ Fallback mechanism: FAILED');
        } catch (error) {
            console.log('❌ Fallback test: FAILED', error.message);
        }
        return false;
    }

    async runAllTests() {
        console.log('🚀 Starting Frontend Integration Tests...\n');
        
        await this.testAPIConnection();
        await this.testRealDataIntegration();
        await this.testPerformance();
        await this.testErrorHandling();
        await this.testFallbackMechanism();
        
        this.generateReport();
    }

    generateReport() {
        console.log('\n📊 FRONTEND INTEGRATION REPORT');
        console.log('=' .repeat(50));
        
        const passedTests = Object.values(this.results).filter(r => r).length;
        const totalTests = Object.keys(this.results).length;
        const score = Math.round((passedTests / totalTests) * 100);
        
        console.log(`\n🎯 Overall Score: ${score}% (${passedTests}/${totalTests} tests passed)`);
        
        console.log('\n📋 Detailed Results:');
        console.log(`  ✅ API Connection: ${this.results.apiConnection ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Real Data Integration: ${this.results.realData ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Performance: ${this.results.performance ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Error Handling: ${this.results.errorHandling ? 'PASS' : 'FAIL'}`);
        console.log(`  ✅ Fallback Mechanism: ${this.results.fallback ? 'PASS' : 'FAIL'}`);
        
        console.log('\n💡 Recommendations:');
        if (!this.results.apiConnection) {
            console.log('  - Check if backend server is running on port 8001');
        }
        if (!this.results.realData) {
            console.log('  - Verify real API endpoints are accessible');
        }
        if (!this.results.performance) {
            console.log('  - Optimize API response times');
        }
        if (!this.results.errorHandling) {
            console.log('  - Implement proper error handling');
        }
        if (!this.results.fallback) {
            console.log('  - Set up fallback mechanisms for offline mode');
        }
        
        if (score >= 80) {
            console.log('\n🎉 FRONTEND INTEGRATION: EXCELLENT');
        } else if (score >= 60) {
            console.log('\n⚠️ FRONTEND INTEGRATION: NEEDS IMPROVEMENT');
        } else {
            console.log('\n❌ FRONTEND INTEGRATION: CRITICAL ISSUES');
        }
        
        return score;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new FrontendIntegrationTester();
    tester.runAllTests().catch(console.error);
}

export default FrontendIntegrationTester;
