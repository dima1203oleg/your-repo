
// Security Monitoring Script
import { readFileSync, existsSync } from 'fs';

const monitorSecurity = () => {
    console.log('🔒 Security Monitor - Status Report');
    
    // Check authentication logs
    if (existsSync('./logs/auth.log')) {
        const authLogs = readFileSync('./logs/auth.log', 'utf8');
        const failedLogins = (authLogs.match(/failed/gi) || []).length;
        
        if (failedLogins > 10) {
            console.log('🚨 High number of failed login attempts:', failedLogins);
        }
    }
    
    // Check API logs for suspicious activity
    if (existsSync('./logs/api.log')) {
        const apiLogs = readFileSync('./logs/api.log', 'utf8');
        const errorRate = (apiLogs.match(/error/gi) || []).length / apiLogs.split('\n').length;
        
        if (errorRate > 0.1) {
            console.log('🚨 High API error rate:', (errorRate * 100).toFixed(2) + '%');
        }
    }
    
    console.log('✅ Security monitoring completed');
};

monitorSecurity();
setInterval(monitorSecurity, 300000); // Every 5 minutes
