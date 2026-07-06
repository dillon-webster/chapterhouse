# syntax=docker/dockerfile:1

# ---- base ----------------------------------------------------------------
FROM node:24-alpine AS base
WORKDIR /app
# openssl + libc6-compat are needed by Prisma's schema engine on Alpine.
RUN apk add --no-cache libc6-compat openssl

# ---- dependencies --------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ---------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- runtime -------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Full node_modules are kept so `prisma migrate deploy` can run on startup.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

# Generates AUTH_SECRET if unset, applies pending migrations, starts the server.
CMD ["./docker-entrypoint.sh"]
