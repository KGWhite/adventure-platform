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
                            │ HTTP / REST (JWT Bearer Auth)
                            ▼
┌────────────────────────────────────────────────────────┐
│                     NestJS API                         │
│                 (Modular Monolith)                     │
│  ├── HealthModule      (/api/v1/health)                │
│  ├── AuthModule        (/api/v1/auth)                  │
│  ├── AdminModule       (/api/v1/admin) (ADMIN only)    │
│  ├── UsersModule       (/api/v1/users)                 │
│  ├── AdventurersModule (/api/v1/adventurers)           │
│  ├── RanksModule       (/api/v1/ranks)                 │
│  ├── CredentialsModule (/api/v1/credentials)           │
│  ├── QuestsModule      (/api/v1/quests)                │
│  └── PrismaModule      (PrismaService)                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │                     Prisma                       │  │
│  └────────────────────────┬─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ SQL (PostgreSQL protocol)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   PostgreSQL 16                        │
└────────────────────────────────────────────────────────┘
```

### Components

1. **Web (`apps/web`)**
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


2. **API (`apps/api`)**

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

3. **Database (`postgres`)**
   - **Engine**: PostgreSQL 16 (Alpine)
   - **Schema Management**: Managed via Prisma in `apps/api/prisma`.
   - **Containerization**: Managed as part of the Docker Compose stack.

4. **Package Management & Monorepo**
   - **Tool**: `pnpm` workspaces (`pnpm-workspace.yaml`).
   - **Lockfile**: `pnpm-lock.yaml`.

5. **Local Orchestration & Runtime**
   - **Tool**: Docker Compose (`compose.yaml`).
   - **Baseline Services**: `web`, `api`, `postgres`.

See [Domain Model](domain-model.md) for details on entity relationships, authentication, credential abstractions, and rank design.
