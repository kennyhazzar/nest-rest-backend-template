FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/apps/backend/scripts ./apps/backend/scripts
COPY --from=build --chown=node:node /app/drizzle ./drizzle
RUN mkdir -p /app/upload /app/logs && chown node:node /app/upload /app/logs

EXPOSE 3000

USER node

CMD ["sh", "-c", "node apps/backend/scripts/migrate.cjs && node dist/apps/backend/main.js"]
