# syntax=docker/dockerfile:1
#
# Production image for any container host (Fly.io, Railway, Render, Cloud Run,
# a plain VPS). Vercel does not use this — it builds from the repository.
#
# Multi-stage so the runtime image contains the compiled app and nothing else:
# no source, no dev dependencies, no package manager cache. Built from Next's
# `output: "standalone"` bundle, which traces the exact node_modules the server
# touches — roughly 200 MB instead of 1 GB.

# ---------------------------------------------------------------------------
# 1. Dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma's engines are glibc-linked; on Alpine they need the compatibility shim.
RUN apk add --no-cache libc6-compat

# Copy only the manifests first so this layer is cached until they change.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# `npm ci` runs the postinstall hook, which generates the Prisma client.
RUN npm ci

# ---------------------------------------------------------------------------
# 2. Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time only. NEXT_PUBLIC_* values are inlined into the client bundle here,
# so the public origin has to be known now — pass it with:
#   docker build --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com .
# Everything that matters at runtime (APP_URL, DATABASE_URL, AUTH_SECRET…) is
# read from the environment when the container starts, not baked in.
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Switches next.config.ts to `output: "standalone"`. Opt-in because standalone
# is incompatible with `next start`, which is what `npm start` runs.
ENV BUILD_STANDALONE=1

# `next build` does not connect to the database, but Prisma's client needs the
# datasource variables to exist. A placeholder is enough and never used.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
# Likewise: env validation runs at boot, not at build.
ENV AUTH_SECRET="build-time-placeholder-not-used-at-runtime"

RUN npm run build

# ---------------------------------------------------------------------------
# 3. Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Never run the server as root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# public/ first so the uploads directory exists and is owned by the app user.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
RUN mkdir -p ./public/uploads && chown nextjs:nodejs ./public/uploads

# The standalone server, plus the static assets it expects to find beside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrations and the Prisma CLI, so the container can run `db:deploy` itself.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

USER nextjs
EXPOSE 3000

# Hits the readiness endpoint, which checks the database too.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
