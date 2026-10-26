# Adventure Platform

Adventure Platform (`adventure-platform`) 是一個**實體 RPG 遊戲平台／引擎（Physical RPG Platform / Physical MMORPG Engine）**。

其核心理念並非讓冒險者低頭盯著手機螢幕操作傳統手遊，而是利用實體卡片識別、手機端世界角色終端、大螢幕呈現、真人 NPC/GM、實體空間與遊戲後端引擎，讓**「現實世界本身成為遊戲世界」**。

### 核心定位與設計理念
- **實體身分識別（Adventure ID & QR Credential）**：冒險者持有一張實體 Adventure Card。**第一階段 MVP 採用印製之靜態 QR Code 作為身分憑證**，透過手機／設備內建鏡頭掃描辨識，快速驗證端到端遊戲循環；架構上嚴格將 Adventure ID（玩家核心身分）與 QR Code（實體載體）解耦，未來可平滑升級為 NFC 晶片卡而無需重構核心業務邏輯。
- **輸入端解耦（Scanner Abstraction）**：輸入端抽象為 `Scanner` 介面（Camera QR Scanner、Manual Debug Mode 以及未來的 NFC Scanner），遊戲邏輯（戰鬥、商店、公會、任務）只依賴解析後的冒險者身分。
- **世界角色終端（World Actor - Control）**：世界中的 NPC、店主、Boss、神官、守衛與 GM 由工作人員或玩家拿手機扮演（支援動態切換 `Actor Mode`）。手機是真人角色用來掃描冒險者 ID、判定規則、結算挑戰與操作遊戲的專用**控制終端（Control）**。
- **世界呈現裝置（Display Node - Presentation）**：電視、螢幕、平板或投影機作為世界呈現窗口，將數位世界的狀態、戰鬥與事件即時渲染至現實實體空間。**控制（Actor Device）與呈現（Display Node）嚴格職責分離**。
- **統一節點抽象（World Node）**：將武器店、防具店、公會、神殿、寶箱、Boss、傳送門、幸運屋等設施統一抽象為 `Input (Scanner) + Actor Control + Output (Display Node)` 架構。
- **雙軌通訊與事件驅動**：操作指令（Command）採標準 REST API，即時視覺事件（Realtime Event）採 WebSocket 廣播，Display 端點保持輕量化無狀態渲染。
- **雙軌資源與經濟體系**：
  - **金幣（Coins）**：高頻可消耗流通資源，用於購買裝備、藥品、服務與休閒活動。
  - **功績（Merit）**：不易被消耗之世界地位、聲望與資格累積，用於階級晉升（Rank Up）、解鎖高階委託、特殊商店與挑戰 Boss 資格。
- **首個 MVP 落地案例（Use Case）**：平台首個具體應用為「兒童冒險與獎勵系統（`games/kids-adventure`）」，作為概念驗證（PoC/MVP），同時底層架構完整具備支撐大型展演、營隊、主題商場等通用實境 RPG 之擴充能力。
- **詳細設計文件**：請參閱完整遊戲設計紀錄 [docs/game-design.md](docs/game-design.md)。

---

### 目前實作進度
- **Phase 1**：技術基底建立完成（React + Vite + PWA、NestJS Modular Monolith、PostgreSQL 16、Prisma、pnpm workspace、Docker Compose）。
- **Phase 2**：核心身分與冒險者領域模型完成（User、AdventurerProfile、Rank、Credential，包含資料庫遷移與開發 Seed 資料）。
- **Phase 3**：身分驗證與角色化前端版面完成（JWT Token 認證、角色權限守衛、/login、/user 冒險者儀表板、/admin 公會管理控制台）。
- **Phase 4**：MVP 遊戲領域骨架完成（Quest、QuestCompletion、MeritLedger、PromotionRequest、Reward，建立資料庫遷移與完整驗證）。
- **Local Feedback**：前端通用即時視覺回饋模型建立完成（`FeedbackEvent`、`GameFeedbackOverlay`、`quest-complete` 動效）。原本串接的 `POST /api/v1/quests/:id/complete` 已於 Guild + Quest Vertical Slice 移除，任務流程改由 `/guild` 終端與 `PlayerQuest` 完成；`GameFeedbackOverlay` 與 `questCompletionToFeedbackEvent` 目前沒有頁面使用，保留為擴充點。
- **已完成：Boss Vertical Slice MVP (首個實體互動閉環)**：
  - 驗證完整實體遊戲閉環：**QR Adventure Card → Boss Actor 掃描 → Game Server 辨識玩家 → 建立 Battle → Boss Actor 操作戰鬥 → Server 計算結果 → WebSocket 推送事件 → Boss Display 即時顯示 → Battle 結束 → 更新 Player State → 發放 Gold / Merit**。
  - **世界角色終端 (World Actor)**：`/actor/boss`（支援相機 QR 掃描與 Manual Credential Input 雙模式，大按鈕單手操作）。
  - **世界呈現終端 (Display Node)**：`/display/boss-01`（TV / 大螢幕沉浸式 RPG HUD、HP 動畫、受擊震動、飄字、勝利結算與獎勵顯示、自動重置計時器）。
  - **即時通訊中樞**：純 Node.js RFC 6455 雙向 WebSocket Gateway + SSE 備援串流，統一規格推播 `player.scanned`、`battle.*`、`reward.*`、`quest.*`（Shop 切片新增 `shop.purchase_completed`、`equipment.changed`；Action Card 切片新增 `card.scanned`、`skill.cast`、`skill.fizzled`；Progression 切片新增 `adventurer.level_up`）。
  - **Server 決定權威**：戰鬥數值、HP 扣減、勝負判定、金幣與功績發放均由後端權威計算與寫入資料庫及 MeritLedger。
- **已完成：Guild + Quest Vertical Slice MVP (首個完整 RPG Gameplay Loop)**：
  - 串起第一個端到端可玩遊戲循環：**Adventure Card → 公會掃 QR (`/guild`) → 顯示角色狀態 → 接任務 (`POST /api/v1/player-quests`) → 前往 Boss 討伐場 (`/actor/boss` + `/display/boss-01`) → 擊敗黑騎士 → Server 權威自動累加進度並切換至 `completed` (`quest.completed`) → 回公會再次掃卡 (`POST /api/v1/guild/scan`) → 顯示 QUEST COMPLETE → 點擊 Claim Reward (`POST /api/v1/player-quests/:id/claim`) → 獲得 Gold / Merit / MeritLedger 寫入**。
  - **公會實體終端機 (Guild Terminal)**：`/guild`（適合平板、筆電與固定 Kiosk 終端，相機 QR 掃描與測試卡片切換、冒險者狀態、任務接取、進度條與華麗任務完成領獎動效）。
  - **Server 決定權威與解耦架構**：Boss 戰鬥模組、Boss Actor 與 Boss Display 完全不包含 Quest 規則；戰鬥勝利經由 Domain Handler 自動更新任務進度並推播 WebSocket 事件。
  - **獎勵所有權明確分離 (Reward Ownership)**：明確劃分 Battle Reward（擊敗 Boss 直接獲得）與 Quest Reward（公會委託達成領取）。
  - **防重複完成與重複領獎保護 (Double Claim Protection)**：以 `PlayerQuest` 狀態檢查阻擋重複 Claim；尚未以資料庫條件更新保證並行請求下的安全性。
- **已完成：Shop + Equipment Vertical Slice MVP (首個金幣消費閉環)**：規格見 [docs/specs/shop-equipment.md](docs/specs/shop-equipment.md)。
  - 閉環：**戰鬥／任務取得金幣 → 店主 `/actor/shop/shop-01` 掃卡 → 依階級、金幣與持有狀態顯示可購清單 → 確認購買（可立即裝備）→ `/display/shop-01` 播放購得動效 → 於 `/guild` 換裝 → 下一場 Boss 戰套用裝備數值**。
  - **裝備欄位**：武器（`WEAPON`，加攻擊）與防具（`ARMOR`，減少 Boss 反擊傷害，最低 1 點）；裝備數值於開戰時快照。
  - **交易安全**：以條件扣款（`gold >= price`）與 `requestId` 冪等鍵防止超扣與重複扣款，每筆交易寫入 `Purchase` 稽核紀錄。
  - **資料庫必要**：商店與背包 API 不使用記憶體 fallback，資料庫不可用時回 `503`。
- **已完成：Action Card Battle Vertical Slice MVP (刷卡即時回饋與實體行動卡)**：規格見 [docs/specs/action-card-battle.md](docs/specs/action-card-battle.md)。
  - **即時刷卡回饋**：`/actor/boss`、`/actor/shop`、`/guild` 在本地解碼成功的瞬間播放震動、音效與畫面閃光，不等待 API。
  - **行動卡戰鬥**：`/actor/boss` 新增「卡片攻擊」模式（相機連續掃描、Android Chrome Web NFC 選配、手動卡片按鈕）。攻擊卡立即攻擊；元素卡（火／水／風）在 6 秒內與第二張卡組合為技能（火焰龍捲、蒸氣爆發、治癒之雨、元素斬），同元素兩張為魔法失控，單張逾時自動施放元素彈。
  - **Server 權威**：卡槽、組合計時器與同卡 2 秒冷卻由後端記憶體管理，同一場戰鬥的刷卡、按鈕攻擊與逾時結算依序處理。
  - **大螢幕**：`/display/boss-01` 新增卡槽、組合倒數圈與技能／失控演出（支援 `prefers-reduced-motion`）。
- **已完成：Adventurer Progression Vertical Slice MVP (等級成長與技能解鎖)**：規格見 [docs/specs/adventurer-progression.md](docs/specs/adventurer-progression.md)。
  - **等級由功績換算**：Lv1 0、Lv2 20、Lv3 50、Lv4 100、Lv5 160；擊敗 Boss 與領取任務獎勵時同步更新，升級時發送 `adventurer.level_up`，Boss 大螢幕與公會終端顯示 LEVEL UP 與新技能。
  - **技能依等級解鎖**：元素斬 Lv2、火焰龍捲 Lv3、治癒之雨 Lv4、蒸氣爆發 Lv5。Boss 戰開戰時快照等級，尚未學會的組合改放元素彈並提示。
  - **`/status` 自助終端**：小朋友刷 ID 卡看等級、升級進度、已學會與未解鎖的技能卡；升級後第一次刷卡播放 LEVEL UP 演出並標示 NEW。
- **已完成：Staff Console Vertical Slice MVP (一人一機扮演所有崗位)**：規格見 [docs/specs/staff-console.md](docs/specs/staff-console.md)。
  - **工作人員總控台 `/staff`**：`STAFF` 帳號登入後，以手機切換扮演公會、商店、Boss 與狀態查詢四個崗位，各崗位沿用既有操作畫面並內建測試卡，同時作為統一測試入口。
  - **跟隨模式大螢幕 `/display`**：伺服器記錄目前崗位（`GET`／`PUT /api/v1/stage`），切換時推送 `stage.changed`，大螢幕同步切到該崗位畫面；重新整理或斷線重連後以伺服器狀態為準，未選崗位時顯示「冒險者世界」待機畫面。
  - **新增大螢幕**：公會 `/display/guild-01`（委託告示板、冒險者名牌、接任務／完成委託／升級演出）與狀態查詢 `/display/status-01`（等級與技能卡牆，資料來自 `status.viewed`）。
  - **權限**：會改變遊戲狀態的世界節點端點（戰鬥、商店、公會、任務、裝備）改為僅限 `STAFF` 或 `ADMIN`；`/guild`、`/actor/*` 需登入；`/status` 與所有 `/display/*` 維持公開。
- **下一步候選**：
  - Rank Up（階級晉升考核）。

---

## Technical Stack

| 層級 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **Gateway / Proxy**| Nginx 1.27 (Alpine) | 單一入口（Port 443 HTTPS、Port 80 HTTP 重導向），終止 TLS 並分流 `/` (Web) 與 `/api` / `/ws` (API & WebSocket)，提供 PWA Secure Context |
| **Frontend** | React 19, TypeScript, Vite, MUI, PWA | 單一前端應用程式，採用 MUI 作為唯一元件庫，支援行動優先響應式設計、桌面瀏覽器與 PWA 安裝 |
| **Backend** | NestJS, TypeScript | Modular Monolith 架構，提供 `/api/v1` REST API |
| **Database** | PostgreSQL 16 | 執行於 Docker Compose，單一資料庫實例 |
| **ORM** | Prisma | 內建於 API 應用程式內 (`apps/api/prisma`)，非獨立容器 |
| **Auth** | JWT & Passport & bcryptjs | 輕量化 Token 認證與角色權限守衛（RolesGuard） |
| **Package Manager** | `pnpm` Workspaces | 依賴管理使用 `pnpm`，依賴鎖定檔僅使用 `pnpm-lock.yaml` |
| **Runtime & Compose**| Docker & Docker Compose | 本地整合環境運行基準，以 Nginx 為外部入口統一編排 |

---

## Architecture & Authentication (Phase 3)

```text
┌────────────────────────────────────────────────────────┐
│                      Web Browser                       │
│        (Mobile / Desktop / PWA Standalone Mode)        │
│          /login  ──►  /user (USER) | /admin (ADMIN)    │
│                       /staff (STAFF)                   │
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

### 1. 角色定義與映射 (Role Mapping)
- `Role.USER` = **冒險者 (Adventurer)**：登入後導向 `/user` 儀表板，檢視稱號、目前階級、公會功績與資格證狀態。
- `Role.STAFF` = **工作人員 (World Staff)**：登入後導向 `/staff` 總控台，以手機扮演公會櫃台、商店店員、Boss 看守者與狀態查詢；不能進入 `/admin` 與 `/user`。
- `Role.ADMIN` = **公會管理者 (Guild Administrator)**：登入後導向 `/admin` 控制台，檢視公會總覽、冒險者名冊、階級體系與憑證發行狀態；也可使用 `/staff` 與工作人員頁面。
- 後端角色名稱嚴格保持 `USER`、`STAFF` 與 `ADMIN`，遊戲主題故事標籤僅於前端 UI 層呈現。

### 2. 身分驗證流程 (Authentication Flow)
1. 前端向 `POST /api/v1/auth/login` 提交帳號密碼。
2. 後端透過 `bcryptjs` 驗證 `passwordHash`，成功則簽發 JWT accessToken。
3. 取得 Token 後儲存於瀏覽器，後續請求透過 HTTP Header `Authorization: Bearer <accessToken>` 攜帶。
4. 前端透過 `GET /api/v1/auth/me` 取得當前使用者角色與完整冒險者檔案。

### 3. 安全性與權限保護 (Authorization & Protection)
- **後端防護**：管理員專用 API（如 `GET /api/v1/admin/summary`）受 `RolesGuard` 與 `@Roles(Role.ADMIN)` 保護；`USER` 請求將直接遭到拒絕並回傳 `403 Forbidden`。
- **管理類寫入端點**：`POST /api/v1/users`、`POST /api/v1/adventurers`、`POST /api/v1/credentials` 同樣僅限 `ADMIN`（未帶 Token 回傳 `401`，`USER` 回傳 `403`）。`POST /api/v1/users` 不接受用戶端指定 `role`，新建帳號一律為 `USER`。
- **世界節點寫入端點**：會改變遊戲狀態的端點僅限 `STAFF` 或 `ADMIN`（`@StaffOnly()`；未帶 Token 回傳 `401`，`USER` 回傳 `403`）：`POST /battles/scan`、`POST /battles`、`POST /battles/:id/attack`、`POST /battles/:id/cards`、`POST /shops/:shopId/scan`、`POST /shops/:shopId/purchases`、`POST /guild/scan`、`POST /player-quests`、`POST /player-quests/:id/claim`、`POST /players/:playerId/equipment`、`DELETE /players/:playerId/equipment/:slot`、`PUT /stage`。`POST /status/scan`、所有 `GET` 查詢端點與即時事件維持公開。
- **請求驗證**：API 啟用全域 `ValidationPipe`（`whitelist` + `forbidNonWhitelisted` + `transform`），所有 Request Body DTO 以 `class-validator` 宣告規則；缺漏必填欄位或夾帶未宣告欄位一律回傳 `400 Bad Request`。
- **前端路由守衛**：
  - 未登入使用者訪問 `/user`、`/admin`、`/staff`、`/guild` 或 `/actor/*` 自動跳轉至 `/login`；工作人員頁面會帶上 `?next=`，登入後回到原頁。
  - 各角色只能進入自己的頁面：`USER` 無法進入 `/admin` 與工作人員頁面，`STAFF` 無法進入 `/admin` 與 `/user`，違反時重導向回角色首頁。
  - 已登入使用者訪問 `/login` 或根路徑 `/` 自動轉向其對應的角色首頁（`/user`、`/staff` 或 `/admin`）。
  - `/status` 與所有 `/display/*` 不需登入。

---

## Web Layouts & Shared UI Foundation

| 路由路徑 | 存取權限 | 頁面功能與規格說明 |
| :--- | :--- | :--- |
| `/login` | 公開 | 公會身分驗證登入表單，附開發測試帳號一鍵代入按鈕 |
| `/user` | `USER` | 行動優先冒險者儀表板：稱號、階級、功績晉升進度條、資格證卡片、裝備與背包（唯讀）、公會公告事項 |
| `/user/profile` | `USER` | 冒險者個人詳細檔案：帳號 ID、階級詳細門檻、綁定憑證清單與登出功能 |
| `/user/quests` | `USER` | 公會委託告示欄（唯讀）：讀取 `GET /api/v1/quests` 顯示任務與金幣／功績報酬，並提示前往 `/guild` 掃卡接取與領獎 |
| `/user/rewards` | `USER` | 公會獎勵兌換所：功績兌換獎勵（Coming soon 整備中） |
| `/admin` | `ADMIN` | 公會管理控制台：總覽數據卡片、冒險者名冊、階級門檻清單、憑證管理，未開放功能清楚標註 Coming soon |
| `/status` | 公開 / 現場 | **冒險者狀態終端 (Status Terminal)**：給小朋友自助刷 ID 卡的平板／大螢幕畫面，顯示等級徽章、升級進度、技能卡牆（已學會／未解鎖），升級後播放 LEVEL UP 演出；20 秒無操作回到待機 |
| `/staff` | `STAFF`、`ADMIN` | **工作人員總控台 (Staff Console)**：一支手機扮演所有崗位，上方崗位切換列（公會、商店、Boss、狀態），切換時大螢幕 `/display` 同步切換；各崗位保留畫面狀態（進行中的 Boss 戰不中斷），內建測試卡，兼作統一測試入口 |
| `/guild` | `STAFF`、`ADMIN` | **公會實體終端機 (Guild Terminal)**：平板/Kiosk 終端，QR 掃卡、檢視冒險者狀態、接取委託、任務完成領獎結算、裝備與卸下裝備 |
| `/actor/boss` | `STAFF`、`ADMIN` | **世界角色終端 (World Actor)**：Boss 操偶師專用，手機單手操作，相機掃卡辨識、發起戰鬥；可切換按鈕攻擊或行動卡攻擊（相機連續掃描、Web NFC、手動卡片） |
| `/actor/shop/:shopId` | `STAFF`、`ADMIN` | **商店店主終端 (World Actor)**：店主手機掃卡（預設 `shop-01`），顯示可購清單與鎖定原因、確認購買並可立即裝備 |
| `/display` | 公開 / 現場 | **跟隨模式大螢幕 (Follow Display)**：依 `/staff` 目前崗位切換為公會、商店、Boss 或狀態查詢大畫面；未選崗位時顯示「冒險者世界」待機畫面 |
| `/display/guild-*` | 公開 / 現場 | **公會呈現終端 (Display Node)**：如 `/display/guild-01`，閒置顯示委託告示板，掃卡顯示冒險者名牌，接任務、完成委託與升級演出 |
| `/display/status-*` | 公開 / 現場 | **狀態查詢呈現終端 (Display Node)**：如 `/display/status-01`，顯示該節點刷卡結果的等級、技能卡牆與 LEVEL UP 演出 |
| `/display/shop-*` | 公開 / 現場 | **商店呈現終端 (Display Node)**：如 `/display/shop-01`，閒置輪播商品、掃卡歡迎、購得裝備動效與裝備變更提示 |
| `/display/:displayId` | 公開 / 現場 | **世界呈現終端 (Display Node)**：以路徑中的 `displayId`（預設情境為 `boss-01`）訂閱即時事件；上列以外的路徑皆渲染 Boss Display。大螢幕沉浸式 RPG HUD，WebSocket 即時血條動畫、受擊飄字、勝利演出 |

### 前端 UI 架構基礎 (MUI Shared Design Foundation)

1. **單一元件庫規範**：使用 MUI (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`) 作為唯一 UI 元件庫，嚴格禁止混用其他元件庫（如 Ant Design、Chakra UI、Tailwind UI）。
2. **共用主題系統 (`src/theme/`)**：
   - 核心定義包含調色盤 (`palette.ts`)、字型排版 (`typography.ts`)、圓角形狀 (`shape`)、間距系統 (`spacing`) 與斷點 (`breakpoints`)。
   - 提供 `createAppTheme()` 工廠函式，保有後續擴充不同故事主題的能力，但底層後端/領域邏輯嚴格保持獨立。
   - 全域進入點以 `ThemeProvider` 與 `CssBaseline` 包覆。
3. **共享版面原語 (`src/components/common/`)**：
   - `PageContainer`：行動優先響應式頁面容器。
   - `PageHeader`：統一標題、副標題、Badge 與操作區塊。
   - `LoadingState`：統一載入中提示狀態。
   - `EmptyState`：無資料或清單為空的提示狀態。
   - `ErrorState`：錯誤提示與重試操作。
4. **冒險者專用元件與行動優先體驗 (`src/components/adventurer/` & `UserLayout`)**：
   - `UserLayout`：頂部 `AppBar`（品牌、桌面導覽與使用者摘要）＋ 中間捲動內容 ＋ 行動裝置固定底部導覽 `BottomNavigation`（首頁、任務、獎勵、檔案）。
   - `RankBadge`：完全資料驅動的階級標記，無硬編碼升階條件。
   - `MeritProgress`：公會功績進度條，安全計算晉升百分比並優雅處理最高階級無下階門檻之情境。
   - `CredentialStatusCard`：明確呈現資格證登記狀態（QR Code、NFC、RFID）與啟用/未綁定狀態。
5. **管理員專用元件與高效率管理介面 (`src/components/admin/` & `AdminLayout`)**：
   - `AdminLayout`：頂部 `AppBar` 搭配側邊欄 `Drawer`（桌面常駐 240px 導覽，行動端自動摺疊為漢堡選單抽屜），主內容區自動配合位移。
   - `AdminDashboard`：公會真實營運指標（冒險者數、階級數、已發行憑證數與系統帳號數）。
   - `AdminAdventurersView`：冒險者名冊管理，採用標準 MUI Table 排版，支援冒險者詳細資料彈窗與新冒險者登記表單。
   - `AdminRanksView`：完全依據資料庫配置之階級順位、代碼與晉升功績門檻清單。
   - `AdminCredentialsView`：通用憑證抽象管理，支援 QR Code、RFID、NFC 等不同載體登記與狀態管理，不綁定單一硬體技術。
   - `AdminComingSoonView`：未開放之後端業務（任務管理、晉升審批、獎勵發放）清楚標註「Coming soon」，避免虛構 CRUD 行為。
6. **體驗版面隔離與主題一致性 (`src/layouts/`)**：
   - `UserLayout`：專屬冒險者消費端遊戲化體驗，支援行動優先觸控與底部導覽。
   - `AdminLayout`：專屬公會管理員管理效率體驗，具備側邊抽屜導覽與管理表格。
   - 兩者完全共用同一套 MUI Theme 基礎（Tokens、Palette、Typography、Breakpoints），確保系統一致且不引入第二套 UI 框架。
7. **本機通用即時視覺回饋架構 (`src/types/feedback.ts` & `src/components/feedback/`)**：
   - **回饋資料模型 (`FeedbackEvent`)**：建立極簡泛用之介面與常數，供操作發起裝置在 API 成功後立即呈現視覺動畫反饋。
8. **公會羊皮紙視覺風格 (Guild Parchment Style - Light Theme)**：
   - **明亮暖調羊皮紙調色盤**：全域採用明亮溫暖的淺色羊皮紙基底（頁面背景 `#f8f4eb` 暖象牙米色、卡片紙張面 `#fffdf9` 溫潤乳白），告別冷硬黑暗儀表板與企業冷灰，呈現白天陽光明媚、熱血洋溢的冒險者公會大廳。
   - **核心品牌色彩**：主色選用冒險深赤紅（Primary `#be123c`）、輔色為公會榮譽琥珀金（Secondary `#b45309`）、點綴火炬橘（`#c2410c`）與公會御用皇家藍（Info `#1d4ed8`），文字採用深烘焙暖木炭棕（`#2d241e`），於羊皮紙底色上具備絕佳對比度與易讀性。
   - **公會意象與紙張層次 (Parchment & Guild Metaphor)**：
     - **公會告示欄 (Guild Notice Board)**：任務卡片採羊皮紙微浮雕邊框（`#e5dcc7`）與溫暖陰影，搭配金紅流光獎勵標記。
     - **公會印章徽章 (RankBadge)**：以金紅印記封蠟與獎章為概念，結合白文字與深色邊框，純資料庫驅動。
     - **冒險者資格證 (Adventurer License)**：將實體／數位憑證卡片打造為專屬冒險執照內嵌單據，維持 generic 抽象。
     - **榮譽功績進度 (MeritProgress)**：暖金數值高亮與赤紅至流金的進度軌道。
   - **排版字級與觸控保證**：維持大字號清晰排版（h1 2.5rem、body1 1.0625rem），確保行動端觸控區域 >= 44px（主按鈕 48px），嚴防文字折行破版或水平捲動。
   - **管理後台結構性**：管理端共享相同明亮羊皮紙基調（公會行事處風格），但保持嚴謹高密度資料表格與表單佈局。
   - **遊戲化覆蓋層元件 (`GameFeedbackOverlay`)**：提供置中／全螢幕遊戲式彈窗（非傳統純 Snackbar），針對行動優先與 PWA 觸控體驗特別強化。
   - **首發任務完成動效 (`quest-complete`)**：以純 CSS Keyframes 與原生瀏覽器轉場打造輕量級階段式時序（遮罩與卡片淡入 -> 核心徽章彈跳放大 -> 標題滑入 -> 訊息淡入 -> 功績獎勵數值彈出 -> 操作按鈕就緒），支援手動按鈕/點擊遮罩關閉及預設 4.5 秒自動關閉。
   - **API 成功確認與回饋觸發流程 (Phase 4)**（原由 `/user/quests` 觸發；該端點移除後目前沒有頁面使用，以下為保留之設計規範）：
     - 使用者操作 ──► API 請求 ──► 後端驗證 ──► 資料庫交易更新 ──► API 成功回應 ──► 前端轉換為 `FeedbackEvent` ──► 播放動畫。
     - **失敗處置**：若 API 回應失敗（4xx/5xx）或網路中斷，**嚴格禁止播放成功動畫**，直接於介面呈現標準錯誤警示（Error Alert UI）。
     - **前後端領域邊界隔離**：後端僅回傳客觀領域事實（`success`, `quest`, `questCompletion`, `meritGranted`），嚴格禁止後端深度耦合 CSS 類別名、動畫名稱或前端元件名稱；前端透過 `questCompletionToFeedbackEvent` 轉換器決定視覺呈現。
   - **無障礙性支援 (`prefers-reduced-motion`)**：
     - 完整支援系統減弱動效設定，當使用者偏好 reduced motion 時，停用強烈縮放與彈跳位移，改以平緩淡入淡出呈現，避免眩暈不適。
     - 不單純依賴顏色傳遞成功狀態，結合語意圖示、清楚標題與「+50 公會功績」數值標籤確保資訊可讀性。
   - **獎勵領域概念可擴充性 (Reward Extensibility)**：
     - `Reward` 模型保持通用領域物件（包含虛擬道具、實體獎勵、裝置動作等），不將獎勵直接等同於動畫；動畫僅為視覺呈現手法之一。
   - **未來跨裝置即時事件擴充點 (Future Event Architecture)**：
     - 前端視覺回饋層僅依賴 `FeedbackEvent` 資料合約，與事件發起來源解耦。未來新增 WebSocket 或 SSE 等即時通訊管線時，只需將即時事件同樣轉換為 `FeedbackEvent` 即可直接驅動元件，無需重寫遊戲領域邏輯。
     - **後續已實作之即時能力**：Boss Vertical Slice 已加入 `EventsModule`（RFC 6455 WebSocket `/ws` 與 SSE `GET /api/v1/events/stream`），並由 `/display/:displayId` 大螢幕接收跨裝置事件；本機回饋層仍維持只依賴 `FeedbackEvent`。
     - **目前仍未引入之技術**：
       - ❌ Redis / MQTT / 外部 Event Broker（事件僅於單一 API 程序內廣播）
       - ❌ 微服務拆分

---


## MVP Game Domain Skeleton & Intended Flow (Phase 4)


Phase 4 完成了核心遊戲領域模型的資料庫與領域骨架。其後的 Boss、Guild + Quest 與 Shop + Equipment Vertical Slice 已在此骨架上加入 `PlayerQuest`、`Boss`、`Battle`、`Item`、`Shop`、`ShopItem`、`PlayerItem`、`Purchase` 與任務接取／領獎、商店購買與裝備流程；晉升審核（`PromotionRequest`）與獎勵派發（`Reward`）仍未實作。完整欄位請見 [docs/architecture/domain-model.md](docs/architecture/domain-model.md)。

### 1. 預期 MVP 完整遊戲與升遷循環 (Intended MVP Flow)

```text
冒險者 (Adventurer)
  └─► 憑證識別 (Credential: QR / RFID / NFC)
        └─► 接受階級對應任務 (Quest)
              └─► 提交任務完成紀錄 (Quest Completion)
                    └─► 寫入公會功績紀錄 (Guild Merit -> MeritLedger)
                          └─► 達成晉升門檻資格 (Promotion Eligibility)
                                └─► 提出晉升申請 (Promotion Request)
                                      └─► 公會管理員審查 (Admin Review)
                                            └─► 升格至下一階級 (Rank Up)
```

### 2. 核心領域骨架設計原則

| 實體模型 | 欄位與概念 | 設計原則與 MVP 約束 |
| :--- | :--- | :--- |
| **`Quest`** | `id`, `title`, `description`, `objectiveType`, `targetId`, `targetCount`, `rewardGold`, `rewardMerit`, `requiredRankId`, `meritReward`（舊欄位）, `enabled` | 宣告式任務定義（目前僅 `defeat_boss`）。不建立複雜任務類型、遞迴、前置依賴、計時器、地圖或多人協同行為。 |
| **`QuestCompletion`** | `id`, `questId`, `adventurerId`, `status`, `completedAt`, `approvedAt`, `approvedBy` | 任務完成紀錄與審核狀態（`PENDING` / `APPROVED` / `REJECTED`），為管理員審核流程預留；目前的 Guild 任務流程改用 `PlayerQuest`，未寫入此表。 |
| **`MeritLedger`** | `id`, `adventurerId`, `amount`, `reason`, `sourceType`, `sourceId`, `createdAt` | **功績帳本模式**：每筆功績變動都寫入不可變帳本以供追溯與稽核；`AdventurerProfile.merit` 是同一交易內同步遞增的餘額快取，不是唯一資料來源。目前寫入來源為 `BATTLE_VICTORY` 與 `QUEST_REWARD`。 |
| **`PromotionRequest`** | `id`, `adventurerId`, `fromRankId`, `toRankId`, `status`, `reviewedBy`, `reviewedAt` | **嚴格禁止自動升階**：功績累積達標僅代表「具備晉升資格」，必須經由申請並由公會管理員審查核准後方能升階。 |
| **`Item` / `Shop` / `ShopItem`** | `Item`: `id`, `name`, `type` (`WEAPON` / `ARMOR`), `attack`, `defense`, `iconKey`；`ShopItem`: `shopId`, `itemId`, `price`, `requiredRankId`, `sortOrder` | 物品定義與商店上架分離：同一物品可在不同商店以不同價格與階級限制販售。目前僅有裝備類物品，無消耗品。 |
| **`PlayerItem` / `Purchase`** | `PlayerItem`: `playerId`, `itemId`, `equipped`；`Purchase`: `price`, `goldBefore`, `goldAfter`, `requestId` | 背包與裝備狀態合一（每種裝備最多持有一件，每個欄位最多一件 `equipped`）。`Purchase` 為金幣消費稽核紀錄，`requestId` 唯一以保證重送不重複扣款。 |
| **`ActionCard`** | `id`, `value`, `type` (`STRIKE` / `FIRE` / `WATER` / `WIND`), `label`, `enabled` | 場地共用的實體行動卡（回答「我要做什麼」），與身分用的 `Credential`（回答「我是誰」）分開。技能組合規則以程式常數定義，不建資料表。 |
| **`Reward`** | `id`, `name`, `description`, `type`, `config`, `enabled` | **可擴充獎勵骨架**：保留未來擴充各類型獎勵（`virtual_item`, `physical_reward`, `animation`, `device_action`, `custom`）之進入點。**本階段僅保留架構擴充點，未實作獎勵派發或動畫播放邏輯**。 |

### 3. 故事獨立性 (Story Independence)
後端核心模型與領域邏輯保持通用化（`Credential`, `Rank`, `Quest`, `Reward`），不將「冒險者公會」的故事文本或專有名詞深度硬編碼至後端業務邏輯中，以確保未來各類遊戲主題（如科幻、企業訓練、闖關活動）均可直接復用平台底層。

---

## Directory Overview

```text
adventure-platform/
├── .env.example                  # 環境變數範本
├── AGENTS.md                     # 開發規範與治理準則
├── README.md                     # 專案首頁與快速上手指南
├── compose.yaml                  # Docker Compose 服務定義 (nginx, web, api, postgres)
├── package.json                  # Root package 與 workspace scripts
├── pnpm-lock.yaml                # pnpm 依賴鎖定檔
├── pnpm-workspace.yaml           # pnpm workspace 配置
├── apps/
│   ├── api/                      # NestJS 後端 API (包含 Prisma ORM)
│   │   ├── Dockerfile
│   │   ├── prisma/
│   │   │   ├── migrations/       # Prisma 遷移記錄
│   │   │   ├── schema.prisma     # 核心領域與資料模型
│   │   │   └── seed.ts           # 階級與開發測試資料 Seed 腳本
│   │   └── src/
│   │       ├── action-cards/     # 行動卡查詢與解析模組
│   │       ├── admin/            # 管理員保護模組 (RolesGuard: ADMIN)
│   │       ├── adventurers/      # 冒險者個人檔案模組
│   │       ├── auth/             # JWT 認證、守衛與裝飾器模組
│   │       ├── credentials/      # 冒險者憑證模組 (QRCODE, RFID, NFC)
│   │       ├── bosses/           # 世界 Boss 模組 (Black Knight)
│   │       ├── battles/          # 戰鬥連線、攻擊與行動卡技能組合權威結算模組
│   │       ├── events/           # 即時 WebSocket Gateway & SSE 串流中樞
│   │       ├── health/           # 健康檢查端點 GET /api/v1/health
│   │       ├── inventory/        # 冒險者背包、裝備與卸下、裝備數值計算模組
│   │       ├── prisma/           # PrismaService / PrismaModule
│   │       ├── quests/           # 任務查詢、接取、進度更新與報酬領取模組
│   │       ├── progression/      # 等級換算、技能解鎖與 /status 掃卡模組
│   │       ├── ranks/            # 階級模組 (F..S)
│   │       ├── shops/            # 商店目錄、掃卡可購清單與購買交易模組
│   │       ├── stage/            # 工作人員目前崗位 (記憶體) 與 stage.changed 推送模組
│   │       ├── users/            # 使用者與身分模組 (USER, STAFF, ADMIN)
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── web/                      # React + TypeScript + Vite + PWA 前端
│       ├── Dockerfile
│       ├── public/               # 公會盾徽 Logo (favicon.svg)、PWA 安裝圖示與靜態資產
│       ├── src/
│       │   ├── components/
│       │   │   ├── actor/               # 世界角色終端 (/actor/boss、/actor/shop/:shopId)
│       │   │   ├── admin/               # 管理員元件 (Dashboard、名冊、階級、憑證)
│       │   │   ├── adventurer/          # 冒險者元件 (RankBadge、MeritProgress、CredentialStatusCard、InventoryCard)
│       │   │   ├── common/              # 共享版面原語 (PageContainer、PageHeader 等)
│       │   │   ├── display/             # 世界呈現終端 (跟隨模式 /display、Guild / Shop / Boss / Status Display)
│       │   │   ├── feedback/            # 遊戲即時回饋覆蓋層 (GameFeedbackOverlay)
│       │   │   ├── guild/               # 公會櫃台 (GuildCounter) 與 /guild 終端機，含裝備面板
│       │   │   ├── staff/               # 工作人員總控台 (/staff) 與狀態查詢崗位
│       │   │   ├── status/              # 冒險者狀態終端 (/status) 與共用狀態畫面
│       │   │   ├── AdminView.tsx        # 公會管理員控制台版面
│       │   │   ├── Adventurer*View.tsx  # 冒險者儀表板、檔案、任務、獎勵頁
│       │   │   └── LoginView.tsx        # 公會身分驗證登入介面
│       │   ├── context/
│       │   │   └── AuthContext.tsx      # 全域身分狀態與 Token 管理
│       │   ├── hooks/
│       │   │   ├── useGameEvents.ts     # WebSocket / SSE 即時事件訂閱
│       │   │   ├── useNfcScanner.ts     # Web NFC 行動卡讀取 (Android Chrome)
│       │   │   └── useQrScanner.ts      # 相機 QR 掃描 (/actor/boss、/actor/shop；支援連續掃描)
│       │   ├── layouts/                 # UserLayout / AdminLayout
│       │   ├── router/
│       │   │   ├── Router.tsx           # 路由提供者與權限跳轉守衛
│       │   │   └── routeAccess.ts       # 各角色可進入的路徑與登入後落點
│       │   ├── theme/                   # MUI 主題 (palette、typography)
│       │   ├── types/                   # 前端共用型別 (auth、battle、feedback、progression、quest、shop、stage)
│       │   ├── utils/
│       │   │   ├── apiFetch.ts          # 帶工作人員 Token 呼叫世界節點端點 (401 導回登入)
│       │   │   ├── audioEffects.ts      # 戰鬥音效
│       │   │   ├── itemIcons.ts         # 物品圖示與數值標籤
│       │   │   ├── scanFeedback.ts      # 刷卡即時回饋 (震動、音效、閃光)
│       │   │   └── scanPayload.ts       # 身分卡／行動卡 payload 解析
│       │   ├── App.tsx                  # 應用程式進入點與路由分發
│       │   ├── App.css
│       │   └── index.css
│       └── vite.config.ts        # Vite 與 VitePWA 外掛配置
├── packages/
│   └── shared/                   # 未來共用型別與工具函式庫
├── games/
│   └── kids-adventure/           # 遊戲專案配置（首個 MVP 落地案例：兒童冒險與獎勵系統）
├── infrastructure/
│   ├── database/migrations/      # 預留目錄 (.gitkeep)；Prisma 遷移位於 apps/api/prisma/migrations
│   └── nginx/                    # Nginx 反向代理配置與 TLS 憑證目錄
│       ├── nginx.conf            # Nginx 設定檔 (HTTPS 443, /、/api 與 /ws 路由)
│       ├── certs/                # TLS 憑證與金鑰目錄 (.gitkeep，不提交金鑰)
│       └── generate-cert.sh      # 開發用自簽 TLS 憑證產生腳本 (支援 SAN)
└── docs/
    ├── game-design.md            # 實體 RPG 遊戲平台設計規格書 (World Node, Actor Mode, 雙軌資源)
    ├── specs/                    # Vertical Slice 需求規格
    │   ├── action-card-battle.md
    │   ├── adventurer-progression.md
    │   ├── shop-equipment.md
    │   └── staff-console.md
    ├── architecture/             # 架構與領域模型技術文件
    │   ├── domain-model.md
    │   └── system-architecture.md
    └── development/              # 開發流程指南
        ├── dependency-policy.md
        └── getting-started.md
```

---

## Quickstart (Docker Compose)

Docker Compose 是本專案 MVP 的整合運行與環境標準，以 Nginx 作為單一 HTTPS 對外入口。

### 1. 環境變數設定

```bash
cp .env.example .env
```

### 2. 產生開發用 TLS 憑證

啟動前請先產生本機開發用自簽 TLS 憑證：

```bash
# 本地 localhost 測試：
./infrastructure/nginx/generate-cert.sh

# 或區域網路 (LAN) 行動裝置測試：
./infrastructure/nginx/generate-cert.sh 192.168.1.100
```

> 亦可直接執行 OpenSSL 命令：
> ```bash
> openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
>   -keyout infrastructure/nginx/certs/server.key \
>   -out infrastructure/nginx/certs/server.crt \
>   -subj "/CN=localhost" \
>   -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
> ```

### 3. 啟動完整服務棧

```bash
docker compose up --build
```

Compose 會依序啟動：
1. `postgres`（含 Healthcheck）
2. `api`（等候 postgres ready 後自動執行 Prisma 遷移、資料庫 Seed 並啟動服務）
3. `web`（等候 api 後啟動內部預覽服務）
4. `nginx`（反向代理閘道，對外暴露 80 與 443 埠，將 `/` 導向 `web:5173`，將 `/api/` 與 `/ws` 導向 `api:3000`）

### 4. 連接埠需求與網路架構 (Port Requirements & Network Architecture)

專案依照運行情境（Docker Compose 整合運行 vs. 本機原始碼開發）所需開放或使用的連接埠如下：

#### (1) Docker Compose 整合運行（宿主機 / 防火牆開放連接埠）

| 連接埠 (Port) | 協定 | 對應服務 | 存取方向 / 角色 | 說明與安全建議 |
| :--- | :--- | :--- | :--- | :--- |
| **80** | TCP (HTTP) | `nginx` | 對外開放 (Inbound) | HTTP 入口，自動 301 轉址導向 HTTPS (Port 443) |
| **443** | TCP (HTTPS / WSS) | `nginx` | 對外開放 (Inbound) | **主要對外安全入口**。反向代理前端 Web (`/`)、後端 REST API (`/api`) 與即時 WebSocket (`/ws`)，提供 PWA 必要之 Secure Context |

> **Docker 內部虛擬網路連接埠（未對宿主機開放）**：
> - `5432` (`postgres` 容器)：PostgreSQL 資料庫通訊埠，僅供 `api` 容器於 Docker 內部網路互連。若需進行資料庫維運或檢視，可使用 `docker exec -it adventure-postgres psql -U adventure_user -d adventure_platform` 或臨時維運容器。
> - `3000` (`api` 容器)：NestJS 內部監聽埠，僅供 Nginx 透過 Docker 內部網路反向代理 (`http://api:3000`)。
> - `5173` (`web` 容器)：React 前端預覽服務內部監聽埠，僅供 Nginx 透過 Docker 內部網路反向代理 (`http://web:5173`)。

##### Docker Network 架構與 Nginx 固定 IP 配置

- **網路名稱**：`adventure-platform_default`
- **驅動與子網路**：Bridge / `172.18.0.0/16`
- **Nginx 固定 IP**：`172.18.0.10`（於 `compose.yaml` 中固定，避免容器重建後 IP 變動導致宿主機 firewalld 轉送規則失效）
- **Web / API / Postgres**：由 Docker 於 `172.18.0.0/16` 網段內動態配發，容器間持續透過 Docker 內嵌 DNS 服務名稱 (`web`, `api`, `postgres`) 進行互連。
- **Nginx 動態解析上游**：`nginx.conf` 透過 `resolver 127.0.0.11`（Docker 內嵌 DNS）於請求時解析 `api` / `web`，因此單獨重建 `api` 或 `web` 容器後即使 IP 改變也不需重啟 Nginx。

```text
Host Network (Debian 13)
└── Docker Network: adventure-platform_default (Subnet: 172.18.0.0/16)
    ├── nginx    ──► 固定 IP: 172.18.0.10 (宿主機發布 Ports: 80, 443)
    ├── web      ──► 動態 IP (內部埠: 5173)
    ├── api      ──► 動態 IP (內部埠: 3000)
    └── postgres ──► 動態 IP (內部埠: 5432)
```

##### 宿主機防火牆 (firewalld) 與 StrictForwardPorts 注意事項

宿主機防火牆規則由管理者自行維護，Docker 與專案配置不得自動變更：
- 若宿主機啟用 `firewalld` 且設定 `StrictForwardPorts=yes`，轉送至 Nginx 的規則應導向固定 IP `172.18.0.10:80` 與 `172.18.0.10:443`。
- 為確保 Docker 橋接網段內部通訊及容器連外順暢，管理者可將自訂網段加入 `trusted` 區域：
  ```bash
  sudo firewall-cmd --permanent --zone=trusted --add-source=172.18.0.0/16
  sudo firewall-cmd --reload
  ```
- 容器重建後確認 Nginx 固定 IP 指令：
  ```bash
  docker inspect adventure-nginx --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'
  ```

#### (2) 本機原始碼開發模式 (`pnpm` Source-Level Dev)

若不透過 Docker 執行整套服務，而是於本機執行 `pnpm` 指令開發時：

| 連接埠 (Port) | 協定 | 啟動指令 | 預設網址 | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **5173** | TCP (HTTP) | `pnpm dev:web` | `http://localhost:5173` | Vite 前端開發伺服器（支援 HMR 熱重載與代理轉發） |
| **3000** | TCP (HTTP/WS) | `pnpm dev:api` | `http://localhost:3000` | NestJS 後端開發伺服器（可透過 `PORT` 環境變數自訂） |
| **5432** | TCP (PostgreSQL) | `docker compose up -d postgres` | `localhost:5432` | 本機開發用 PostgreSQL 容器實例 |

### 5. 服務存取與主要 API 端點

| 服務 / API | 網址 | 說明 |
| :--- | :--- | :--- |
| **Web 前端 (PWA)** | [https://localhost](https://localhost) | 前端入口（未登入自動導向 `/login`） |
| **Health API** | [https://localhost/api/v1/health](https://localhost/api/v1/health) | 健康檢查，回傳 `{"status":"ok"}` |
| **Auth API** | [https://localhost/api/v1/auth/login](https://localhost/api/v1/auth/login) | 登入端點（簽發 JWT） |
| **Admin API** | [https://localhost/api/v1/admin/summary](https://localhost/api/v1/admin/summary) | 管理員保護端點（僅限 ADMIN，USER 存取回傳 403） |
| **Ranks API** | [https://localhost/api/v1/ranks](https://localhost/api/v1/ranks) | 查詢所有冒險者階級（F 到 S） |
| **Adventurers API** | [https://localhost/api/v1/adventurers](https://localhost/api/v1/adventurers) | 查詢冒險者檔案；建立 (`POST`) 僅限 ADMIN |
| **Credentials API** | [https://localhost/api/v1/credentials](https://localhost/api/v1/credentials) | 查詢冒險者憑證；登記 (`POST`) 僅限 ADMIN |
| **Quests API** | [https://localhost/api/v1/quests](https://localhost/api/v1/quests) | 查詢公會可用任務清單 |
| **PlayerQuests API** | `POST https://localhost/api/v1/player-quests` | 接取任務（綁定冒險者憑證與任務）。本列起至 Battles API 的寫入端點僅限 STAFF、ADMIN |
| **Claim Reward API** | `POST https://localhost/api/v1/player-quests/:id/claim` | 領取任務達成報酬（原子寫入 Gold / Merit） |
| **Guild Scan API** | `POST https://localhost/api/v1/guild/scan` | 公會終端掃描冒險者憑證，回傳角色狀態與任務 |
| **Shops API** | `POST https://localhost/api/v1/shops/:shopId/scan`、`/purchases` | 商店掃卡（可購清單與鎖定原因）與購買交易；`GET /shops/:shopId` 取得商品目錄 |
| **Inventory API** | `GET https://localhost/api/v1/players/:playerId/inventory` | 冒險者背包與裝備；`POST /players/:playerId/equipment` 裝備、`DELETE /players/:playerId/equipment/:slot` 卸下 |
| **Bosses API** | [https://localhost/api/v1/bosses](https://localhost/api/v1/bosses) | 查詢世界 Boss 列表與數值 |
| **Battles API** | `POST https://localhost/api/v1/battles` | 發起 Boss 戰鬥與攻擊結算 (`/attack`)；行動卡刷入 `POST /battles/:id/cards` |
| **Action Cards API** | [https://localhost/api/v1/action-cards](https://localhost/api/v1/action-cards) | 查詢啟用中的行動卡（手動模式與列印 QR 使用） |
| **Status Scan API** | `POST https://localhost/api/v1/status/scan` | `/status` 終端與狀態查詢崗位刷卡：等級進度、已學會與未解鎖技能、NEW 標記（公開；同時推送 `status.viewed`） |
| **Stage API** | [https://localhost/api/v1/stage](https://localhost/api/v1/stage) | 查詢工作人員目前崗位（公開）；`PUT /stage` 切換崗位並推送 `stage.changed`（僅限 STAFF、ADMIN） |
| **Events WebSocket**| `wss://localhost/ws` | 即時通訊雙向閘道（`player.*`, `battle.*`, `quest.*`, `shop.*`, `equipment.*`, `card.*`, `skill.*`, `adventurer.level_up`, `stage.changed`, `status.viewed`） |
| **PostgreSQL** | 內部 `postgres:5432` | 資料庫連接埠（Docker 整合環境僅限內部存取；本機原始碼模式可按需暴露） |

> **瀏覽器自簽憑證警告說明**：本地自簽憑證未經公認 CA 簽署，首次進入瀏覽器會顯示安全警告（如「您的連線不是私人連線」），請點選 **進階** ──► **繼續前往 localhost（不安全）** 即可正常使用。

### 6. 行動裝置與區域網路 (LAN) PWA 測試

PWA 功能（Web App Manifest 安裝、Service Worker 快取）嚴格要求在安全上下文（Secure Context, HTTPS 或 localhost）下執行。若欲於同 Wi-Fi 網段之手機或平板測試：
1. 查詢開發主機區域網路 IP（例如 `192.168.1.100`）。
2. 執行包含該 IP 之憑證產生腳本：
   ```bash
   ./infrastructure/nginx/generate-cert.sh 192.168.1.100
   ```
3. 啟動服務棧：`docker compose up -d`
4. 於手機瀏覽器開啟 `https://192.168.1.100`，接受自簽憑證警告。
5. 驗證 Web App Manifest 與 Service Worker 均於 HTTPS 下成功註冊，無 Mixed Content 錯誤。

> **安全性注意事項**：此自簽憑證僅供本地開發與區域網路驗證使用，嚴禁於生產環境部署。產生的私鑰已加入 `.gitignore` 排除清單，不得提交至版本控制庫。

## Development Seed Data

執行 `prisma db seed` 將建立以下預設資料：
- **預設階級**：Rank F、E、D、C、B、A、S（具有升階門檻與排序）。
- **測試管理員**：`username: admin`, 密碼: `admin123`（角色: `ADMIN`）── 登入後進入 `/admin`。
- **測試工作人員**：`username: staff`, 密碼: `staff123`（角色: `STAFF`）── 登入後進入 `/staff`。
- **測試冒險者**：`username: adventurer`, 密碼: `adventurer123`（角色: `USER`）── 登入後進入 `/user`。
- **冒險者個人檔案**：名稱 `Rookie Adventurer`，預設階級為 `Rank F`。
- **Demo 冒險者**：`aria`（Aria）與 `leon`（Leon），密碼同為 `adventurer123`（角色: `USER`）。
- **測試憑證**：`ADV-DEV-001-QR` (`QRCODE`) 與 `ADV-DEV-001-NFC` (`NFC`) 屬於 Rookie Adventurer；`cred-demo-001` 屬於 Aria、`cred-demo-002` 屬於 Leon（皆為 `QRCODE`）。
- **世界 Boss**：`boss-01` Black Knight（HP 150）。
- **任務**：`First Steps in the Guild`（`quest-starter-001`，50 功績）與 `討伐黑騎士 (Defeat the Black Knight)`（`quest-defeat-black-knight`，目標 `boss-01`，報酬 200 Gold / 20 功績）。
- **初始獎勵骨架**：`Guild Welcome Badge`（`virtual_item` 類型，演示擴充點）。

> ⚠️ 上述帳號與憑證僅供本地開發與測試使用。

---

## Source-Level Local Development

進行原始碼日常開發時，可直接透過 `pnpm` 搭配本機或容器資料庫：

### 1. 安裝所有相依套件

```bash
pnpm install
```

### 2. 啟動本機 PostgreSQL

```bash
docker compose up -d postgres
```

### 3. 資料庫遷移與 Seed

```bash
# 產生 Prisma Client
pnpm prisma:generate

# 執行資料庫遷移
pnpm --filter @adventure-platform/api db:migrate

# 寫入預設階級與開發測試資料
pnpm --filter @adventure-platform/api db:seed
```

### 4. 啟動個別開發服務

- **前端開發模式 (Vite Dev Server)**：
  ```bash
  pnpm dev:web
  ```

- **後端開發模式 (NestJS Watch)**：
  ```bash
  pnpm dev:api
  ```

### 5. 執行測試與建置

- **執行測試**：
  ```bash
  pnpm test
  ```

- **全專案建置**：
  ```bash
  pnpm build
  ```

---

## Documentation

- 領域模型與階級憑證架構：[docs/architecture/domain-model.md](docs/architecture/domain-model.md)
- 系統架構詳細說明：[docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)
- Shop + Equipment 需求規格：[docs/specs/shop-equipment.md](docs/specs/shop-equipment.md)
- Action Card Battle 需求規格：[docs/specs/action-card-battle.md](docs/specs/action-card-battle.md)
- Adventurer Progression 需求規格：[docs/specs/adventurer-progression.md](docs/specs/adventurer-progression.md)
- Staff Console 需求規格：[docs/specs/staff-console.md](docs/specs/staff-console.md)
- 本地開發完整指引：[docs/development/getting-started.md](docs/development/getting-started.md)
- 依賴與版本策略規範：[docs/development/dependency-policy.md](docs/development/dependency-policy.md)
- Agent 開發規範：[AGENTS.md](AGENTS.md)
