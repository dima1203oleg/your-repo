// Enterprise SSO System for Predator Analytics
// Single Sign-On with multi-provider support

import { EventEmitter } from 'events';
import { createHash, randomBytes, createHmac } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

class EnterpriseSSOSystem extends EventEmitter {
    constructor() {
        super();
        this.providers = new Map();
        this.sessions = new Map();
        this.users = new Map();
        this.tokens = new Map();
        this.auditLogs = [];
        
        this.config = {
            enableOAuth2: true,
            enableSAML: true,
            enableLDAP: true,
            enableJWT: true,
            enableMFA: true,
            sessionTimeout: 3600000, // 1 hour
            tokenTimeout: 1800000, // 30 minutes
            maxLoginAttempts: 5,
            lockoutDuration: 900000, // 15 minutes
            enableAuditLogging: true,
            enableRBAC: true,
            enablePasswordPolicy: true,
            passwordMinLength: 12,
            passwordRequireSpecialChars: true,
            enablePasswordHistory: true,
            passwordHistoryCount: 5
        };
        
        this.initializeSSO();
    }

    initializeSSO() {
        console.log('🔐 Initializing Enterprise SSO System...');
        
        // Initialize authentication providers
        this.initializeProviders();
        
        // Load existing data
        this.loadSSOData();
        
        // Start session cleanup
        this.startSessionCleanup();
        
        // Start audit logging
        if (this.config.enableAuditLogging) {
            this.startAuditLogging();
        }
        
        console.log('✅ Enterprise SSO System initialized');
    }

    initializeProviders() {
        // OAuth2 Provider (Google, Microsoft, etc.)
        this.providers.set('oauth2', {
            name: 'OAuth2',
            type: 'oauth2',
            enabled: this.config.enableOAuth2,
            clients: new Map(),
            endpoints: {
                auth: '/oauth2/auth',
                token: '/oauth2/token',
                userinfo: '/oauth2/userinfo',
                revoke: '/oauth2/revoke'
            },
            config: {
                grantTypes: ['authorization_code', 'refresh_token'],
                responseTypes: ['code'],
                scopes: ['openid', 'profile', 'email', 'analytics']
            }
        });
        
        // SAML Provider
        this.providers.set('saml', {
            name: 'SAML',
            type: 'saml',
            enabled: this.config.enableSAML,
            identityProviders: new Map(),
            config: {
                signatureAlgorithm: 'RSA-SHA256',
                digestAlgorithm: 'SHA256',
                nameIdFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:email'
            }
        });
        
        // LDAP Provider
        this.providers.set('ldap', {
            name: 'LDAP',
            type: 'ldap',
            enabled: this.config.enableLDAP,
            connections: new Map(),
            config: {
                baseDN: 'dc=predator,dc=analytics',
                userFilter: '(uid={username})',
                groupFilter: '(member={userDN})'
            }
        });
        
        // JWT Provider
        this.providers.set('jwt', {
            name: 'JWT',
            type: 'jwt',
            enabled: this.config.enableJWT,
            keys: new Map(),
            config: {
                algorithm: 'RS256',
                expiresIn: '1h',
                issuer: 'predator-analytics-sso'
            }
        });
        
        console.log(`🔐 Initialized ${this.providers.size} authentication providers`);
    }

    // OAuth2 Flow
    initiateOAuth2Flow(clientId, redirectUri, scope, state) {
        const provider = this.providers.get('oauth2');
        if (!provider.enabled) {
            throw new Error('OAuth2 provider not enabled');
        }
        
        const authCode = this.generateAuthCode();
        const authRequest = {
            clientId: clientId,
            redirectUri: redirectUri,
            scope: scope,
            state: state,
            code: authCode,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000 // 10 minutes
        };
        
        provider.clients.set(authCode, authRequest);
        
        this.logAuditEvent('oauth2_auth_initiated', {
            clientId: clientId,
            redirectUri: redirectUri,
            scope: scope
        });
        
        return {
            authUrl: `${provider.endpoints.auth}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&code=${authCode}`,
            code: authCode,
            state: state
        };
    }

    exchangeCodeForToken(code, clientId, clientSecret) {
        const provider = this.providers.get('oauth2');
        const authRequest = provider.clients.get(code);
        
        if (!authRequest || authRequest.expiresAt < Date.now()) {
            throw new Error('Invalid or expired authorization code');
        }
        
        if (authRequest.clientId !== clientId) {
            throw new Error('Client ID mismatch');
        }
        
        // Verify client secret (simplified)
        const expectedSecret = this.generateClientSecret(clientId);
        if (clientSecret !== expectedSecret) {
            throw new Error('Invalid client secret');
        }
        
        // Generate access token
        const accessToken = this.generateAccessToken();
        const refreshToken = this.generateRefreshToken();
        
        const tokenData = {
            accessToken: accessToken,
            refreshToken: refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.config.tokenTimeout,
            scope: authRequest.scope,
            clientId: clientId,
            createdAt: Date.now()
        };
        
        this.tokens.set(accessToken, tokenData);
        
        // Remove auth request
        provider.clients.delete(code);
        
        this.logAuditEvent('oauth2_token_exchanged', {
            clientId: clientId,
            scope: authRequest.scope
        });
        
        return tokenData;
    }

    // SAML Flow
    initiateSAMLFlow(samlRequest) {
        const provider = this.providers.get('saml');
        if (!provider.enabled) {
            throw new Error('SAML provider not enabled');
        }
        
        // Parse SAML request (simplified)
        const samlResponse = this.generateSAMLResponse(samlRequest);
        
        this.logAuditEvent('saml_auth_initiated', {
            samlRequest: samlRequest
        });
        
        return {
            samlResponse: samlResponse,
            relayState: this.generateRelayState()
        };
    }

    processSAMLResponse(samlResponse) {
        const provider = this.providers.get('saml');
        
        // Validate SAML response (simplified)
        const assertion = this.parseSAMLAssertion(samlResponse);
        
        if (!assertion) {
            throw new Error('Invalid SAML response');
        }
        
        // Extract user information
        const userInfo = {
            id: assertion.nameId,
            email: assertion.attributes.email,
            name: assertion.attributes.name,
            groups: assertion.attributes.groups || []
        };
        
        // Create session
        const session = this.createSession(userInfo, 'saml');
        
        this.logAuditEvent('saml_auth_completed', {
            userId: userInfo.id,
            email: userInfo.email
        });
        
        return session;
    }

    // LDAP Authentication
    authenticateLDAP(username, password) {
        const provider = this.providers.get('ldap');
        if (!provider.enabled) {
            throw new Error('LDAP provider not enabled');
        }
        
        // Simulate LDAP authentication
        const user = this.users.get(username);
        
        if (!user || user.provider !== 'ldap') {
            throw new Error('User not found in LDAP');
        }
        
        // Verify password (simplified)
        const hashedPassword = this.hashPassword(password);
        if (user.password !== hashedPassword) {
            this.handleFailedLogin(username);
            throw new Error('Invalid credentials');
        }
        
        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > Date.now()) {
            throw new Error('Account locked');
        }
        
        // Reset failed attempts
        user.failedAttempts = 0;
        
        // Create session
        const session = this.createSession(user, 'ldap');
        
        this.logAuditEvent('ldap_auth_completed', {
            username: username
        });
        
        return session;
    }

    // JWT Authentication
    generateJWTToken(payload) {
        const provider = this.providers.get('jwt');
        if (!provider.enabled) {
            throw new Error('JWT provider not enabled');
        }
        
        const header = {
            alg: provider.config.algorithm,
            typ: 'JWT'
        };
        
        const now = Date.now();
        const jwtPayload = {
            ...payload,
            iat: Math.floor(now / 1000),
            exp: Math.floor((now + this.config.tokenTimeout) / 1000),
            iss: provider.config.issuer
        };
        
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedPayload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');
        
        const signature = this.signJWT(encodedHeader, encodedPayload);
        
        const token = `${encodedHeader}.${encodedPayload}.${signature}`;
        
        this.tokens.set(token, {
            payload: jwtPayload,
            createdAt: now,
            expiresAt: now + this.config.tokenTimeout
        });
        
        this.logAuditEvent('jwt_token_generated', {
            userId: payload.sub,
            expiresAt: jwtPayload.exp
        });
        
        return token;
    }

    verifyJWTToken(token) {
        const provider = this.providers.get('jwt');
        const tokenData = this.tokens.get(token);
        
        if (!tokenData || tokenData.expiresAt < Date.now()) {
            throw new Error('Invalid or expired token');
        }
        
        // Verify signature (simplified)
        const [header, payload, signature] = token.split('.');
        const expectedSignature = this.signJWT(header, payload);
        
        if (signature !== expectedSignature) {
            throw new Error('Invalid token signature');
        }
        
        return tokenData.payload;
    }

    // Session Management
    createSession(user, provider) {
        const sessionId = this.generateSessionId();
        const session = {
            id: sessionId,
            userId: user.id || user.username,
            username: user.username,
            email: user.email,
            provider: provider,
            roles: user.roles || [],
            permissions: user.permissions || [],
            createdAt: Date.now(),
            lastActivity: Date.now(),
            expiresAt: Date.now() + this.config.sessionTimeout,
            mfaVerified: false,
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent()
        };
        
        this.sessions.set(sessionId, session);
        
        this.logAuditEvent('session_created', {
            sessionId: sessionId,
            userId: session.userId,
            provider: provider
        });
        
        return session;
    }

    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (!session || session.expiresAt < Date.now()) {
            if (session) {
                this.sessions.delete(sessionId);
                this.logAuditEvent('session_expired', {
                    sessionId: sessionId,
                    userId: session.userId
                });
            }
            throw new Error('Invalid or expired session');
        }
        
        // Update last activity
        session.lastActivity = Date.now();
        
        return session;
    }

    destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        
        if (session) {
            this.sessions.delete(sessionId);
            
            this.logAuditEvent('session_destroyed', {
                sessionId: sessionId,
                userId: session.userId
            });
            
            return true;
        }
        
        return false;
    }

    // Multi-Factor Authentication
    initiateMFA(sessionId) {
        if (!this.config.enableMFA) {
            return { mfaRequired: false };
        }
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Invalid session');
        }
        
        const mfaToken = this.generateMFAToken();
        const mfaChallenge = {
            sessionId: sessionId,
            token: mfaToken,
            method: 'totp', // Time-based One-Time Password
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000, // 5 minutes
            attempts: 0,
            maxAttempts: 3
        };
        
        // Store MFA challenge (simplified - in production, use secure storage)
        session.mfaChallenge = mfaChallenge;
        
        this.logAuditEvent('mfa_initiated', {
            sessionId: sessionId,
            userId: session.userId
        });
        
        return {
            mfaRequired: true,
            mfaToken: mfaToken,
            expiresAt: mfaChallenge.expiresAt
        };
    }

    verifyMFA(sessionId, mfaCode) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.mfaChallenge) {
            throw new Error('MFA not initiated');
        }
        
        const challenge = session.mfaChallenge;
        
        if (challenge.expiresAt < Date.now()) {
            delete session.mfaChallenge;
            throw new Error('MFA challenge expired');
        }
        
        if (challenge.attempts >= challenge.maxAttempts) {
            delete session.mfaChallenge;
            this.destroySession(sessionId);
            throw new Error('Too many MFA attempts');
        }
        
        // Verify MFA code (simplified - in production, use proper TOTP verification)
        const isValid = this.verifyTOTPCode(challenge.token, mfaCode);
        
        if (!isValid) {
            challenge.attempts++;
            this.logAuditEvent('mfa_failed', {
                sessionId: sessionId,
                userId: session.userId,
                attempt: challenge.attempts
            });
            throw new Error('Invalid MFA code');
        }
        
        // Mark MFA as verified
        session.mfaVerified = true;
        delete session.mfaChallenge;
        
        this.logAuditEvent('mfa_verified', {
            sessionId: sessionId,
            userId: session.userId
        });
        
        return { mfaVerified: true };
    }

    // Role-Based Access Control (RBAC)
    checkPermission(sessionId, resource, action) {
        if (!this.config.enableRBAC) {
            return { allowed: true };
        }
        
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Invalid session');
        }
        
        // Check if user has required permission
        const hasPermission = this.userHasPermission(session, resource, action);
        
        this.logAuditEvent('permission_checked', {
            sessionId: sessionId,
            userId: session.userId,
            resource: resource,
            action: action,
            allowed: hasPermission
        });
        
        return {
            allowed: hasPermission,
            reason: hasPermission ? 'Permission granted' : 'Insufficient permissions'
        };
    }

    userHasPermission(session, resource, action) {
        // Check direct permissions
        if (session.permissions && session.permissions.length > 0) {
            const directPermission = `${resource}:${action}`;
            if (session.permissions.includes(directPermission)) {
                return true;
            }
        }
        
        // Check role-based permissions
        if (session.roles && session.roles.length > 0) {
            for (const role of session.roles) {
                const rolePermissions = this.getRolePermissions(role);
                const rolePermission = `${resource}:${action}`;
                if (rolePermissions.includes(rolePermission)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    getRolePermissions(role) {
        const rolePermissions = {
            'admin': ['*:*'], // All permissions
            'analyst': ['analytics:read', 'analytics:export', 'dashboard:read'],
            'viewer': ['dashboard:read', 'analytics:read'],
            'user': ['profile:read', 'profile:update']
        };
        
        return rolePermissions[role] || [];
    }

    // Password Policy
    validatePassword(password) {
        if (!this.config.enablePasswordPolicy) {
            return { valid: true };
        }
        
        const issues = [];
        
        if (password.length < this.config.passwordMinLength) {
            issues.push(`Password must be at least ${this.config.passwordMinLength} characters long`);
        }
        
        if (this.config.passwordRequireSpecialChars) {
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                issues.push('Password must contain at least one special character');
            }
        }
        
        if (!/[A-Z]/.test(password)) {
            issues.push('Password must contain at least one uppercase letter');
        }
        
        if (!/[a-z]/.test(password)) {
            issues.push('Password must contain at least one lowercase letter');
        }
        
        if (!/\d/.test(password)) {
            issues.push('Password must contain at least one number');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    // Utility Methods
    generateAuthCode() {
        return randomBytes(32).toString('hex');
    }

    generateAccessToken() {
        return randomBytes(32).toString('hex');
    }

    generateRefreshToken() {
        return randomBytes(32).toString('hex');
    }

    generateSessionId() {
        return randomBytes(16).toString('hex');
    }

    generateMFAToken() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    generateClientSecret(clientId) {
        return createHmac('sha256', clientId).update('predator-analytics-sso').digest('hex');
    }

    hashPassword(password) {
        return createHash('sha256').update(password).digest('hex');
    }

    signJWT(header, payload) {
        const data = `${header}.${payload}`;
        return createHmac('sha256', 'predator-jwt-secret').update(data).digest('base64url');
    }

    verifyTOTPCode(secret, code) {
        // Simplified TOTP verification (in production, use proper TOTP library)
        return code.length === 6 && /^\d{6}$/.test(code);
    }

    generateSAMLResponse(samlRequest) {
        // Simplified SAML response generation
        return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_${randomBytes(16).toString('hex')}" Version="2.0"><Assertion xmlns="urn:oasis:names:tc:SAML:2.0:assertion" ID="_${randomBytes(16).toString('hex')}" Version="2.0"><Subject><NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:email">user@predator.analytics</NameID></Subject></Assertion></samlp:Response>`).toString('base64');
    }

    parseSAMLAssertion(samlResponse) {
        // Simplified SAML assertion parsing
        try {
            const xml = Buffer.from(samlResponse, 'base64').toString();
            return {
                nameId: 'user@predator.analytics',
                attributes: {
                    email: 'user@predator.analytics',
                    name: 'System User',
                    groups: ['analysts', 'users']
                }
            };
        } catch (error) {
            return null;
        }
    }

    generateRelayState() {
        return randomBytes(16).toString('hex');
    }

    getClientIP() {
        // Simplified IP detection
        return '127.0.0.1';
    }

    getUserAgent() {
        // Simplified user agent detection
        return 'Predator Analytics SSO Client';
    }

    handleFailedLogin(username) {
        const user = this.users.get(username);
        
        if (!user) {
            return;
        }
        
        user.failedAttempts = (user.failedAttempts || 0) + 1;
        
        if (user.failedAttempts >= this.config.maxLoginAttempts) {
            user.lockedUntil = Date.now() + this.config.lockoutDuration;
            
            this.logAuditEvent('account_locked', {
                username: username,
                failedAttempts: user.failedAttempts
            });
        }
        
        this.logAuditEvent('login_failed', {
            username: username,
            failedAttempts: user.failedAttempts
        });
    }

    // Session Cleanup
    startSessionCleanup() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60000); // Every minute
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.expiresAt < now) {
                this.sessions.delete(sessionId);
                cleanedCount++;
                
                this.logAuditEvent('session_expired_cleanup', {
                    sessionId: sessionId,
                    userId: session.userId
                });
            }
        }
        
        // Clean up expired tokens
        for (const [token, tokenData] of this.tokens.entries()) {
            if (tokenData.expiresAt < now) {
                this.tokens.delete(token);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired sessions/tokens`);
        }
    }

    // Audit Logging
    startAuditLogging() {
        // Audit logging is handled by individual methods
    }

    logAuditEvent(event, data) {
        if (!this.config.enableAuditLogging) {
            return;
        }
        
        const auditEntry = {
            timestamp: Date.now(),
            event: event,
            data: data,
            sessionId: data.sessionId || null,
            userId: data.userId || null,
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent()
        };
        
        this.auditLogs.push(auditEntry);
        
        // Keep only recent audit logs
        if (this.auditLogs.length > 10000) {
            this.auditLogs = this.auditLogs.slice(-5000);
        }
        
        this.emit('auditEvent', auditEntry);
    }

    // Persistence
    saveSSOData() {
        try {
            const data = {
                users: Array.from(this.users.entries()),
                sessions: Array.from(this.sessions.entries()),
                tokens: Array.from(this.tokens.entries()),
                auditLogs: this.auditLogs.slice(-1000),
                config: this.config,
                timestamp: Date.now()
            };
            
            writeFileSync('./sso-data.json', JSON.stringify(data, null, 2));
            console.log('💾 SSO data saved to file');
        } catch (error) {
            console.error('Error saving SSO data:', error);
        }
    }

    loadSSOData() {
        try {
            if (existsSync('./sso-data.json')) {
                const data = JSON.parse(readFileSync('./sso-data.json', 'utf8'));
                
                this.users = new Map(data.users || []);
                this.sessions = new Map(data.sessions || []);
                this.tokens = new Map(data.tokens || []);
                this.auditLogs = data.auditLogs || [];
                
                console.log('📂 SSO data loaded from file');
            } else {
                // Create default admin user
                this.createDefaultUsers();
            }
        } catch (error) {
            console.error('Error loading SSO data:', error);
            this.createDefaultUsers();
        }
    }

    createDefaultUsers() {
        // Create default admin user
        const adminUser = {
            username: 'admin',
            email: 'admin@predator.analytics',
            password: this.hashPassword('admin123!@#'),
            roles: ['admin'],
            permissions: ['*:*'],
            provider: 'local',
            createdAt: Date.now(),
            failedAttempts: 0,
            lockedUntil: null
        };
        
        this.users.set('admin', adminUser);
        
        // Create demo user
        const demoUser = {
            username: 'demo',
            email: 'demo@predator.analytics',
            password: this.hashPassword('demo123!@#'),
            roles: ['analyst'],
            permissions: ['analytics:read', 'dashboard:read'],
            provider: 'local',
            createdAt: Date.now(),
            failedAttempts: 0,
            lockedUntil: null
        };
        
        this.users.set('demo', demoUser);
        
        console.log('👥 Created default users');
    }

    // Public API Methods
    getSSOStatus() {
        return {
            providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
                name: provider.name,
                type: provider.type,
                enabled: provider.enabled
            })),
            activeSessions: this.sessions.size,
            activeTokens: this.tokens.size,
            totalUsers: this.users.size,
            auditLogs: this.auditLogs.length,
            config: this.config
        };
    }

    getAuditLogs(limit = 100) {
        return this.auditLogs.slice(-limit);
    }

    getUserSessions(userId) {
        const userSessions = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                userSessions.push({
                    sessionId: sessionId,
                    provider: session.provider,
                    createdAt: session.createdAt,
                    lastActivity: session.lastActivity,
                    expiresAt: session.expiresAt,
                    mfaVerified: session.mfaVerified
                });
            }
        }
        
        return userSessions;
    }

    updateUserRoles(userId, roles) {
        const user = this.users.get(userId);
        
        if (!user) {
            throw new Error('User not found');
        }
        
        user.roles = roles;
        
        this.logAuditEvent('user_roles_updated', {
            userId: userId,
            roles: roles
        });
        
        return true;
    }

    revokeAllUserSessions(userId) {
        let revokedCount = 0;
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.userId === userId) {
                this.sessions.delete(sessionId);
                revokedCount++;
                
                this.logAuditEvent('session_revoked', {
                    sessionId: sessionId,
                    userId: userId
                });
            }
        }
        
        return revokedCount;
    }

    shutdown() {
        console.log('🔄 Shutting down Enterprise SSO System...');
        
        // Save SSO data
        this.saveSSOData();
        
        // Destroy all sessions
        for (const sessionId of this.sessions.keys()) {
            this.destroySession(sessionId);
        }
        
        console.log('✅ Enterprise SSO System shutdown complete');
    }
}

// Run SSO system if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const sso = new EnterpriseSSOSystem();
    
    // Demo authentication flow
    console.log('🔐 Demo SSO Authentication Flow:');
    
    try {
        // OAuth2 flow
        console.log('\n1. Initiating OAuth2 flow...');
        const oauth2Flow = sso.initiateOAuth2Flow('demo-client', 'http://localhost:3000/callback', 'openid profile email', 'random-state');
        console.log('OAuth2 Auth URL:', oauth2Flow.authUrl);
        
        // Exchange code for token
        console.log('\n2. Exchanging code for token...');
        const tokenData = sso.exchangeCodeForToken(oauth2Flow.code, 'demo-client', sso.generateClientSecret('demo-client'));
        console.log('Access Token:', tokenData.accessToken.substring(0, 20) + '...');
        
        // JWT token
        console.log('\n3. Generating JWT token...');
        const jwtToken = sso.generateJWTToken({ sub: 'demo', name: 'Demo User', roles: ['analyst'] });
        console.log('JWT Token:', jwtToken.substring(0, 50) + '...');
        
        // Verify JWT
        console.log('\n4. Verifying JWT token...');
        const payload = sso.verifyJWTToken(jwtToken);
        console.log('JWT Payload:', payload);
        
        // LDAP authentication
        console.log('\n5. LDAP authentication...');
        const session = sso.authenticateLDAP('demo', 'demo123!@#');
        console.log('Session created:', session.id.substring(0, 10) + '...');
        
        // MFA
        console.log('\n6. Initiating MFA...');
        const mfaChallenge = sso.initiateMFA(session.id);
        console.log('MFA Required:', mfaChallenge.mfaRequired);
        
        if (mfaChallenge.mfaRequired) {
            console.log('MFA Token:', mfaChallenge.mfaToken);
            
            // Verify MFA (using the token as code for demo)
            const mfaResult = sso.verifyMFA(session.id, mfaChallenge.mfaToken);
            console.log('MFA Verified:', mfaResult.mfaVerified);
        }
        
        // Check permissions
        console.log('\n7. Checking permissions...');
        const permission = sso.checkPermission(session.id, 'analytics', 'read');
        console.log('Permission:', permission);
        
        // Display status
        console.log('\n🔐 SSO System Status:');
        const status = sso.getSSOStatus();
        console.log('Active Sessions:', status.activeSessions);
        console.log('Active Tokens:', status.activeTokens);
        console.log('Total Users:', status.totalUsers);
        console.log('Audit Logs:', status.auditLogs);
        
    } catch (error) {
        console.error('Demo error:', error.message);
    }
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        sso.shutdown();
        process.exit(0);
    });
    
    console.log('\n🎊 Enterprise SSO System started!');
    console.log('🔐 Multi-provider authentication ready...');
}

export default EnterpriseSSOSystem;
