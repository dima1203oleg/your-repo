
// Audit Logging Middleware
import { writeFileSync, appendFileSync } from 'fs';

export const auditLog = (action, details = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        details: details,
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown',
        userId: details.userId || 'anonymous'
    };
    
    try {
        appendFileSync('./logs/audit.log', JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Audit logging error:', error);
    }
};

export const auditMiddleware = (action) => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            auditLog(action, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.user?.id,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                responseSize: data ? data.length : 0
            });
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

export default { auditLog, auditMiddleware };
