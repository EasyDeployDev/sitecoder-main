FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm prisma generate && pnpm next build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]
