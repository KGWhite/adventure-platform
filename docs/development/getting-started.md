# Getting Started

This guide describes how to run and develop the Adventure Platform locally.

## Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **Node.js**: v22+ LTS (tested with Node v22 and v24 LTS; aligned with Docker images and root `package.json` engines)
- **pnpm**: v12.8.1 (pinned in root `package.json` `packageManager` and Dockerfiles)
- **PostgreSQL**: 16 (pinned via `postgres:16-alpine` in `compose.yaml`)

> For full version selection and dependency management guidelines, see [Dependency and Version Policy](file:///home/abUC/adventure-platform/docs/development/dependency-policy.md).

## Quickstart (Integrated Docker Compose Stack)

The fastest and primary way to run the entire integrated stack is Docker Compose.

1. **Clone and setup environment variables**:
   ```bash
   cp .env.example .env
   ```

2. **Start the complete stack**:
   ```bash
   docker compose up --build
   ```

   When starting, Docker Compose will:
   - Start and verify healthy `postgres`
   - Automatically run Prisma migrations (`prisma migrate deploy`) and seed default ranks & test data (`prisma db seed`)
   - Start the NestJS API on `http://localhost:3000`
   - Start the React PWA frontend on `http://localhost:5173`

3. **Verify running services**:
   - Web application: [http://localhost:5173](http://localhost:5173) (redirects to `/login`)
   - API application: [http://localhost:3000](http://localhost:3000)
   - Health check: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health) (returns `{"status":"ok"}`)
   - PostgreSQL: `localhost:5432`

## Local Source-Level Development

For active feature coding without container rebuilds:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start PostgreSQL via Docker Compose
```bash
docker compose up -d postgres
```

### 3. Database Migrations and Seed
```bash
# Generate Prisma Client
pnpm prisma:generate

# Apply migrations
pnpm --filter @adventure-platform/api db:migrate

# Seed ranks and development accounts
pnpm --filter @adventure-platform/api db:seed
```

#### Development Seed Accounts & Skeleton Data (strictly for dev testing):
- **Admin**: `username: admin`, `password: admin123` (Role: `ADMIN`)
- **Adventurer User**: `username: adventurer`, `password: adventurer123` (Role: `USER`)
- **Adventurer Profile**: `displayName: Rookie Adventurer`, `rank: Rank F`
- **Sample Credentials**: `ADV-DEV-001-QR` (QRCODE), `ADV-DEV-001-NFC` (NFC)
- **Starter Quest**: `First Steps in the Guild` (Rank F, 50 merit reward)
- **Reward Skeleton**: `Guild Welcome Badge` (type: `virtual_item`)

### 4. Run Development Servers
You can run services individually using pnpm workspace filtering:

- **Start API service in watch mode**:
  ```bash
  pnpm dev:api
  # or
  pnpm --filter @adventure-platform/api start:dev
  ```

- **Start Web service in watch mode**:
  ```bash
  pnpm dev:web
  # or
  pnpm --filter @adventure-platform/web dev
  ```

### 5. Running Tests
- **API Tests**:
  ```bash
  pnpm test
  # or
  pnpm --filter @adventure-platform/api test
  ```

### 6. Building Packages
- **Build all packages**:
  ```bash
  pnpm build
  ```
- **Build individual packages**:
  ```bash
  pnpm --filter @adventure-platform/api build
  pnpm --filter @adventure-platform/web build
  ```

### 7. Exploring Authentication & Protected API Endpoints
```bash
# 1. Login as Adventurer (USER)
USER_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"adventurer","password":"adventurer123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. Get Current Adventurer Profile
curl http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $USER_TOKEN"

# 3. Verify USER cannot access Admin Protected API (Returns 403 Forbidden)
curl -i http://localhost:3000/api/v1/admin/summary -H "Authorization: Bearer $USER_TOKEN"

# 4. Login as Administrator (ADMIN)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 5. Access Admin Protected API as ADMIN (Returns 200 OK with metrics)
curl http://localhost:3000/api/v1/admin/summary -H "Authorization: Bearer $ADMIN_TOKEN"
```
