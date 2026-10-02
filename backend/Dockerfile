# Fluentis API — NestJS production image.
# Build from backend/: docker build -t fluentis-api .

FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
# OpenSSL 3 must be present before `prisma generate`, or the client is built
# for OpenSSL 1.1 and the Bookworm runtime refuses to start.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev \
  && npm install --no-save --omit=dev prisma@6.16.2

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
# System Chromium renders certificate PDFs. The app already launches with --no-sandbox.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /app/storage/attachments \
  && chown node:node /app/storage /app/storage/attachments

USER node
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
