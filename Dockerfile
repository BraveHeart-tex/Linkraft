FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Git (and clean up to reduce image size)
RUN apt-get update && \
    apt-get install -y git && \
    rm -rf /var/lib/apt/lists/*

# Copy package manifests
COPY package.json pnpm-lock.yaml ./

# Use bash shell
SHELL ["/bin/bash", "-c"]

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline && pnpm store prune

# Copy the rest of the app
COPY . .

# Expose app port
EXPOSE 3000

# Run dev script
CMD ["pnpm", "run", "start:dev"]