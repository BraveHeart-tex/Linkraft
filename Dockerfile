FROM node:20-slim

WORKDIR /usr/src/app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

SHELL ["/bin/bash", "-c"]

RUN pnpm install --frozen-lockfile --prefer-offline && pnpm store prune

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]
