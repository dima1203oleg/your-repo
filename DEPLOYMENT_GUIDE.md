# 🚀 PREDATOR ANALYTICS DEPLOYMENT GUIDE

## 📋 Overview

This guide provides comprehensive instructions for deploying Predator Analytics with real Ukrainian government data integration.

---

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Proxy Server   │    │  Real Backend   │
│   (Port 3003)   │◄──►│   (Port 3003)    │◄──►│   (Port 8001)   │
│                 │    │                  │    │                 │
│ React + Vite    │    │ Express + Cache  │    │ Node.js + APIs  │
│ Real Data Mode  │    │ + Error Handling  │    │ + Monitoring    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Monitoring       │
                       │ (Port 3004)      │
                       │ Health Dashboard │
                       └──────────────────┘
```

---

## 📦 Prerequisites

### **System Requirements**
- **Node.js**: >= 18.0.0 (recommended: 20.x)
- **Memory**: Minimum 512MB, Recommended 2GB+
- **Storage**: Minimum 1GB free space
- **Network**: Internet connection for Ukrainian APIs

### **Required Software**
```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify installation
node --version
npm --version
```

---

## 🔧 Development Setup

### **1. Clone Repository**
```bash
git clone <repository-url>
cd predator-analytics-v18.4.6
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Environment Configuration**
```bash
# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```env
NODE_ENV=development
PORT=3003
BACKEND_PORT=8001
MONITORING_PORT=3004

# Optional (for enhanced features)
API_KEY=your_gemini_api_key
LOG_LEVEL=info
CACHE_TTL=30000
```

### **4. Start Development Servers**
```bash
# Start all services in parallel
npm run dev:local

# Or start individually:
# Terminal 1 - Backend
npm run start:mock

# Terminal 2 - Proxy
node simple-proxy.js

# Terminal 3 - Monitoring
node monitoring-dashboard.js

# Terminal 4 - Frontend (if using Vite dev server)
npm run dev
```

### **5. Verify Setup**
```bash
# Test all services
curl http://localhost:8001/health
curl http://127.0.0.1:3003/health
curl http://localhost:3004/health

# Run automated tests
node auto-system-test.js

# Check production readiness
NODE_ENV=production node production-ready.js
```

---

## 🏭 Production Deployment

### **Option 1: Direct Node.js Deployment**

#### **1. Build Frontend**
```bash
# Build for production
npm run build

# Verify build output
ls -la dist/
```

#### **2. Configure Production Environment**
```bash
# Create production environment file
cp .env.example .env.production

# Production configuration
nano .env.production
```

**Production Environment Variables:**
```env
NODE_ENV=production
PORT=3003
BACKEND_PORT=8001
MONITORING_PORT=3004

# Security
HTTPS=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Performance
CACHE_TTL=300000
MAX_CONNECTIONS=1000

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/predator-analytics.log
```

#### **3. Update Package Scripts**
Add to `package.json`:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node simple-proxy.js",
    "start:backend": "NODE_ENV=production node real-backend/server.js",
    "start:monitoring": "NODE_ENV=production node monitoring-dashboard.js",
    "start:all": "concurrently \"npm run start:backend\" \"npm run start\" \"npm run start:monitoring\"",
    "deploy": "npm run build && npm run start:all"
  }
}
```

#### **4. Deploy with PM2 (Recommended)**
```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'predator-backend',
      script: 'real-backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log'
    },
    {
      name: 'predator-proxy',
      script: 'simple-proxy.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/proxy-error.log',
      out_file: './logs/proxy-out.log',
      log_file: './logs/proxy-combined.log'
    },
    {
      name: 'predator-monitoring',
      script: 'monitoring-dashboard.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: './logs/monitoring-error.log',
      out_file: './logs/monitoring-out.log',
      log_file: './logs/monitoring-combined.log'
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### **5. Setup Reverse Proxy (Nginx)**
```bash
# Install Nginx
sudo apt update && sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/predator-analytics
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Frontend
    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Routes
    location /api/ {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health Check
    location /health {
        proxy_pass http://localhost:3003/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/predator-analytics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### **Option 2: Docker Deployment**

#### **1. Create Dockerfile**
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

EXPOSE 3003 8001 3004

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "simple-proxy.js"]
```

#### **2. Create Docker Compose**
```yaml
version: '3.8'

services:
  predator-backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: predator-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=8001
    ports:
      - "8001:8001"
    volumes:
      - ./logs:/app/logs
    command: ["node", "real-backend/server.js"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  predator-proxy:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: predator-proxy
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3003
    ports:
      - "3003:3003"
    volumes:
      - ./logs:/app/logs
      - ./dist:/app/dist
    depends_on:
      - predator-backend
    command: ["node", "simple-proxy.js"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  predator-monitoring:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: predator-monitoring
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3004
    ports:
      - "3004:3004"
    volumes:
      - ./logs:/app/logs
    depends_on:
      - predator-backend
    command: ["node", "monitoring-dashboard.js"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3004/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: predator-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - predator-proxy
```

#### **3. Deploy with Docker**
```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Scale if needed
docker-compose up -d --scale predator-backend=2

# Update deployment
docker-compose pull
docker-compose up -d
```

---

## 🔒 Security Configuration

### **1. Environment Security**
```bash
# Set proper file permissions
chmod 600 .env*
chmod 700 logs/

# Use environment-specific configs
cp .env.production .env.local
```

### **2. SSL/TLS Setup**
```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **3. Firewall Configuration**
```bash
# Configure UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## 📊 Monitoring & Maintenance

### **1. Health Monitoring**
```bash
# Check all services
curl http://localhost:8001/health
curl http://127.0.0.1:3003/health
curl http://localhost:3004/health

# Run system tests
node auto-system-test.js

# Monitor PM2 processes
pm2 status
pm2 logs
pm2 monit
```

### **2. Log Management**
```bash
# View logs
tail -f logs/backend-combined.log
tail -f logs/proxy-combined.log

# Log rotation (add to crontab)
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/predator-analytics
```

### **3. Performance Monitoring**
```bash
# System metrics
node production-ready.js

# API performance
curl -w "%{time_total}\n" http://localhost:8001/api/v1/connectors -o /dev/null

# Memory usage
pm2 show predator-backend
```

---

## 🔄 Updates & Maintenance

### **1. Application Updates**
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Rebuild
npm run build

# Restart services
pm2 restart all
```

### **2. Zero-Downtime Deployment**
```bash
# Using PM2 reload
pm2 reload all

# Or rolling restart
pm2 reload predator-backend
pm2 reload predator-proxy
pm2 reload predator-monitoring
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check port usage
lsof -i :3003
lsof -i :8001
lsof -i :3004

# Kill processes
sudo kill -9 <PID>
```

#### **2. API Connection Issues**
```bash
# Test backend directly
curl http://localhost:8001/api/v1/connectors

# Test through proxy
curl http://127.0.0.1:3003/api/v1/connectors

# Check logs
pm2 logs predator-backend --lines 50
```

#### **3. Memory Issues**
```bash
# Check memory usage
pm2 monit

# Restart if needed
pm2 restart predator-backend

# Adjust memory limits in ecosystem.config.js
```

#### **4. SSL Issues**
```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443

# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -dates
```

---

## 📈 Performance Optimization

### **1. Caching**
- Proxy cache: 30s TTL (adjustable)
- Backend metrics cache: 5s TTL
- Static file caching via Nginx

### **2. Load Balancing**
```nginx
upstream predator_backend {
    server localhost:8001;
    # Add more instances for scaling
}

upstream predator_proxy {
    server localhost:3003;
    # Add more instances for scaling
}
```

### **3. Database Optimization**
- Use connection pooling
- Implement query caching
- Monitor slow queries

---

## 🔧 Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3003 | Proxy server port |
| `BACKEND_PORT` | 8001 | Backend server port |
| `MONITORING_PORT` | 3004 | Monitoring port |
| `CACHE_TTL` | 30000 | Cache TTL in ms |
| `LOG_LEVEL` | info | Logging level |
| `MAX_CONNECTIONS` | 1000 | Max concurrent connections |
| `API_KEY` | - | Gemini API key |
| `HTTPS` | false | Enable HTTPS |
| `SSL_CERT_PATH` | - | SSL certificate path |
| `SSL_KEY_PATH` | - | SSL private key path |

---

## 📞 Support & Contact

### **Health Check URLs**
- **Main Application**: `https://your-domain.com/`
- **API Health**: `https://your-domain.com/health`
- **Monitoring**: `https://your-domain.com:3004/`

### **Emergency Commands**
```bash
# Stop all services
pm2 stop all

# Restart all services
pm2 restart all

# Check system status
node auto-system-test.js

# Production readiness check
NODE_ENV=production node production-ready.js
```

---

## 🎯 Deployment Checklist

### **Pre-Deployment**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Dependencies updated
- [ ] Frontend built for production
- [ ] Database migrations run (if applicable)

### **Deployment**
- [ ] Services started successfully
- [ ] Health checks passing
- [ ] Load balancer configured
- [ ] Monitoring active
- [ ] Logs being collected

### **Post-Deployment**
- [ ] Performance tests pass
- [ ] Security scans pass
- [ ] Backup procedures verified
- [ ] Monitoring alerts configured
- [ ] Documentation updated

---

## 🎊 Conclusion

This deployment guide provides everything needed to successfully deploy Predator Analytics in production. The system is designed with:

- **High Availability**: Multiple services with health checks
- **Security**: HTTPS, CORS, environment variables
- **Performance**: Caching, load balancing, monitoring
- **Scalability**: Docker, PM2 clustering support
- **Maintainability**: Comprehensive logging and monitoring

For additional support or questions, refer to the system documentation or contact the development team.

---

*Last Updated: December 2025*  
*Version: 1.0*  
*Status: Production Ready*
