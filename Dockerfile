# Multi-stage build for Predator Analytics
# Optimized for production deployment

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Run frontend optimization
RUN node frontend-optimizer.js

# Production stage
FROM node:20-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built frontend from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy application files
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown nodejs:nodejs logs

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3003
ENV BACKEND_PORT=8001
ENV MONITORING_PORT=3004

# Expose ports
EXPOSE 3003 8001 3004

# Health checks
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command starts the proxy server
CMD ["node", "simple-proxy.js"]
