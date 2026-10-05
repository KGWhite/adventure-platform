FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.8.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/api ./apps/api

WORKDIR /app/apps/api

RUN pnpm prisma generate
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start:migrate:prod"]
