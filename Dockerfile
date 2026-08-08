# syntax=docker/dockerfile:1
# sitecoder — UI layer (Next.js standalone chat)
# Role: public chat UI for Zerops appdev / local docker

ARG VERSION=dev
ARG REVISION=local

FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# ---- deps: lockfile-cached install + prisma client ----
FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --ignore-scripts \
    && pnpm prisma generate

# ---- builder: compile Next standalone ----
FROM deps AS builder

# NEXT_PUBLIC_* must be present at build time for the client bundle
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chats
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/access
ARG NEXT_PUBLIC_POLAR_PRODUCT_ID=cff6aec9-5a46-44bc-a62e-f021a3fb5567
ARG NEXT_PUBLIC_SITE_URL=https://appdev-28a4-3000.prg1.zerops.app

ENV NODE_ENV=production \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL \
    NEXT_PUBLIC_POLAR_PRODUCT_ID=$NEXT_PUBLIC_POLAR_PRODUCT_ID \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY . .

RUN pnpm next build

# ---- runner: slim production image ----
FROM node:20-slim AS runner

ARG VERSION=dev
ARG REVISION=local

LABEL org.opencontainers.image.title="sitecoder" \
      org.opencontainers.image.description="Sitecoder chat UI — Next.js standalone" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.source="https://github.com/DamilolaAlao/sitecoder-main" \
      com.sitecoder.service="ui" \
      com.sitecoder.version="${VERSION}"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    HOME=/home/nextjs

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/false --create-home nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node --eval "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/login',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
