FROM node:20-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src
COPY public ./public
COPY README.md ./README.md

RUN mkdir -p /app/data/projects /app/data/uploads /app/data/exports

EXPOSE 3000
CMD ["node", "src/server.js"]
