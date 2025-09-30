# Multi-stage build for better optimization and memory management
FROM node:18-alpine as deps

# Install system dependencies needed for native modules and build tools
RUN apk add --no-cache --update \
    python3 \
    make \
    g++ \
    git \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files first for better layer caching
COPY gbp-main/package*.json ./

# Install dependencies with memory optimization and exclude devDependencies
RUN npm cache clean --force \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && NODE_OPTIONS="--max_old_space_size=4096" npm ci --omit=dev --no-audit --prefer-offline \
    && rm -rf /root/.npm/_cacache

# Build stage with memory optimization
FROM node:18-alpine as build

# Install only essential build dependencies
RUN apk add --no-cache --update \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files and installed dependencies from deps stage
COPY gbp-main/package*.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY gbp-main/ .

# Clean npm cache and install any missing dependencies
RUN npm cache clean --force \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --no-audit --prefer-offline

# Build with optimized memory settings and disable sourcemaps
RUN NODE_OPTIONS="--max_old_space_size=12288" npm run build:optimized

# Production stage - minimal runtime
FROM nginx:stable-alpine

# Remove default nginx config and copy custom one
RUN rm -f /etc/nginx/conf.d/default.conf
COPY gbp-main/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set permissions efficiently
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /var/run /etc/nginx && \
    chmod -R 755 /usr/share/nginx/html /var/cache/nginx /var/log/nginx /var/run /etc/nginx

# Clean up unnecessary files
RUN rm -rf /var/cache/apk/* /tmp/*

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
