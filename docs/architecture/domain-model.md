# Domain Model & Identity Architecture

This document defines the core domain model established in Phase 2 and extended in Phase 3 with authentication, role authorization, and role-based frontend layouts.

## 1. Domain Overview

The system models an **Adventurer Guild**:
- **USER** (`Role.USER`): An adventurer who registers credentials, accepts quests, and progresses through guild ranks.
- **ADMIN** (`Role.ADMIN`): A guild administrator who creates and manages quests, approves promotions, and configures guild ranks and rewards.

```text
┌──────────────┐          1:1          ┌───────────────────┐
│     User     ├───────────────────────┤ AdventurerProfile │
└──────┬───────┘                       └───────┬─────┬─────┘
       │                                       │     │
       │ (reviews / approves)             N:1  │     │ 1:N
       ├─────────────────┐                     │     ├───► Credential
       │                 │                     │     ├───► QuestCompletion ◄─── Quest
       ▼                 ▼                     ▼     ├───► MeritLedger
┌──────────────┐  ┌──────────────┐     ┌──────────────┐  └───► PromotionRequest
│QuestApproval │  │PromotionRev. │     │     Rank     │
└──────────────┘  └──────────────┘     └──────────────┘
                                         ▲          ▲
                                         │(from/to) │(requiredRank)
                                         │          │
                              PromotionRequest     Quest

┌──────────────────┐
│      Reward      │ (Extensible skeleton: virtual_item, physical_reward, device_action, etc.)
└──────────────────┘
```

### Intended MVP Gameplay & Progression Loop
The end-to-end progression loop designed for the MVP is:
```text
Adventurer (User)
  └─► Credential (QR / RFID / NFC token identification)
        └─► Quest (Rank-qualified adventure task)
              └─► Quest Completion (Submission for verification)
                    └─► Guild Merit (Ledger event recorded in MeritLedger)
                          └─► Promotion Eligibility (Merit threshold met)
                                └─► Promotion Request (Adventurer or system submits request)
                                      └─► Admin Review (Guild Administrator evaluates)
                                            └─► Rank Up (Upgraded to next Rank)
```
> [!NOTE]
> In Phase 4, the **database and domain skeleton** for this loop is established. Complete workflow execution (automatic eligibility calculation, submission forms, admin approval buttons, and reward execution) will be implemented in subsequent phases.

---

## 2. Core Entities

### User (`users` table)
Represents identity, credentials, and access control.
- `id`: Unique identifier (CUID)
- `username`: Unique login handle
- `passwordHash`: Bcrypt-hashed password (never stored in plain text and never exposed through API responses)
- `role`: Enum `USER` or `ADMIN`
- `createdAt`, `updatedAt`: Audit timestamps

### Rank (`ranks` table)
Represents adventurer rank progression.
- `id`: Unique identifier (CUID)
- `code`: Rank code (`F`, `E`, `D`, `C`, `B`, `A`, `S`)
- `name`: Display name (e.g., "Rank F", "Rank S")
- `order`: Numeric sort order (1 for F, 7 for S)
- `promotionThreshold`: Merit threshold required for promotion eligibility
- **Design Principle**: Rank behavior and progression rules are strictly **database-driven** rather than hard-coded in application logic. This ensures future game templates can configure custom rank tiers without code modifications.

### AdventurerProfile (`adventurer_profiles` table)
Represents the guild adventurer persona linked to a user account.
- `id`: Unique identifier (CUID)
- `userId`: Foreign key to `User` (1-to-1 relationship, cascade delete)
- `displayName`: Character / adventurer name
- `currentRankId`: Foreign key to `Rank` (initial default is Rank F)
- `level`: Adventurer progression level (default: `1`)
- `hp`: Current health points (default: `100`)
- `maxHp`: Maximum health points (default: `100`)
- `gold`: Circulating coins currency (default: `0`)
- `merit`: Total guild merit points (default: `0`, synchronized with MeritLedger)
- `createdAt`, `updatedAt`: Timestamps

### Credential (`credentials` table)
Represents physical or digital identification tokens assigned to adventurers.
- `id`: Unique identifier (CUID)
- `adventurerId`: Foreign key to `AdventurerProfile` (1-to-many relationship, cascade delete)
- `type`: Enum `CredentialType` (`QRCODE`, `RFID`, `NFC`)
- `value`: Unique token identifier / tag serial / QR payload
- `enabled`: Boolean flag indicating if token is active
- **Hardware Abstraction & Multi-Credential Design**: Core domain abstractions are decoupled from physical hardware scanning devices.
  - *Phase 1 Focus*: Leverages `CredentialType.QRCODE` as the static carrier printed on physical Adventure Cards, resolved by Camera-based Scanners.
  - *1:N Player-to-Credential Mapping*: Supports token rotation, revocation of lost cards, and multi-credential binding without mutating the underlying adventurer profile.
  - *Future NFC Upgrade*: An adventurer starting with a QR card can subsequently register an `NFC` token under the same profile, allowing both credentials to resolve to the same character without profile migration.
  - *Stateless Token Rule*: `value` stores only a static token (e.g. `adventure://player/{token}`); dynamic state (HP, gold, merit) is strictly persisted in server domain tables.

### Quest (`quests` table)
Represents a task or mission available to adventurers in the game world.
- `id`: Unique identifier (CUID)
- `title` / `name`: Short task title
- `description`: Quest instructions or objectives
- `objectiveType`: Objective category (Phase 2 MVP: `defeat_boss`)
- `targetId`: Objective target entity identifier (e.g., `boss-01` / `black-knight`)
- `targetCount`: Required completion count (default: `1`)
- `rewardGold`: Gold granted upon claiming quest reward (default: `0`)
- `rewardMerit`: Merit points granted upon claiming quest reward (default: `0`)
- `requiredRankId`: Optional foreign key to `Rank`
- `enabled`: Active/inactive toggle
- `createdAt`, `updatedAt`: Timestamps
- **Design Principle**: Scope is deliberately minimal. Does not use a complex scripting engine or DSL; objectives are purely declarative.

### PlayerQuest (`player_quests` table)
Represents an individual adventurer's active or historical quest progression instance.
- `id`: Unique instance identifier (CUID)
- `playerId`: Foreign key to `AdventurerProfile` (cascade delete)
- `questId`: Foreign key to `Quest` (cascade delete)
- `progress`: Current accumulated count towards target (default: `0`)
- `targetCount`: Target requirement snapshot (default: `1`)
- `status`: Enum `PlayerQuestStatus` (`ACCEPTED`, `COMPLETED`, `CLAIMED`)
- `acceptedAt`: Timestamp when quest was accepted at Guild Terminal
- `completedAt`: Timestamp when objective condition was satisfied
- `claimedAt`: Timestamp when reward was claimed
- **State Semantics**:
  - `accepted`: Quest is active and in progress.
  - `completed`: Quest objective is achieved; waiting for player to return to Guild and claim reward.
  - `claimed`: Reward has been paid out; prevents double completion and double claiming.
- **Single Active Quest Invariant**: In this phase, an adventurer may have at most one active (`accepted` or `completed`) quest at a time.

### QuestCompletion (`quest_completions` table)
Legacy verification record for admin-reviewed quest submissions.
- `id`: Unique identifier (CUID)
- `questId`: Foreign key to `Quest` (cascade delete)
- `adventurerId`: Foreign key to `AdventurerProfile` (cascade delete)
- `status`: Enum `QuestCompletionStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- `completedAt`: Timestamp of completion attempt
- `approvedAt`: Timestamp of administrator review
- `approvedBy`: Foreign key to `User` (the administrator who reviewed the submission)

### MeritLedger (`merit_ledgers` table)
Immutable ledger recording all credit and debit changes to an adventurer's Guild Merit.
- `id`: Unique identifier (CUID)
- `adventurerId`: Foreign key to `AdventurerProfile` (cascade delete)
- `amount`: Signed integer reflecting the merit delta (e.g. `+50` for quest completion)
- `reason`: Descriptive explanation for the adjustment
- `sourceType`: Source classification (e.g. `QUEST_COMPLETION`, `ADMIN_ADJUSTMENT`, `BONUS`)
- `sourceId`: Optional reference to the initiating entity (such as `questCompletionId`)
- `createdAt`: Ledger timestamp
- **Design Principle (Ledger Pattern)**: Progression is **never** stored solely as a mutable counter column on the adventurer profile. Every merit change must be traced through an immutable ledger entry, enabling full auditability and balance reconstruction.

### PromotionRequest (`promotion_requests` table)
Explicit record capturing an adventurer's request to advance to a higher rank.
- `id`: Unique identifier (CUID)
- `adventurerId`: Foreign key to `AdventurerProfile` (cascade delete)
- `fromRankId`: Foreign key to current `Rank`
- `toRankId`: Foreign key to target `Rank`
- `status`: Enum `PromotionRequestStatus` (`PENDING`, `APPROVED`, `REJECTED`)
- `reviewedBy`: Foreign key to `User` (administrator reviewer)
- `reviewedAt`: Timestamp of administrator decision
- `createdAt`: Submission timestamp
- **Design Principle (No Automatic Rank-Up)**: Reaching a merit threshold does **not** automatically mutate the adventurer's rank. It establishes *eligibility*, which leads to a `PromotionRequest` subject to administrative review.

### Reward (`rewards` table)
Extensible reward catalog skeleton.
- `id`: Unique identifier (CUID)
- `name`: Display name of the reward
- `description`: Optional descriptive text
- `type`: String classifier accommodating future reward mechanisms (`virtual_item`, `physical_reward`, `animation`, `device_action`, `custom`)
- `config`: Optional JSONB structure containing type-specific parameters (e.g., sound/animation assets, peripheral control flags)
- `enabled`: Availability toggle
- `createdAt`, `updatedAt`: Timestamps

### Boss (`bosses` table)
Represents a World Boss adversary encountered at physical challenge nodes.
- `id`: Unique identifier (e.g., `boss-01` / `black-knight`)
- `name`: Display name (e.g., "Black Knight")
- `hp`: Current baseline health points (e.g. `150`)
- `maxHp`: Maximum health points (e.g. `150`)
- `attackPower`: Base attack damage capacity (e.g. `15`)
- `createdAt`, `updatedAt`: Timestamps

### Battle (`battles` table)
Represents an authoritative combat session between an Adventurer (Player) and a Boss.
- `id`: Unique combat identifier (e.g., `battle-1728345600000`)
- `playerId`: Foreign key to `AdventurerProfile` (cascade delete)
- `bossId`: Foreign key to `Boss` (cascade delete)
- `playerHp`: Current player health in battle
- `bossHp`: Current boss health in battle
- `status`: Combat state (`active`, `victory`, `defeat`)
- `startedAt`: Battle start timestamp
- `endedAt`: Battle termination timestamp (null while active)
- `rewardGold`: Gold granted upon victory (default: `120`)
- `rewardMerit`: Guild merit granted upon victory (default: `10`)
- `rewardItem`: Text/item reward descriptor (e.g. `Black Knight Medal`)
- **Server Authoritative Rule**: Damage, counterattacks, victory, and reward payouts are strictly calculated on the Game Server. Frontend displays and mobile actor terminals act purely as presentation and command triggers.

---

### Story Independence & Generic Platform Design
While the current UI theme is styled as an **Adventurer Guild**, all backend data models and domain abstractions remain story-independent and serve as the baseline primitives for the broader **Physical RPG Platform** (detailed in [docs/game-design.md](../game-design.md)):
- `Credential`, `Rank`, `Quest`, `QuestCompletion`, `MeritLedger`, `PromotionRequest`, and `Reward` are generic platform primitives.
- Story-specific flavor (e.g., "公會任務", "冒險者公會", "S 級冒險者") belongs strictly in the frontend display and localized presentation layers.
- **Mapping to the Unified Physical RPG Model**:
  - **Player**: Mapped to `User` + `AdventurerProfile` + `Credential` (physical token identifier, e.g., NFC card resolved via decoupled Scanner).
  - **World Node (Input / Actor / Output)**: Currently, the platform implements the baseline *Adventurer Guild* node. Future iterations generalize nodes into a unified `World Node` tripartite structure:
    - *Input*: Decoupled `Scanner` resolving Adventure ID tokens.
    - *Actor Control*: Live staff mobile operation terminal (`Actor Mode`).
    - *Output*: Presentation endpoints (`Display Node`, expanding to `World Output Node` with audio/light/mechanics).
  - **Interaction & Rule**: Implemented today via rank-gated Quests and completion reporting. Future nodes will support dynamic interactions (purchases, Boss duels, buff acquisitions) evaluated by a dynamic Rule Engine.
  - **Dual-Track Economy**: `MeritLedger` currently models enduring status (**Merit**). Future extensions will incorporate expendable currency (**Coins**) to facilitate shop and minigame transactions.
- Core business logic and database tables remain reusable for future alternative game templates (e.g., sci-fi, corporate onboarding, school treasure hunts, live camp RPGs).

---

## 3. Authentication & Authorization Flow (Phase 3)

The platform implements a lightweight token-based authentication mechanism designed specifically for the MVP.

```text
1. Client POST /api/v1/auth/login { username, password }
   └─► API validates with bcryptjs against User.passwordHash
   └─► Returns { accessToken (JWT), user }

2. Client requests protected endpoints with header:
   Authorization: Bearer <accessToken>
   └─► JwtAuthGuard verifies JWT signature and resolves current user
   └─► RolesGuard enforces role permissions (USER vs ADMIN)

3. Client GET /api/v1/auth/me
   └─► Returns current User with AdventurerProfile, Rank, and Credentials
```

### Role Enforcement (Backend vs Frontend)
- Security is strictly enforced on the API layer via `RolesGuard` and `@Roles(...)`.
- `USER` accounts cannot access protected `ADMIN` endpoints (e.g., `GET /api/v1/admin/summary` returns `403 Forbidden`).
- Frontend route hiding provides user experience separation, but is backed by server-side authorization.

---

## 4. API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticate with username and password |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current user profile, rank, and credentials |
| `POST` | `/api/v1/auth/logout` | Authenticated | Terminate session / logout |
| `GET` | `/api/v1/admin/summary` | **ADMIN only** | Retrieve administrative overview metrics |
| `GET` | `/api/v1/ranks` | Public / Auth | List all ranks sorted by order |
| `GET` | `/api/v1/ranks/:id` | Public / Auth | Get rank details |
| `GET` | `/api/v1/adventurers` | Authenticated | List adventurers (with rank, sanitized user, credentials) |
| `POST` | `/api/v1/adventurers` | Authenticated | Create an adventurer profile |
| `GET` | `/api/v1/adventurers/:id` | Authenticated | Get adventurer by ID |
| `GET` | `/api/v1/adventurers/:id/credentials` | Authenticated | List credentials for a specific adventurer |
| `POST` | `/api/v1/credentials` | Authenticated | Register a credential (`QRCODE`, `RFID`, or `NFC`) |
| `GET` | `/api/v1/credentials` | Authenticated | List all credentials |

> [!IMPORTANT]
> **Data Exposure Policy**: Password hashes (`passwordHash`) are strictly excluded from all public API outputs via `select` projections and `sanitizeUser` utilities.

---

## 5. Web Routes & Protected Layouts

- `/login`: Public login form with quick demo autofill buttons.
- `/user`: Mobile-first Adventurer Dashboard. Displays display name, rank, guild merit (0), and credential status.
- `/admin`: Guild Administration Console with sidebar navigation for Dashboard, Adventurers, Ranks, Credentials, Quests (Coming soon), and Promotions (Coming soon).

### Routing Guard Logic
- Unauthenticated users accessing `/user` or `/admin` are automatically redirected to `/login`.
- Authenticated `USER` users accessing `/admin` are forbidden and redirected to `/user`.
- Authenticated users accessing `/login` or `/` are routed to their respective role home (`/user` or `/admin`).

---

## 6. Current PWA Capabilities & Known Limitations

### PWA Capabilities
- Valid web app manifest (`manifest.webmanifest`) generated by `vite-plugin-pwa`.
- Automatic service worker caching of application shell assets.
- Installable as a standalone app on supported mobile and desktop browsers.

### Known Limitations & Scope Discipline (Phase 4)
- **Quest Workflow**: Database models (`Quest`, `QuestCompletion`) exist; quest acceptance, submission endpoints, and admin verification UI are scheduled for subsequent phases.
- **Guild Merit Ledger**: `MeritLedger` model exists; merit calculation currently returns `0` until quest completion and balance aggregation services are connected.
- **Promotions**: `PromotionRequest` model exists; promotion eligibility checking and admin review approval workflows are scheduled for future phases. **No automatic rank-up logic exists.**
- **Rewards**: `Reward` model exists as an extensible schema skeleton; reward fulfillment, physical dispenser triggers, and animation playback are deliberately not implemented in this phase.
- **Hardware Integration**: No physical QR scanning, RFID readers, or NFC hardware drivers exist yet.
