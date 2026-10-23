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
│   ├── /ws    ──►  http://api:3000 (WebSocket Upgrade)  │
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
                               │  ├── BossesModule       │
                               │  ├── BattlesModule      │
                               │  ├── ActionCardsModule  │
                               │  ├── InventoryModule    │
                               │  ├── ShopsModule        │
                               │  ├── EventsModule       │
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
   - **Role**: Single HTTPS entry point and gateway for the integrated MVP stack.
   - **Ports**: Listens on port `443` (HTTPS / WSS, TLS enabled) and port `80` (HTTP, redirects to HTTPS).
   - **Certificates**: Local development self-signed certificate (`infrastructure/nginx/certs/server.crt` and `server.key`), generated via `infrastructure/nginx/generate-cert.sh`.
   - **Routing**:
     - `/api/` ──► `http://api:3000` (preserves full API path, e.g. `/api/v1/health`)
     - `/ws` ──► `http://api:3000` (RFC 6455 WebSocket Upgrade gateway)
     - `/` ──► `http://web:5173` (React PWA, Web App Manifest, Service Worker, static assets)
   - **Upstream Resolution**: Upstreams are referenced through variables with `resolver 127.0.0.11 valid=10s` (Docker embedded DNS), so `api` / `web` service names are re-resolved at request time and recreated containers are reached without restarting Nginx.
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
     - `/user`: Mobile-first Adventurer Dashboard (Rank badge, Merit progress, Credential status, read-only equipment and backpack).
     - `/user/profile`: Adventurer detailed profile and credential management.
     - `/user/quests`: Read-only guild quest notices listing `GET /api/v1/quests` with gold / merit rewards; quests are accepted and claimed at `/guild`.
     - `/user/rewards`: Guild merit rewards exchange (Coming soon placeholder).
     - `/admin`: Guild Administration Console (`dashboard`, `adventurers`, `ranks`, `credentials`, and Coming soon tabs).
     - `/guild`: **Guild Terminal (World Node)**: Adventurer Card scanning, Adventurer status, Quest acceptance, progress tracking, reward claiming, and equipping / unequipping items.
     - `/actor/boss`: **World Actor Terminal**: Mobile-first Boss battle control terminal with button attack or action card mode (continuous camera scanning, optional Web NFC, manual card buttons).
     - `/actor/shop/:shopId`: **Shop Keeper Terminal (World Actor)**: Card scanning, per-player offers with lock reasons, purchase confirmation with optional immediate equip.
     - `/display/shop-*`: **Shop Display Node** (e.g. `/display/shop-01`): Idle item showcase, welcome screen, purchase reveal animation, and equipment change toast.
     - `/display/:displayId`: **World Display Node** (e.g. `/display/boss-01`; every `/display/*` path other than `/display/shop-*` renders the Boss display): Large-screen RPG HUD with HP animations, sound/vibration effects, and victory settlement.
   - **Local Visual Feedback Architecture**:
     - `src/types/feedback.ts` (`FeedbackEvent`) and `src/components/feedback/` (`GameFeedbackOverlay`, `questCompletionToFeedbackEvent`). No page currently renders the overlay; it is kept as the extension point for local and real-time feedback.
     - **API Flow**: User action ──► API request ──► Backend validation & DB update ──► API success ──► Frontend `FeedbackEvent` ──► Staged animation sequence.
     - **Failure Handling**: On API failure or network fault, the success animation is strictly suppressed, and a standard error Alert UI is presented.
     - **Domain Separation**: Backend provides domain data only (`success`, `quest`, `questCompletion`, `meritGranted`) without UI/CSS coupling.
     - **Accessibility**: `@media (prefers-reduced-motion: reduce)` removes bouncy transforms and provides gentle fades. Clear semantic icons and text headings communicate success without relying solely on color.
     - **Future Event Extension Point**: The UI component only requires `FeedbackEvent`. Future real-time sources (WebSocket / SSE) can plug into this same pipeline without altering domain logic.
     - Cross-device real-time events are delivered by `EventsModule` (WebSocket `/ws`, SSE fallback) to `/display/*` views. *Not yet implemented*: Redis, MQTT, or any external event broker; events are broadcast within the single API process.
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
     - `UsersModule`: Identity management and password hashing (passwords never exposed). `POST /users` is restricted to `ADMIN` and always creates `USER` accounts (client-supplied `role` is rejected).
     - `AdventurersModule`: Adventurer profile management and rank assignment. `POST /adventurers` is restricted to `ADMIN`.
     - `RanksModule`: Database-driven rank tiers (F through S).
     - `CredentialsModule`: Token and tag identification abstraction (QRCODE, RFID, NFC) with in-memory fallback. `POST /credentials` is restricted to `ADMIN`.
     - `BossesModule`: Boss definition and query (`GET /bosses`, `GET /bosses/:id`).
     - `BattlesModule`: Combat sessions (`POST /battles/scan`, `POST /battles`, `POST /battles/:id/attack`, `POST /battles/:id/cards`, `GET /battles/:id`); snapshots equipment stats from `InventoryModule` at battle start. Action card combos (`battles/skills.ts`), the 6s combo timer and the 2s per-card cooldown live in API memory; actions on one battle are serialized.
     - `ActionCardsModule`: Shared venue action cards (`GET /action-cards`) and card value resolution for battles. Requires the database.
     - `QuestsModule`: Quest management (`GET /quests`, `GET /quests/:id`, `POST /player-quests`, `GET /player-quests/player/:id`, `POST /player-quests/:id/claim`, `POST /guild/scan`).
     - `InventoryModule`: Adventurer inventory and equipment (`GET /players/:playerId/inventory`, `POST /players/:playerId/equipment`, `DELETE /players/:playerId/equipment/:slot`).
     - `ShopsModule`: Shop catalog, scan and purchase transactions (`GET /shops/:shopId`, `POST /shops/:shopId/scan`, `POST /shops/:shopId/purchases`). Requires the database (no in-memory fallback).
     - `EventsModule`: Real-time WebSocket Gateway (RFC 6455, `/ws`) & SSE streaming (`GET /events/stream`, status at `GET /events/status`) broadcasting game events (`player.scanned`, `battle.*`, `reward.*`, `quest.*`, `shop.purchase_completed`, `equipment.changed`, `card.scanned`, `skill.cast`, `skill.fizzled`).
     - `PrismaModule`: Global Prisma database connection service.
   - **Request Validation**: Global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`); request body DTOs declare `class-validator` rules and invalid or unknown fields return `400 Bad Request`.
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
   - Target design: all input mechanisms implement a unified `Scanner` interface outputting a standard `AdventureIdentity` token.
   - *Current implementation*: `/actor/boss`, `/guild` and `/actor/shop/:shopId` each offer a camera / manual input mode and send the raw `credentialValue` to the API. `/actor/boss` and `/actor/shop` use the `useQrScanner` hook (with a continuous mode for action cards) and `/actor/boss` adds `useNfcScanner` (Web NFC, Android Chrome only); `/guild` still embeds its own camera code. Payloads are classified by `utils/scanPayload.ts` (`adventure://player/…` identity cards vs `adventure://card/…` action cards), and every decode plays local feedback (`utils/scanFeedback.ts`) before any API call. A shared `Scanner` interface has not been extracted yet.
   - **Future NFC Migration Impact Boundary**:
     - *Modules Affected*: Only the edge input adapter (`QRScanner` replaced or supplemented by `NFCScanner` / Web NFC / serial reader adapter).
     - *Modules Guaranteed Unaffected*: NestJS API, Prisma schema, `User`/`AdventurerProfile` domains, QuestsModule, Battle logic, Shop logic, Rule Engine, WebSocket Gateway, and Display Node views.
4. **Separation of Control and Presentation**:
   - **Actor Device = Control**: Staff/GM mobile web interface dedicated to scanning, selecting skills, and executing commands.
   - **Display Node = Presentation**: Dedicated web application views (`/display/boss-01` and `/display/shop-01` today; `/display/guild-01` is planned) optimized for spectators and adventurers, strictly rendering animations and UI upon event reception.
5. **Command vs Event Transport Separation**:
   - **Commands (Mutations)**: Handled strictly via standard HTTP REST APIs (`POST /api/v1/battles`, `POST /api/v1/battles/:id/attack`, `POST /api/v1/battles/scan`, `POST /api/v1/credentials/validate`).
   - **Realtime Events (Presentations)**: Dispatched asynchronously via Pure Node.js RFC 6455 WebSocket Gateway (and SSE stream fallback `/api/v1/events/stream`) to subscribed Display Nodes. Display nodes remain stateless renderers.
   - **Implemented Event Schema**:
     - `player.scanned`: Adventurer card recognized, payload contains player name, level, hp, gold, merit.
     - `battle.started`: Combat initialized, displays player vs boss arena and health bars.
     - `battle.attack`: Attack motion initiated, triggers attack flash and sound.
     - `battle.damage`: Damage dealt and received, displays floating damage numbers, triggers screen shake, updates HP bars.
     - `battle.victory`: Boss defeated, displays victory aura and fanfare.
     - `battle.defeat`: Challenger fallen, displays defeat banner.
     - `reward.received`: Gold and Merit awarded, reflects server ledger update (+120 Gold, +10 Merit, Medal).
     - `quest.accepted`, `quest.progress_updated`, `quest.completed`, `quest.reward_claimed`: Guild quest lifecycle events (currently published to `guild-01`).
     - `shop.purchase_completed`: Purchase succeeded (item, price, gold after, equipped flag); published to the shop's display (default `shop-01`). Failed purchases emit nothing.
     - `equipment.changed`: Slot change with new total attack / defense; published to the shop display on purchase-with-equip, or to `guild-01` when changed at the guild.
     - `card.scanned`: An action card was accepted for a battle (card type, cast slot, combo deadline); emitted before the turn resolves so the display can react immediately. Cooldown repeats emit nothing.
     - `skill.cast`, `skill.fizzled`: Combo outcome (skill, cards, damage / heal, whether the boss countered); followed by the usual `battle.damage` and outcome events when HP changes.

6. **Generalization to World Output Node (Long-Term)**:
   - Output channels will generalize from screens (`Display`) to sensory and physical actuations (`Audio`, `Light`, `Physical Effects`), triggered by unified domain events.

---

## Current Status & Next Steps

- **Completed**: Boss Vertical Slice MVP (`/actor/boss` + `/display/boss-01` + BattlesModule + EventsModule + BossesModule)
- **Completed**: Guild + Quest Vertical Slice MVP (`/guild` + `PlayerQuest` acceptance, progress and reward claim)
- **Completed**: Shop + Equipment Vertical Slice MVP (`/actor/shop/shop-01` + `/display/shop-01` + ShopsModule + InventoryModule; see [Shop + Equipment spec](../specs/shop-equipment.md))
- **Completed**: Action Card Battle Vertical Slice MVP (instant scan feedback, `/actor/boss` card mode, ActionCardsModule, card slot and skill effects on `/display/boss-01`; see [Action Card Battle spec](../specs/action-card-battle.md))
- **Next Candidates**: Rank Up → Guild Status Terminal (`/display/guild-01`)

See [Game Design Document](../game-design.md) for full scenario descriptions and the Phase 1 Boss Battle POC specification.
See [Domain Model](domain-model.md) for details on entity relationships, authentication, credential abstractions, and rank design.
