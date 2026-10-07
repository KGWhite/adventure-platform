# System Architecture

## Overview

The Adventure Platform (`adventure-platform`) is an extensible adventure platform designed for interactive physical and digital quests. The initial domain theme is the **Adventurer Guild**:
- **Adventurer** (`USER`): Participants who accept quests, gain Guild Merit, and advance through ranks.
- **Guild Administrator** (`ADMIN`): Organizers who manage credentials, quests, ranks, promotions, and rewards.

## MVP Technology Stack

The platform is designed as a **Modular Monolith** prioritizing simplicity, developer productivity, and local reproducibility.

```text
┌────────────────────────────────────────────────────────┐
│                      Web Browser                       │
│        (Mobile / Desktop / PWA Standalone Mode)        │
│          /login  ──►  /user (USER) | /admin (ADMIN)    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Port 443, TLS)
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Nginx Reverse Proxy                   │
│               (infrastructure/nginx)                   │
│   ├── /api/  ──►  http://api:3000 (NestJS API)         │
│   └── /      ──►  http://web:5173 (React PWA)          │
└──────────────┬─────────────────────────┬───────────────┘
               │                         │
               ▼                         ▼
┌────────────────────────────┐ ┌─────────────────────────┐
│         React Web          │ │       NestJS API        │
│        (apps/web)          │ │       (apps/api)        │
│  (Vite PWA, MUI, Theme)    │ │  ├── HealthModule       │
└────────────────────────────┘ │  ├── AuthModule         │
                               │  ├── AdminModule        │
                               │  ├── UsersModule        │
                               │  ├── AdventurersModule  │
                               │  ├── RanksModule        │
                               │  ├── CredentialsModule  │
                               │  ├── QuestsModule       │
                               │  └── PrismaModule       │
                               │  ┌───────────────────┐  │
                               │  │      Prisma       │  │
                               │  └─────────┬─────────┘  │
                               └────────────┼────────────┘
                                            │ SQL (PostgreSQL protocol)
                                            ▼
                               ┌─────────────────────────┐
                               │      PostgreSQL 16      │
                               └─────────────────────────┘
```

### Components

1. **Nginx Reverse Proxy (`infrastructure/nginx`)**
   - **Role**: Single HTTPS entry point for the integrated MVP stack.
   - **Port**: Listens on port `443` with TLS enabled.
   - **Certificates**: Local development self-signed certificate (`infrastructure/nginx/certs/server.crt` and `server.key`), generated via `infrastructure/nginx/generate-cert.sh`.
   - **Routing**:
     - `/api/` ──► `http://api:3000` (preserves full API path, e.g. `/api/v1/health`)
     - `/` ──► `http://web:5173` (React PWA, Web App Manifest, Service Worker, static assets)
   - **PWA Secure Context**: Provides HTTPS origin required for PWA Service Worker registration and Web App Manifest caching when testing from mobile and local network devices.

2. **Web (`apps/web`)**
   - **Framework**: React 19, TypeScript, Vite, MUI (@mui/material, @mui/icons-material, @emotion/react, @emotion/styled)
   - **UI Component System**: MUI is the single component framework. No competing component libraries are permitted.
   - **Theme Foundation**: Central MUI theme (`src/theme/`) configuring palette, typography, shape, spacing, and breakpoints (`xs`, `sm`, `md`, `lg`, `xl`), with extensibility for future story themes (`createAppTheme`).
   - **Root Providers**: Application wrapped in `ThemeProvider` and `CssBaseline`.
   - **Shared Layout Primitives**: `src/components/common/` (`PageContainer`, `PageHeader`, `LoadingState`, `EmptyState`, `ErrorState`).
   - **Adventurer Components**: `src/components/adventurer/` (`RankBadge` for data-driven rank presentation, `MeritProgress` for threshold/merit tracking, `CredentialStatusCard` for license status).
   - **Admin Components**: `src/components/admin/` (`AdminDashboard` metrics, `AdminAdventurersView` table & modal, `AdminRanksView` DB configuration, `AdminCredentialsView` generic token management, `AdminComingSoonView`).
   - **Layout Shells**: `src/layouts/` (`UserLayout` featuring mobile-first AppBar + BottomNavigation; `AdminLayout` featuring AppBar + persistent/collapsible Drawer sidebar sharing the same central theme).
   - **Routing & Protection**: Client-side history navigation with role-based route protection:
     - `/login`: Public authentication page with quick demo account buttons.
     - `/user`: Mobile-first Adventurer Dashboard (Rank badge, Merit progress, Credential status).
     - `/user/profile`: Adventurer detailed profile and credential management.
     - `/user/quests`: Guild quest notices with API completion reporting and feedback animation.
     - `/user/rewards`: Guild merit rewards exchange (Coming soon placeholder).
     - `/admin`: Guild Administration Console (`dashboard`, `adventurers`, `ranks`, `credentials`, and Coming soon tabs).
   - **Local Visual Feedback Architecture**:
     - `src/types/feedback.ts` (`FeedbackEvent`) and `src/components/feedback/` (`GameFeedbackOverlay`, `questCompletionToFeedbackEvent`).
     - **API Flow**: User action ──► API request ──► Backend validation & DB update ──► API success ──► Frontend `FeedbackEvent` ──► Staged animation sequence.
     - **Failure Handling**: On API failure or network fault, the success animation is strictly suppressed, and a standard error Alert UI is presented.
     - **Domain Separation**: Backend provides domain data only (`success`, `quest`, `questCompletion`, `meritGranted`) without UI/CSS coupling.
     - **Accessibility**: `@media (prefers-reduced-motion: reduce)` removes bouncy transforms and provides gentle fades. Clear semantic icons and text headings communicate success without relying solely on color.
     - **Future Event Extension Point**: The UI component only requires `FeedbackEvent`. Future real-time sources (WebSocket / SSE) can plug into this same pipeline without altering domain logic.
     - *Not yet implemented*: WebSocket, SSE, Redis, MQTT, cross-device real-time sync, large-screen event display.
   - **PWA**: Integrated via `vite-plugin-pwa` with web manifest and service worker generation.
   - **Design**: Mobile-first responsive layout supporting mobile browsers, desktop displays, and PWA standalone installation.
   - **Scope**: Single unified frontend application.

3. **API (`apps/api`)**
   - **Framework**: NestJS (TypeScript, Modular Monolith)
   - **Global Prefix**: `/api/v1`
   - **Modules**:
     - `HealthModule`: Health monitoring (`GET /api/v1/health`)
     - `AuthModule`: Token-based authentication (`POST /auth/login`, `GET /auth/me`, `POST /auth/logout`) with `JwtStrategy` and `RolesGuard`.
     - `AdminModule`: Protected administrative operations (`GET /admin/summary`), restricted to `ADMIN` role.
     - `UsersModule`: Identity management and password hashing (passwords never exposed).
     - `AdventurersModule`: Adventurer profile management and rank assignment.
     - `RanksModule`: Database-driven rank tiers (F through S).
     - `CredentialsModule`: Token and tag identification abstraction (QRCODE, RFID, NFC).
     - `QuestsModule`: Quest listings (`GET /quests`, `GET /quests/:id`) and quest completion reporting with atomic merit ledger write (`POST /quests/:id/complete`).
     - `PrismaModule`: Global Prisma database connection service.
   - **ORM**: Prisma embedded directly within the API service.

4. **Database (`postgres`)**
   - **Engine**: PostgreSQL 16 (Alpine)
   - **Schema Management**: Managed via Prisma in `apps/api/prisma`.
   - **Containerization**: Managed as part of the Docker Compose stack.

5. **Package Management & Monorepo**
   - **Tool**: `pnpm` workspaces (`pnpm-workspace.yaml`).
   - **Lockfile**: `pnpm-lock.yaml`.

6. **Local Orchestration & Runtime**
   - **Tool**: Docker Compose (`compose.yaml`).
   - **Baseline Services**: `nginx`, `web`, `api`, `postgres`.

---

## Target Realtime & Display Architecture (Physical RPG Extension)

To support the physical RPG gameplay where real-world spaces represent the game environment, the architecture adopts a decoupled presentation, command, and identity input model:

```text
┌─────────────────────────────────┐
│     Physical Adventure Card     │ (Physical Card with Static QR Code Token)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       Scanner Abstraction       │
│  ├── QRScanner (Camera / Web)   │ ◄─── Phase 1 MVP Core
│  ├── ManualScanner (Debug Mode) │ ◄─── Phase 1 Developer Fallback
│  └── NFCScanner (Future Reader) │ ◄─── Future Hardware Migration
└────────────────┬────────────────┘
                 │ Resolves credentialToken (adventureId)
                 ▼
┌─────────────────────────────────┐
│       Actor Device (Web)        │ (Mobile Browser: Guild Staff / Boss / Merchant)
└────────────────┬────────────────┘
                 │ Command (HTTP / REST API with credentialToken)
                 ▼
┌─────────────────────────────────┐
│     NestJS API / Game Server    │ (Resolves Credential -> Player, Rule Engine)
└────────────────┬────────────────┘
                 │ Realtime Event (WebSocket push)
                 ▼
┌─────────────────────────────────┐
│       Display Node (Web)        │ (TV / Monitor / Projector: /display/*)
└─────────────────────────────────┘
```

### Architectural Decisions (ADR Summary)
1. **Phase 1 Identity & Credential Decision (QR Code MVP)**:
   - Phase 1 MVP adopts physical **Adventure Cards featuring QR Codes**, scanned via built-in device cameras (mobile phones, laptops, tablets), paired with a **Manual Credential Input** debug mode.
   - NFC is deliberately bypassed in Phase 1 to eliminate peripheral reader procurement, tag protocol variances, and mobile browser permission hurdles (such as iOS Web NFC constraints), accelerating end-to-end game loop validation.
2. **Strict Decoupling of Adventure ID from Credential Carrier**:
   - The QR Code is **not** the Adventure ID; it is merely a static credential carrier.
   - The QR Code payload strictly holds a static credential token (e.g. `adventure://player/{token}`) and **never** stores dynamic character state (HP, gold, merit, quests).
   - Core game engines (Battle, Shop, Guild, Quests, Display) depend solely on the resolved `Player` identity and are wholly oblivious to how the credential token was acquired.
3. **Scanner Abstraction & Migration Boundary**:
   - All input mechanisms implement a unified `Scanner` interface outputting a standard `AdventureIdentity` token.
   - **Future NFC Migration Impact Boundary**:
     - *Modules Affected*: Only the edge input adapter (`QRScanner` replaced or supplemented by `NFCScanner` / Web NFC / serial reader adapter).
     - *Modules Guaranteed Unaffected*: NestJS API, Prisma schema, `User`/`AdventurerProfile` domains, QuestsModule, Battle logic, Shop logic, Rule Engine, WebSocket Gateway, and Display Node views.
4. **Separation of Control and Presentation**:
   - **Actor Device = Control**: Staff/GM mobile web interface dedicated to scanning, selecting skills, and executing commands.
   - **Display Node = Presentation**: Dedicated web application views (`/display/boss-01`, `/display/guild-01`, `/display/shop-01`) optimized for spectators and adventurers, strictly rendering animations and UI upon event reception.
5. **Command vs Event Transport Separation**:
   - **Commands (Mutations)**: Handled strictly via standard HTTP REST APIs (`POST /battle/attack`, `POST /quests/complete`, etc.) ensuring transactional consistency, idempotency, and standard authentication guards.
   - **Realtime Events (Presentations)**: Dispatched asynchronously via WebSocket Gateway from backend to subscribed Display Node channels. Display nodes remain stateless renderers.
6. **Generalization to World Output Node (Long-Term)**:
   - Output channels will generalize from screens (`Display`) to sensory and physical actuations (`Audio`, `Light`, `Physical Effects`), triggered by unified domain events.

See [Game Design Document](../game-design.md) for full scenario descriptions and the Phase 1 Boss Battle POC specification.
See [Domain Model](domain-model.md) for details on entity relationships, authentication, credential abstractions, and rank design.
