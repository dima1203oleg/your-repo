// Security Hardening System for Predator Analytics
// Comprehensive security assessment and hardening

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { createHash, randomBytes } from 'crypto';

class SecurityHardeningSystem {
    constructor() {
        this.securityConfig = {
            enableRateLimiting: true,
            enableCORS: true,
            enableHelmet: true,
            enableInputValidation: true,
            enableSQLInjectionProtection: true,
            enableXSSProtection: true,
            enableCSRFProtection: true,
            enableAuthentication: true,
            enableAuthorization: true,
            enableAuditLogging: true,
            enableEncryption: true,
            sessionTimeout: 3600000, // 1 hour
            maxLoginAttempts: 5,
            lockoutDuration: 900000, // 15 minutes
            passwordMinLength: 12,
            passwordRequireSpecialChars: true,
            enableTwoFactorAuth: false
        };
        
        this.vulnerabilities = [];
        this.securityScore = 0;
        this.recommendations = [];
        this.hardeningSteps = [];
        
        this.initializeSecurity();
    }

    initializeSecurity() {
        console.log('🔒 Initializing Security Hardening System...');
        this.performSecurityAssessment();
        this.generateSecurityReport();
        this.applyHardening();
    }

    performSecurityAssessment() {
        console.log('🔍 Performing Security Assessment...');
        
        const assessments = [
            this.checkDependencies(),
            this.checkEnvironmentVariables(),
            this.checkFilePermissions(),
            this.checkAPIEndpoints(),
            this.checkAuthentication(),
            this.checkDataValidation(),
            this.checkLoggingSecurity(),
            this.checkNetworkSecurity(),
            this.checkContainerSecurity(),
            this.checkDatabaseSecurity()
        ];
        
        this.vulnerabilities = assessments.filter(a => a.vulnerabilities).flatMap(a => a.vulnerabilities);
        this.calculateSecurityScore();
    }

    checkDependencies() {
        const vulnerabilities = [];
        
        try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            // Check for known vulnerable packages
            Object.entries(deps).forEach(([name, version]) => {
                if (this.isVulnerablePackage(name, version)) {
                    vulnerabilities.push({
                        type: 'dependency',
                        severity: 'high',
                        package: name,
                        version: version,
                        description: `Package ${name}@${version} has known vulnerabilities`,
                        recommendation: `Update to latest version or replace with secure alternative`
                    });
                }
            });
            
            // Check for security-related packages
            const securityPackages = ['helmet', 'cors', 'express-rate-limit', 'bcrypt', 'jsonwebtoken', 'express-validator'];
            const missingSecurityPackages = securityPackages.filter(pkg => !deps[pkg]);
            
            if (missingSecurityPackages.length > 0) {
                vulnerabilities.push({
                    type: 'missing_security',
                    severity: 'medium',
                    packages: missingSecurityPackages,
                    description: 'Missing security packages',
                    recommendation: `Install: ${missingSecurityPackages.join(', ')}`
                });
            }
            
        } catch (error) {
            vulnerabilities.push({
                type: 'assessment_error',
                severity: 'low',
                description: 'Could not assess dependencies',
                recommendation: 'Ensure package.json is accessible'
            });
        }
        
        return { vulnerabilities };
    }

    checkEnvironmentVariables() {
        const vulnerabilities = [];
        
        // Check for .env file
        if (existsSync('.env')) {
            try {
                const envContent = readFileSync('.env', 'utf8');
                
                // Check for secrets in plain text
                const secretPatterns = [
                    /password\s*=\s*\w+/i,
                    /secret\s*=\s*\w+/i,
                    /key\s*=\s*\w+/i,
                    /token\s*=\s*\w+/i
                ];
                
                secretPatterns.forEach(pattern => {
                    if (pattern.test(envContent)) {
                        vulnerabilities.push({
                            type: 'exposed_secrets',
                            severity: 'high',
                            description: 'Potential secrets found in .env file',
                            recommendation: 'Use environment variables or secret management'
                        });
                    }
                });
                
            } catch (error) {
                // File not readable
            }
        }
        
        // Check for missing required environment variables
        const requiredEnvVars = [
            'NODE_ENV',
            'PORT',
            'DATABASE_URL',
            'JWT_SECRET'
        ];
        
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingEnvVars.length > 0) {
            vulnerabilities.push({
                type: 'missing_env_vars',
                severity: 'medium',
                variables: missingEnvVars,
                description: 'Missing required environment variables',
                recommendation: 'Set all required environment variables'
            });
        }
        
        return { vulnerabilities };
    }

    checkFilePermissions() {
        const vulnerabilities = [];
        
        try {
            // Check for world-writable files
            const result = execSync('find . -type f -perm /o+w -not -path "./node_modules/*" -not -path "./.git/*"', { encoding: 'utf8' });
            const writableFiles = result.trim().split('\n').filter(file => file);
            
            if (writableFiles.length > 0) {
                vulnerabilities.push({
                    type: 'file_permissions',
                    severity: 'medium',
                    files: writableFiles,
                    description: 'World-writable files found',
                    recommendation: 'Remove world-write permissions: chmod o-w'
                });
            }
            
            // Check for sensitive files with weak permissions
            const sensitiveFiles = ['.env', 'package.json', 'config/*.js', '*.key', '*.pem'];
            
            sensitiveFiles.forEach(pattern => {
                try {
                    const files = execSync(`find . -name "${pattern}" -not -path "./node_modules/*"`, { encoding: 'utf8' });
                    const fileList = files.trim().split('\n').filter(file => file);
                    
                    fileList.forEach(file => {
                        try {
                            const stats = execSync(`ls -la "${file}"`, { encoding: 'utf8' });
                            const permissions = stats.trim().split(/\s+/)[0];
                            
                            if (permissions.includes('r') && permissions.includes('w') && permissions.includes('x')) {
                                vulnerabilities.push({
                                    type: 'sensitive_file_permissions',
                                    severity: 'high',
                                    file: file,
                                    permissions: permissions,
                                    description: 'Sensitive file has weak permissions',
                                    recommendation: 'Restrict file permissions: chmod 600'
                                });
                            }
                        } catch (error) {
                            // Could not check file
                        }
                    });
                } catch (error) {
                    // No files found
                }
            });
            
        } catch (error) {
            vulnerabilities.push({
                type: 'permission_check_error',
                severity: 'low',
                description: 'Could not check file permissions',
                recommendation: 'Ensure file system is accessible'
            });
        }
        
        return { vulnerabilities };
    }

    checkAPIEndpoints() {
        const vulnerabilities = [];
        
        // Check for unsecured endpoints
        const unsecurePatterns = [
            /\/api\/v1\/admin/,
            /\/api\/v1\/users/,
            /\/api\/v1\/config/,
            /\/api\/v1\/logs/
        ];
        
        // This would normally check actual API endpoints
        // For now, we'll check if security middleware is implemented
        
        try {
            const serverFiles = [
                './simple-proxy.js',
                './real-backend/server.js',
                './server.js'
            ];
            
            let hasRateLimit = false;
            let hasHelmet = false;
            let hasCORS = false;
            let hasAuth = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        
                        if (content.includes('rate-limit') || content.includes('rateLimit')) {
                            hasRateLimit = true;
                        }
                        if (content.includes('helmet')) {
                            hasHelmet = true;
                        }
                        if (content.includes('cors')) {
                            hasCORS = true;
                        }
                        if (content.includes('auth') || content.includes('jwt')) {
                            hasAuth = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasRateLimit) {
                vulnerabilities.push({
                    type: 'missing_rate_limit',
                    severity: 'high',
                    description: 'API endpoints lack rate limiting',
                    recommendation: 'Implement rate limiting middleware'
                });
            }
            
            if (!hasHelmet) {
                vulnerabilities.push({
                    type: 'missing_security_headers',
                    severity: 'medium',
                    description: 'Missing security headers (Helmet)',
                    recommendation: 'Install and configure helmet middleware'
                });
            }
            
            if (!hasCORS) {
                vulnerabilities.push({
                    type: 'missing_cors',
                    severity: 'medium',
                    description: 'Missing CORS configuration',
                    recommendation: 'Configure CORS properly'
                });
            }
            
            if (!hasAuth) {
                vulnerabilities.push({
                    type: 'missing_authentication',
                    severity: 'high',
                    description: 'API endpoints lack authentication',
                    recommendation: 'Implement JWT or other authentication'
                });
            }
            
        } catch (error) {
            vulnerabilities.push({
                type: 'api_check_error',
                severity: 'low',
                description: 'Could not assess API security',
                recommendation: 'Ensure server files are accessible'
            });
        }
        
        return { vulnerabilities };
    }

    checkAuthentication() {
        const vulnerabilities = [];
        
        // Check for password policies
        if (this.securityConfig.passwordMinLength < 8) {
            vulnerabilities.push({
                type: 'weak_password_policy',
                severity: 'medium',
                description: 'Password minimum length is too short',
                recommendation: 'Set minimum password length to at least 8 characters'
            });
        }
        
        // Check for session management
        if (this.securityConfig.sessionTimeout > 86400000) { // 24 hours
            vulnerabilities.push({
                type: 'long_session_timeout',
                severity: 'medium',
                description: 'Session timeout is too long',
                recommendation: 'Reduce session timeout to 1-8 hours'
            });
        }
        
        // Check for login attempt limits
        if (this.securityConfig.maxLoginAttempts > 10) {
            vulnerabilities.push({
                type: 'weak_login_protection',
                severity: 'medium',
                description: 'Too many allowed login attempts',
                recommendation: 'Limit login attempts to 5 or fewer'
            });
        }
        
        return { vulnerabilities };
    }

    checkDataValidation() {
        const vulnerabilities = [];
        
        // Check for input validation
        try {
            const serverFiles = ['./simple-proxy.js', './real-backend/server.js'];
            let hasInputValidation = false;
            
            serverFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        
                        if (content.includes('validator') || content.includes('sanitize') || content.includes('escape')) {
                            hasInputValidation = true;
                        }
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
            if (!hasInputValidation) {
                vulnerabilities.push({
                    type: 'missing_input_validation',
                    severity: 'high',
                    description: 'API endpoints lack input validation',
                    recommendation: 'Implement input validation and sanitization'
                });
            }
            
        } catch (error) {
            vulnerabilities.push({
                type: 'validation_check_error',
                severity: 'low',
                description: 'Could not assess input validation',
                recommendation: 'Ensure server files are accessible'
            });
        }
        
        return { vulnerabilities };
    }

    checkLoggingSecurity() {
        const vulnerabilities = [];
        
        // Check for sensitive data in logs
        try {
            const logFiles = ['./logs/*.log', './logs/**/*.log'];
            
            logFiles.forEach(pattern => {
                try {
                    const files = execSync(`find . -name "${pattern}"`, { encoding: 'utf8' });
                    const fileList = files.trim().split('\n').filter(file => file);
                    
                    fileList.forEach(file => {
                        try {
                            const content = readFileSync(file, 'utf8');
                            
                            // Check for sensitive data patterns
                            const sensitivePatterns = [
                                /password/i,
                                /secret/i,
                                /token/i,
                                /key/i
                            ];
                            
                            sensitivePatterns.forEach(pattern => {
                                if (pattern.test(content)) {
                                    vulnerabilities.push({
                                        type: 'sensitive_data_in_logs',
                                        severity: 'medium',
                                        file: file,
                                        description: 'Sensitive data found in logs',
                                        recommendation: 'Remove sensitive data from logs'
                                    });
                                }
                            });
                        } catch (error) {
                            // Could not read file
                        }
                    });
                } catch (error) {
                    // No files found
                }
            });
            
        } catch (error) {
            vulnerabilities.push({
                type: 'log_check_error',
                severity: 'low',
                description: 'Could not assess log security',
                recommendation: 'Ensure log files are accessible'
            });
        }
        
        return { vulnerabilities };
    }

    checkNetworkSecurity() {
        const vulnerabilities = [];
        
        // Check for open ports
        try {
            const result = execSync('netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null', { encoding: 'utf8' });
            const lines = result.trim().split('\n').filter(line => line.includes('LISTEN'));
            
            const suspiciousPorts = lines.filter(line => {
                const port = line.trim().split(/\s+/).pop().split(':').pop();
                return parseInt(port) > 8000 && parseInt(port) < 9000;
            });
            
            if (suspiciousPorts.length > 0) {
                vulnerabilities.push({
                    type: 'open_ports',
                    severity: 'medium',
                    ports: suspiciousPorts,
                    description: 'Multiple open ports detected',
                    recommendation: 'Review and close unnecessary ports'
                });
            }
            
        } catch (error) {
            vulnerabilities.push({
                type: 'network_check_error',
                severity: 'low',
                description: 'Could not assess network security',
                recommendation: 'Ensure network tools are available'
            });
        }
        
        return { vulnerabilities };
    }

    checkContainerSecurity() {
        const vulnerabilities = [];
        
        // Check Docker configuration
        if (existsSync('Dockerfile')) {
            try {
                const dockerfile = readFileSync('Dockerfile', 'utf8');
                
                // Check for running as root
                if (!dockerfile.includes('USER') || dockerfile.includes('USER root')) {
                    vulnerabilities.push({
                        type: 'container_root_user',
                        severity: 'high',
                        description: 'Container running as root user',
                        recommendation: 'Create and use non-root user in container'
                    });
                }
                
                // Check for exposed secrets
                if (dockerfile.includes('ENV') && (dockerfile.includes('PASSWORD') || dockerfile.includes('SECRET'))) {
                    vulnerabilities.push({
                        type: 'container_secrets',
                        severity: 'high',
                        description: 'Secrets in Dockerfile',
                        recommendation: 'Use environment variables or secrets management'
                    });
                }
                
            } catch (error) {
                vulnerabilities.push({
                    type: 'dockerfile_check_error',
                    severity: 'low',
                    description: 'Could not assess Dockerfile',
                    recommendation: 'Ensure Dockerfile is accessible'
                });
            }
        }
        
        // Check docker-compose configuration
        if (existsSync('docker-compose.yml') || existsSync('docker-compose.prod.yml')) {
            const composeFiles = ['docker-compose.yml', 'docker-compose.prod.yml'];
            
            composeFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const compose = readFileSync(file, 'utf8');
                        
                        // Check for exposed ports
                        if (compose.includes('ports:') && compose.includes('"80"') || compose.includes('"443"')) {
                            // This is actually good - using standard ports
                        }
                        
                        // Check for privileged mode
                        if (compose.includes('privileged: true')) {
                            vulnerabilities.push({
                                type: 'container_privileged',
                                severity: 'high',
                                file: file,
                                description: 'Container running in privileged mode',
                                recommendation: 'Remove privileged mode unless absolutely necessary'
                            });
                        }
                        
                    } catch (error) {
                        vulnerabilities.push({
                            type: 'compose_check_error',
                            severity: 'low',
                            file: file,
                            description: 'Could not assess compose file',
                            recommendation: 'Ensure compose file is accessible'
                        });
                    }
                }
            });
        }
        
        return { vulnerabilities };
    }

    checkDatabaseSecurity() {
        const vulnerabilities = [];
        
        // Check for database configuration
        try {
            const configFiles = ['./config/database.js', './config/db.js', './database.js'];
            
            configFiles.forEach(file => {
                if (existsSync(file)) {
                    try {
                        const content = readFileSync(file, 'utf8');
                        
                        // Check for hardcoded credentials
                        if (content.includes('password:') || content.includes('secret:')) {
                            vulnerabilities.push({
                                type: 'database_credentials',
                                severity: 'high',
                                file: file,
                                description: 'Database credentials in configuration file',
                                recommendation: 'Use environment variables for database credentials'
                            });
                        }
                        
                        // Check for SSL configuration
                        if (!content.includes('ssl') && !content.includes('SSL')) {
                            vulnerabilities.push({
                                type: 'database_ssl',
                                severity: 'medium',
                                file: file,
                                description: 'Database connection not using SSL',
                                recommendation: 'Enable SSL for database connections'
                            });
                        }
                        
                    } catch (error) {
                        // Could not read file
                    }
                }
            });
            
        } catch (error) {
            vulnerabilities.push({
                type: 'database_check_error',
                severity: 'low',
                description: 'Could not assess database security',
                recommendation: 'Ensure database configuration is accessible'
            });
        }
        
        return { vulnerabilities };
    }

    isVulnerablePackage(name, version) {
        // Simplified vulnerability check - in real implementation, use npm audit or security advisories
        const vulnerablePackages = [
            'lodash', 'underscore', 'request', 'moment', 'axios',
            'express', 'socket.io', 'mongoose', 'sequelize'
        ];
        
        return vulnerablePackages.includes(name.toLowerCase());
    }

    calculateSecurityScore() {
        const totalChecks = 10; // Number of assessment categories
        const passedChecks = totalChecks - this.vulnerabilities.length;
        
        // Weight vulnerabilities by severity
        const severityWeights = {
            low: 1,
            medium: 5,
            high: 10,
            critical: 20
        };
        
        let totalWeight = 0;
        let maxWeight = 100;
        
        this.vulnerabilities.forEach(vuln => {
            totalWeight += severityWeights[vuln.severity] || 5;
        });
        
        this.securityScore = Math.max(0, Math.round(100 - (totalWeight / maxWeight * 100)));
        
        // Generate recommendations
        this.generateRecommendations();
    }

    generateRecommendations() {
        this.recommendations = [
            'Install and configure security middleware (helmet, cors, rate-limiting)',
            'Implement proper authentication and authorization',
            'Add input validation and sanitization',
            'Use environment variables for sensitive configuration',
            'Enable SSL/TLS for all connections',
            'Implement proper logging and monitoring',
            'Regular security audits and dependency updates',
            'Use container security best practices',
            'Implement proper error handling',
            'Add security headers and CSP'
        ];
        
        // Add specific recommendations based on vulnerabilities
        const vulnerabilityTypes = [...new Set(this.vulnerabilities.map(v => v.type))];
        
        vulnerabilityTypes.forEach(type => {
            switch (type) {
                case 'dependency':
                    this.recommendations.unshift('Update vulnerable dependencies');
                    break;
                case 'exposed_secrets':
                    this.recommendations.unshift('Remove secrets from code and use secret management');
                    break;
                case 'missing_authentication':
                    this.recommendations.unshift('Implement authentication for all API endpoints');
                    break;
                case 'missing_rate_limit':
                    this.recommendations.unshift('Implement rate limiting to prevent DDoS attacks');
                    break;
                case 'container_root_user':
                    this.recommendations.unshift('Run containers as non-root user');
                    break;
            }
        });
    }

    applyHardening() {
        console.log('🔧 Applying Security Hardening...');
        
        const hardeningSteps = [
            this.createSecurityHeaders(),
            this.createRateLimiting(),
            this.createInputValidation(),
            this.createAuthentication(),
            this.createAuditLogging(),
            this.createEnvironmentTemplate(),
            this.createDockerSecurity(),
            this.createSecurityScripts()
        ];
        
        this.hardeningSteps = hardeningSteps.filter(step => step !== null);
        
        console.log(`✅ Applied ${this.hardeningSteps.length} security hardening steps`);
    }

    createSecurityHeaders() {
        const securityMiddleware = `
// Security Headers Middleware
import helmet from 'helmet';

const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true
});

export default securityHeaders;
`;
        
        try {
            writeFileSync('./middleware/security-headers.js', securityMiddleware);
            return 'Security headers middleware created';
        } catch (error) {
            console.error('Error creating security headers:', error);
            return null;
        }
    }

    createRateLimiting() {
        const rateLimitMiddleware = `
// Rate Limiting Middleware
import rateLimit from 'express-rate-limit';

const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Different limits for different endpoints
export const strictLimit = createRateLimit(15 * 60 * 1000, 10); // 15 min, 10 requests
export const normalLimit = createRateLimit(15 * 60 * 1000, 100); // 15 min, 100 requests
export const looseLimit = createRateLimit(15 * 60 * 1000, 1000); // 15 min, 1000 requests

export default createRateLimit;
`;
        
        try {
            writeFileSync('./middleware/rate-limiting.js', rateLimitMiddleware);
            return 'Rate limiting middleware created';
        } catch (error) {
            console.error('Error creating rate limiting:', error);
            return null;
        }
    }

    createInputValidation() {
        const validationMiddleware = `
// Input Validation Middleware
import { body, validationResult } from 'express-validator';

export const validateInput = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

export const sanitizeInput = (req, res, next) => {
    // Sanitize request body, query, and params
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        });
    }
    
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = req.query[key].trim();
            }
        });
    }
    
    next();
};

// Common validation rules
export const userValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('name').isLength({ min: 2, max: 50 }).trim(),
];

export default { validateInput, sanitizeInput, userValidation };
`;
        
        try {
            writeFileSync('./middleware/input-validation.js', validationMiddleware);
            return 'Input validation middleware created';
        } catch (error) {
            console.error('Error creating input validation:', error);
            return null;
        }
    }

    createAuthentication() {
        const authMiddleware = `
// Authentication Middleware
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

export const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Access denied.' });
        }
        
        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions.' });
        }
        
        next();
    };
};

export default { generateToken, verifyToken, hashPassword, comparePassword, authenticate, authorize };
`;
        
        try {
            writeFileSync('./middleware/authentication.js', authMiddleware);
            return 'Authentication middleware created';
        } catch (error) {
            console.error('Error creating authentication:', error);
            return null;
        }
    }

    createAuditLogging() {
        const auditLogger = `
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
        appendFileSync('./logs/audit.log', JSON.stringify(logEntry) + '\\n');
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
`;
        
        try {
            writeFileSync('./middleware/audit-logging.js', auditLogger);
            return 'Audit logging middleware created';
        } catch (error) {
            console.error('Error creating audit logging:', error);
            return null;
        }
    }

    createEnvironmentTemplate() {
        const envTemplate = `# Environment Variables Template
# Copy this file to .env and fill in your values

# Application
NODE_ENV=production
PORT=3003
HOST=localhost

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/predator_analytics
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=predator_analytics
DATABASE_USER=predator_user
DATABASE_PASSWORD=your_secure_password_here

# Security
JWT_SECRET=your_jwt_secret_key_here_at_least_32_characters_long
SESSION_SECRET=your_session_secret_here_at_least_32_characters_long
BCRYPT_ROUNDS=12

# External APIs
PROZORRO_API_URL=https://api.prozorro.gov.ua
NBU_API_URL=https://bank.gov.ua
TAX_API_URL=https://tax.gov.ua
CUSTOMS_API_URL=https://customs.gov.ua

# Monitoring
MONITORING_PORT=3004
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Email (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here

# Slack (for alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts

# Backup
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key_here

# Security
ENABLE_HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Two-Factor Authentication
ENABLE_2FA=false
2FA_ISSUER=PredatorAnalytics
`;
        
        try {
            writeFileSync('.env.template', envTemplate);
            return 'Environment template created';
        } catch (error) {
            console.error('Error creating environment template:', error);
            return null;
        }
    }

    createDockerSecurity() {
        const dockerSecurity = `
# Docker Security Configuration
# Add these security improvements to your Dockerfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

# Set proper permissions
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Remove unnecessary packages
RUN apk del --purge \\
    python3 \\
    make \\
    g++ \\
    && rm -rf /var/cache/apk/*

# Set secure file permissions
RUN chmod 600 /app/.env* \\
    && chmod 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3003/health || exit 1

# Security labels
LABEL security.scan.enabled="true" \\
      security.policy="strict" \\
      maintainer="security-team@predator-analytics.com"
`;
        
        try {
            writeFileSync('./docker-security.md', dockerSecurity);
            return 'Docker security guide created';
        } catch (error) {
            console.error('Error creating Docker security:', error);
            return null;
        }
    }

    createSecurityScripts() {
        const securityScripts = {
            'security-scan.js': `
// Security Scan Script
import { execSync } from 'child_process';

console.log('🔍 Running Security Scan...');

try {
    // Check for vulnerabilities
    console.log('📦 Checking for vulnerable dependencies...');
    execSync('npm audit --audit-level=high', { stdio: 'inherit' });
    
    // Check for secrets
    console.log('🔑 Checking for exposed secrets...');
    execSync('git-secrets --scan', { stdio: 'inherit' });
    
    // Check file permissions
    console.log('📁 Checking file permissions...');
    execSync('find . -type f -perm /o+w -not -path "./node_modules/*"', { stdio: 'inherit' });
    
    console.log('✅ Security scan completed');
} catch (error) {
    console.error('❌ Security scan failed:', error.message);
    process.exit(1);
}
`,
            'security-monitor.js': `
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
        const errorRate = (apiLogs.match(/error/gi) || []).length / apiLogs.split('\\n').length;
        
        if (errorRate > 0.1) {
            console.log('🚨 High API error rate:', (errorRate * 100).toFixed(2) + '%');
        }
    }
    
    console.log('✅ Security monitoring completed');
};

monitorSecurity();
setInterval(monitorSecurity, 300000); // Every 5 minutes
`
        };
        
        let createdScripts = 0;
        
        Object.entries(securityScripts).forEach(([filename, content]) => {
            try {
                writeFileSync(`./scripts/${filename}`, content);
                createdScripts++;
            } catch (error) {
                console.error(`Error creating ${filename}:`, error);
            }
        });
        
        return createdScripts > 0 ? `Created ${createdScripts} security scripts` : null;
    }

    generateSecurityReport() {
        console.log('\n📊 SECURITY ASSESSMENT REPORT');
        console.log('=' .repeat(60));
        
        console.log(`\n🔒 Security Score: ${this.securityScore}/100`);
        
        if (this.securityScore >= 80) {
            console.log('✅ Security posture: GOOD');
        } else if (this.securityScore >= 60) {
            console.log('⚠️ Security posture: MODERATE');
        } else {
            console.log('🚨 Security posture: POOR');
        }
        
        console.log(`\n🔍 Vulnerabilities Found: ${this.vulnerabilities.length}`);
        
        if (this.vulnerabilities.length > 0) {
            console.log('\n📋 Vulnerability Summary:');
            const severityCount = {
                low: 0,
                medium: 0,
                high: 0,
                critical: 0
            };
            
            this.vulnerabilities.forEach(vuln => {
                severityCount[vuln.severity]++;
            });
            
            Object.entries(severityCount).forEach(([severity, count]) => {
                if (count > 0) {
                    console.log(`  • ${severity.toUpperCase()}: ${count}`);
                }
            });
            
            console.log('\n🚨 Critical Issues:');
            this.vulnerabilities
                .filter(v => v.severity === 'high' || v.severity === 'critical')
                .forEach(vuln => {
                    console.log(`  • ${vuln.description}`);
                    console.log(`    Recommendation: ${vuln.recommendation}`);
                });
        }
        
        console.log(`\n🔧 Hardening Steps Applied: ${this.hardeningSteps.length}`);
        this.hardeningSteps.forEach(step => {
            console.log(`  ✅ ${step}`);
        });
        
        console.log('\n💡 Security Recommendations:');
        this.recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
        
        console.log('\n🎯 Next Steps:');
        console.log('  1. Review and address all high/critical vulnerabilities');
        console.log('  2. Implement the created security middleware');
        console.log('  3. Set up environment variables using .env.template');
        console.log('  4. Run regular security scans');
        console.log('  5. Monitor security logs and alerts');
        
        return {
            score: this.securityScore,
            vulnerabilities: this.vulnerabilities,
            hardeningSteps: this.hardeningSteps,
            recommendations: this.recommendations
        };
    }

    getSecurityStatus() {
        return {
            score: this.securityScore,
            vulnerabilities: this.vulnerabilities.length,
            hardeningApplied: this.hardeningSteps.length,
            status: this.securityScore >= 80 ? 'secure' : this.securityScore >= 60 ? 'moderate' : 'vulnerable'
        };
    }
}

// Run security hardening if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const security = new SecurityHardeningSystem();
    
    console.log('🎊 Security Hardening System completed!');
    console.log(`🔒 Security Score: ${security.securityScore}/100`);
    console.log(`🔧 Hardening Steps Applied: ${security.hardeningSteps.length}`);
}

export default SecurityHardeningSystem;
