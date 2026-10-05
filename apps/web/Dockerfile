FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@12.8.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN pnpm install --frozen-lockfile

COPY apps/web ./apps/web

WORKDIR /app/apps/web

RUN pnpm build

EXPOSE 5173

CMD ["pnpm", "preview"]
