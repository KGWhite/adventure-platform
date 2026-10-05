# Getting Started

This guide describes how to run and develop the Adventure Platform locally.

## Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **Node.js**: v22+ LTS (tested with Node v22 and v24 LTS; aligned with Docker images and root `package.json` engines)
- **pnpm**: v12.8.1 (pinned in root `package.json` `packageManager` and Dockerfiles)
- **PostgreSQL**: 16 (pinned via `postgres:16-alpine` in `compose.yaml`)

> For full version selection and dependency management guidelines, see [Dependency and Version Policy](file:///home/abUC/adventure-platform/docs/development/dependency-policy.md).

## Quickstart (Integrated Docker Compose Stack)

The fastest and primary way to run the entire integrated stack is Docker Compose with Nginx acting as the single HTTPS entry point.

### 1. Setup Environment Variables
```bash
cp .env.example .env
```

### 2. Generate Development TLS Certificate
Generate a local self-signed certificate for HTTPS before launching the stack:
```bash
# For localhost testing:
./infrastructure/nginx/generate-cert.sh

# Or for local network (LAN) testing from mobile devices:
./infrastructure/nginx/generate-cert.sh 192.168.1.100
```
> Alternatively, you can run the underlying OpenSSL command directly:
> ```bash
> openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
>   -keyout infrastructure/nginx/certs/server.key \
>   -out infrastructure/nginx/certs/server.crt \
>   -subj "/CN=localhost" \
>   -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
> ```

### 3. Start the Complete Stack
```bash
docker compose up --build
```

When starting, Docker Compose will launch four services:
1. `postgres`: PostgreSQL 16 database with health check.
2. `api`: NestJS modular monolith (automatically executes Prisma migrations and seeds default test data).
3. `web`: React Vite PWA frontend build served internally.
4. `nginx`: Reverse proxy gateway terminating TLS and routing requests:
   - `https://<host>/` ──► `http://web:5173`
   - `https://<host>/api/` ──► `http://api:3000`

### 4. Verify Running Services via HTTPS
- Web application (PWA): [https://localhost](https://localhost) (redirects to `/login`)
- Health check: [https://localhost/api/v1/health](https://localhost/api/v1/health) (returns `{"status":"ok"}`)
- PostgreSQL (database port for dev tools): `localhost:5432`

> **Note on Browser Certificate Warning**: Because the certificate is self-signed for local development, browsers will display a security warning. Click **Advanced** ──► **Proceed to localhost (unsafe)** to open the application.

## Mobile Device & Local Network Testing
To test the PWA from a mobile device or other computer on the same Wi-Fi/LAN:
1. Determine your computer's local IP address (e.g. `192.168.1.100`).
2. Generate the certificate including your LAN IP:
   ```bash
   ./infrastructure/nginx/generate-cert.sh 192.168.1.100
   ```
3. Restart or start the stack:
   ```bash
   docker compose up -d
   ```
4. On your mobile browser, open `https://192.168.1.100`.
5. Accept the browser's certificate warning to enter the secure context.
6. Verify that the **Web App Manifest** loads and the **Service Worker** registers without mixed-content errors.

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
When developing directly at the source level (`pnpm dev:api`), endpoints are reachable directly on `http://localhost:3000`:
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

> In the integrated Docker Compose environment, replace `http://localhost:3000` with `https://localhost` (add `-k` for self-signed certificate, e.g. `curl -k https://localhost/api/v1/auth/me -H "Authorization: Bearer $USER_TOKEN"`).
