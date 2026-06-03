FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN corepack enable \
  && corepack prepare pnpm@10.24.0 --activate \
  && pnpm install --prod --frozen-lockfile

COPY src ./src
COPY public ./public
COPY README.md ./README.md

RUN mkdir -p /app/data/projects /app/data/uploads /app/data/exports

EXPOSE 3000
CMD ["node", "src/server.js"]
