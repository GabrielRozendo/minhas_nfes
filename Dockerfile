FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY gerador-nfse-nacional-bun ./gerador-nfse-nacional-bun
RUN npm ci && npm rebuild better-sqlite3

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/gerador-nfse-nacional-bun ./gerador-nfse-nacional-bun
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Garante dist do submodule (caso o checkout não traga build)
RUN cd gerador-nfse-nacional-bun \
  && npm install --ignore-scripts \
  && npx tsup \
  && npx tsc -p tsconfig.build.json \
  && cd .. \
  && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DATABASE_PATH=/data/nfse.db
ENV CERT_PATH=/certs/certificado.pfx
ENV FILES_PATH=/files
# Chromium do sistema para Puppeteer no container
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /data /certs /files/xml /files/pdf \
  && chown -R nextjs:nodejs /data /files

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/gerador-nfse-nacional-bun ./gerador-nfse-nacional-bun
COPY --from=builder /app/node_modules/nfse-nacional ./node_modules/nfse-nacional
COPY --from=builder /app/node_modules/puppeteer ./node_modules/puppeteer
COPY --from=builder /app/node_modules/puppeteer-core ./node_modules/puppeteer-core

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
