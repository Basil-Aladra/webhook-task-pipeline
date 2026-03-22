# Worker image for the monorepo.
FROM node:20-alpine

# Use repository root to install workspace dependencies.
WORKDIR /app

# Copy dependency manifests first for better Docker cache usage.
COPY package.json package-lock.json ./
COPY apps/worker/package.json apps/worker/package.json

# Install dependencies for all copied workspaces.
RUN npm install --ignore-scripts

# Copy source files after dependency installation.
COPY . .

# Build the worker package.
RUN npm run build -w @webhook-pipeline/worker

# Run worker from its workspace directory.
WORKDIR /app/apps/worker

# Start compiled worker service.
CMD ["node", "dist/main.js"]
