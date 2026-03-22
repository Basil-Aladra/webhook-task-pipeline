# API image for the monorepo.
FROM node:20-alpine

# Use repository root to install workspace dependencies.
WORKDIR /app

# Copy dependency manifests first for better Docker cache usage.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json

# Install dependencies for all copied workspaces.
RUN npm install --ignore-scripts

# Copy source files after dependency installation.
COPY . .

# Build the API package.
RUN npm run build -w @webhook-pipeline/api

# Run API from its workspace directory.
WORKDIR /app/apps/api

# Expose HTTP port.
EXPOSE 3000

# Start compiled API server.
CMD ["node", "dist/main.js"]
