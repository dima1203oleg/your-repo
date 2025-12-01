
# Docker Security Configuration
# Add these security improvements to your Dockerfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set proper permissions
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Remove unnecessary packages
RUN apk del --purge \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set secure file permissions
RUN chmod 600 /app/.env* \
    && chmod 755 /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Security labels
LABEL security.scan.enabled="true" \
      security.policy="strict" \
      maintainer="security-team@predator-analytics.com"
