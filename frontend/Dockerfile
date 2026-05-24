# Frontend — Next.js 16 dashboard (standalone output)
FROM node:22-alpine AS deps
WORKDIR /app
# No lockfile committed, so use `npm install` (not `npm ci`).
COPY package.json ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# BACKEND_URL is read by next.config.ts at server start; set it as a runtime
# env var on the frontend service so /api/* proxies to the backend.
CMD ["node", "server.js"]
