# Production Dockerfile for Medical Clinic Backend
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 (native C++ compilation)
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies including build tools
RUN npm ci

# Copy application source
COPY . .

# Prune dev dependencies for lean production container
RUN npm prune --production

# Final minimal runtime image
FROM node:20-alpine

# Install sqlite runtime
RUN apk add --no-cache sqlite-libs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=8080 \
    DATABASE_PATH=/app/data/medical.db \
    UPLOAD_PATH=/app/uploads

# Copy built application and node_modules from builder
COPY --from=builder /app /app

# Create necessary directories
RUN mkdir -p /app/data /app/uploads /app/logs

# Expose backend port
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

# Start server
CMD ["node", "src/server.js"]
