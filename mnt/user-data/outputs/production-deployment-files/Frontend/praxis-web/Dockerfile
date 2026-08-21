# syntax=docker/dockerfile:1

# ---- deps: install full dependency tree once, cached across builds -------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the Next.js production build ---------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* variables are inlined into the client JS bundle at build
# time, not read from the environment at container start — this is a
# Next.js constraint, not a choice made here. That means the API's public
# base URL must be known at image-build time, via a build ARG, and a
# separate image has to be built per environment if that URL differs
# between staging and production (see docker-compose.yml's `build.args` and
# DEPLOYMENT.md for the concrete implication: this image is NOT
# "build once, deploy anywhere" the way the backend's image is).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

# ---- runtime: minimal final image, non-root user, standalone server -------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /bin/false --create-home nextjs

# `output: 'standalone'` (next.config.ts) traces and copies only the files
# each page actually needs, plus a minimal `node_modules` subset and a
# self-contained `server.js` — this is what makes the runtime image small
# and avoids shipping devDependencies or the full dependency tree.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
