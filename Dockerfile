FROM node:20

WORKDIR /usr/src/app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

SHELL ["/bin/bash", "-c"]

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]
