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

### 目前實作進度（Adventurer Guild MVP 骨架）
- **Phase 1**：技術基底建立完成（React + Vite + PWA、NestJS Modular Monolith、PostgreSQL 16、Prisma、pnpm workspace、Docker Compose）。
- **Phase 2**：核心身分與冒險者領域模型完成（User、AdventurerProfile、Rank、Credential，包含資料庫遷移與開發 Seed 資料）。
- **Phase 3**：身分驗證與角色化前端版面完成（JWT Token 認證、角色權限守衛、/login、/user 冒險者儀表板、/admin 公會管理控制台）。
- **Phase 4**：MVP 遊戲領域骨架完成（Quest、QuestCompletion、MeritLedger、PromotionRequest、Reward，建立資料庫遷移與完整驗證）。
- **Local Feedback (Phase 1)**：前端通用即時視覺回饋模型建立完成（`FeedbackEvent`），提供操作完成後之本機即時反饋基礎模型。
- **Local Feedback (Phase 2)**：遊戲回饋覆蓋層元件完成（`GameFeedbackOverlay`），提供兼具行動優先、PWA 與桌面端之慶祝動畫、標題、副標題與功績/獎勵視覺高亮效果。
- **Local Feedback (Phase 3)**：實作首個輕量級任務完成動效（`quest-complete`），建立彈窗出現、徽章彈跳放大、標題淡入、功績數值彈出與自動/手動關閉之階段式動畫時序。
- **Local Feedback (Phase 4)**：完成後端 API 與本機回饋串接（Quests API + 領域回應轉換器 `questCompletionToFeedbackEvent`），落實僅於後端確認成功後觸發動效、失敗僅顯示錯誤 UI 之規範，支援 `prefers-reduced-motion` 無障礙設計，並預留未來跨裝置事件接入點。

---

## Technical Stack

| 層級 | 技術選型 | 說明 |
| :--- | :--- | :--- |
| **Gateway / Proxy**| Nginx 1.27 (Alpine) | 單一 HTTPS 入口（Port 443），終止 TLS 並分流 `/` (Web) 與 `/api` (API)，提供 PWA Secure Context |
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

### 1. 角色定義與映射 (Role Mapping)
- `Role.USER` = **冒險者 (Adventurer)**：登入後導向 `/user` 儀表板，檢視稱號、目前階級、公會功績 (0) 與資格證狀態。
- `Role.ADMIN` = **公會管理者 (Guild Administrator)**：登入後導向 `/admin` 控制台，檢視公會總覽、冒險者名冊、階級體系與憑證發行狀態。
- 後端角色名稱嚴格保持 `USER` 與 `ADMIN`，遊戲主題故事標籤僅於前端 UI 層呈現。

### 2. 身分驗證流程 (Authentication Flow)
1. 前端向 `POST /api/v1/auth/login` 提交帳號密碼。
2. 後端透過 `bcryptjs` 驗證 `passwordHash`，成功則簽發 JWT accessToken。
3. 取得 Token 後儲存於瀏覽器，後續請求透過 HTTP Header `Authorization: Bearer <accessToken>` 攜帶。
4. 前端透過 `GET /api/v1/auth/me` 取得當前使用者角色與完整冒險者檔案。

### 3. 安全性與權限保護 (Authorization & Protection)
- **後端防護**：管理員專用 API（如 `GET /api/v1/admin/summary`）受 `RolesGuard` 與 `@Roles(Role.ADMIN)` 保護；`USER` 請求將直接遭到拒絕並回傳 `403 Forbidden`。
- **前端路由守衛**：
  - 未登入使用者訪問 `/user` 或 `/admin` 自動跳轉至 `/login`。
  - 一般冒險者（`USER`）無法進入 `/admin`，會被自動重導向回 `/user`。
  - 已登入使用者訪問 `/login` 或根路徑 `/` 自動轉向其對應的角色首頁。

---

## Web Layouts & Shared UI Foundation

| 路由路徑 | 存取權限 | 頁面功能與規格說明 |
| :--- | :--- | :--- |
| `/login` | 公開 | 公會身分驗證登入表單，附開發測試帳號一鍵代入按鈕 |
| `/user` | `USER` | 行動優先冒險者儀表板：稱號、階級、功績晉升進度條、資格證卡片、公會公告事項 |
| `/user/profile` | `USER` | 冒險者個人詳細檔案：帳號 ID、階級詳細門檻、綁定憑證清單與登出功能 |
| `/user/quests` | `USER` | 公會委託告示欄：任務委託清單（Coming soon 整備中） |
| `/user/rewards` | `USER` | 公會獎勵兌換所：功績兌換獎勵（Coming soon 整備中） |
| `/admin` | `ADMIN` | 公會管理控制台：總覽數據卡片、冒險者名冊、階級門檻清單、憑證管理，未開放功能清楚標註 Coming soon |

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
   - **API 成功確認與回饋觸發流程 (Phase 4)**：
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
     - **當前階段明確未引入且未實作之技術**：
       - ❌ WebSocket
       - ❌ 跨裝置即時動畫同步 (Cross-device real-time animation)
       - ❌ 大螢幕/投影看板事件展示 (Large-screen display)
       - ❌ Redis / MQTT / SSE / Event Broker
       - ❌ 微服務拆分

---


## MVP Game Domain Skeleton & Intended Flow (Phase 4)


Phase 4 完成了核心遊戲領域模型的資料庫與領域骨架，為後續流程打下最小且可擴充的基礎，本階段不引入完整遊戲工作流實作。

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
| **`Quest`** | `id`, `title`, `description`, `requiredRankId`, `meritReward`, `enabled` | 任務基礎骨架。不建立複雜任務類型、遞迴、前置依賴、計時器、地圖或多人協同行為。 |
| **`QuestCompletion`** | `id`, `questId`, `adventurerId`, `status`, `completedAt`, `approvedAt`, `approvedBy` | 任務完成紀錄與審核狀態（`PENDING` / `APPROVED` / `REJECTED`），為後續驗證流程預留欄位，本階段不實作完整審查運算。 |
| **`MeritLedger`** | `id`, `adventurerId`, `amount`, `reason`, `sourceType`, `sourceId`, `createdAt` | **功績帳本模式**：功績決不單獨以可變數值存在於個人檔案，所有變動均寫入不可變帳本，確保公會功績每筆增減皆可追溯與稽核。 |
| **`PromotionRequest`** | `id`, `adventurerId`, `fromRankId`, `toRankId`, `status`, `reviewedBy`, `reviewedAt` | **嚴格禁止自動升階**：功績累積達標僅代表「具備晉升資格」，必須經由申請並由公會管理員審查核准後方能升階。 |
| **`Reward`** | `id`, `name`, `description`, `type`, `config`, `enabled` | **可擴充獎勵骨架**：保留未來擴充各類型獎勵（`virtual_item`, `physical_reward`, `animation`, `device_action`, `custom`）之進入點。**本階段僅保留架構擴充點，未實作獎勵派發或動畫播放邏輯**。 |

### 3. 故事獨立性 (Story Independence)
後端核心模型與領域邏輯保持通用化（`Credential`, `Rank`, `Quest`, `Reward`），不將「冒險者公會」的故事文本或專有名詞深度硬編碼至後端業務邏輯中，以確保未來各類遊戲主題（如科幻、企業訓練、闖關活動）均可直接復用平台底層。

---

## Directory Overview

```text
adventure-platform/
├── .env.example                  # 環境變數範本
├── AGENT.md                      # 開發規範與治理準則
├── README.md                     # 專案首頁與快速上手指南
├── compose.yaml                  # Docker Compose 服務定義 (web, api, postgres)
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
│   │       ├── admin/            # 管理員保護模組 (RolesGuard: ADMIN)
│   │       ├── adventurers/      # 冒險者個人檔案模組
│   │       ├── auth/             # JWT 認證、守衛與裝飾器模組
│   │       ├── credentials/      # 冒險者憑證模組 (QRCODE, RFID, NFC)
│   │       ├── health/           # 健康檢查端點 GET /api/v1/health
│   │       ├── prisma/           # PrismaService / PrismaModule
│   │       ├── quests/           # 任務查詢與完成回報模組
│   │       ├── ranks/            # 階級模組 (F..S)
│   │       ├── users/            # 使用者與身分模組 (USER, ADMIN)
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── web/                      # React + TypeScript + Vite + PWA 前端
│       ├── Dockerfile
│       ├── public/               # PWA Icons 與靜態資產
│       ├── src/
│       │   ├── components/
│       │   │   ├── feedback/            # 遊戲即時回饋覆蓋層 (GameFeedbackOverlay)
│       │   │   ├── AdminView.tsx        # 公會管理員控制台版面
│       │   │   ├── AdventurerView.tsx   # 行動優先冒險者個人儀表板
│       │   │   └── LoginView.tsx        # 公會身分驗證登入介面
│       │   ├── context/
│       │   │   └── AuthContext.tsx      # 全域身分狀態與 Token 管理
│       │   ├── router/
│       │   │   └── Router.tsx           # 路由提供者與權限跳轉守衛
│       │   ├── types/
│       │   │   ├── auth.ts              # 前端身分驗證與冒險者共用型別
│       │   │   ├── feedback.ts          # 前端通用即時視覺回饋模型 (FeedbackEvent)
│       │   │   └── index.ts             # 型別匯出入口
│       │   ├── App.tsx                  # 應用程式進入點與路由分發
│       │   ├── App.css
│       │   └── index.css
│       └── vite.config.ts        # Vite 與 VitePWA 外掛配置
├── packages/
│   └── shared/                   # 未來共用型別與工具函式庫
├── games/
│   └── kids-adventure/           # 遊戲專案配置（首個 MVP 落地案例：兒童冒險與獎勵系統）
├── infrastructure/
│   ├── database/migrations/      # 資料庫歷史腳本
│   └── nginx/                    # Nginx 反向代理配置與 TLS 憑證目錄
│       ├── nginx.conf            # Nginx 設定檔 (HTTPS 443, / 與 /api 路由)
│       ├── certs/                # TLS 憑證與金鑰目錄 (.gitkeep，不提交金鑰)
│       └── generate-cert.sh      # 開發用自簽 TLS 憑證產生腳本 (支援 SAN)
└── docs/
    ├── game-design.md            # 實體 RPG 遊戲平台設計規格書 (World Node, Actor Mode, 雙軌資源)
    ├── architecture/             # 架構與領域模型技術文件
    │   ├── domain-model.md
    │   └── system-architecture.md
    └── development/              # 開發流程指南
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
4. `nginx`（單一 HTTPS 入口，對外暴露 443 埠，將 `/` 導向 `web:5173`，將 `/api/` 導向 `api:3000`）

### 4. 服務存取與主要 API 端點

| 服務 / API | 網址 | 說明 |
| :--- | :--- | :--- |
| **Web 前端 (PWA)** | [https://localhost](https://localhost) | 前端入口（未登入自動導向 `/login`） |
| **Health API** | [https://localhost/api/v1/health](https://localhost/api/v1/health) | 健康檢查，回傳 `{"status":"ok"}` |
| **Auth API** | [https://localhost/api/v1/auth/login](https://localhost/api/v1/auth/login) | 登入端點（簽發 JWT） |
| **Admin API** | [https://localhost/api/v1/admin/summary](https://localhost/api/v1/admin/summary) | 管理員保護端點（僅限 ADMIN，USER 存取回傳 403） |
| **Ranks API** | [https://localhost/api/v1/ranks](https://localhost/api/v1/ranks) | 查詢所有冒險者階級（F 到 S） |
| **Adventurers API** | [https://localhost/api/v1/adventurers](https://localhost/api/v1/adventurers) | 查詢與建立冒險者檔案 |
| **Credentials API** | [https://localhost/api/v1/credentials](https://localhost/api/v1/credentials) | 登記與查詢冒險者憑證 |
| **PostgreSQL** | `localhost:5432` | 資料庫連接埠（供本機開發與遷移工具使用） |

> **瀏覽器自簽憑證警告說明**：本地自簽憑證未經公認 CA 簽署，首次進入瀏覽器會顯示安全警告（如「您的連線不是私人連線」），請點選 **進階** ──► **繼續前往 localhost（不安全）** 即可正常使用。

### 5. 行動裝置與區域網路 (LAN) PWA 測試

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
- **測試冒險者**：`username: adventurer`, 密碼: `adventurer123`（角色: `USER`）── 登入後進入 `/user`。
- **冒險者個人檔案**：名稱 `Rookie Adventurer`，預設階級為 `Rank F`。
- **測試憑證**：`ADV-DEV-001-QR` (`QRCODE`) 與 `ADV-DEV-001-NFC` (`NFC`)。
- **初始任務骨架**：`First Steps in the Guild`（Rank F 資格，完成獎勵 50 功績）。
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

- 領域模型與階級憑證架構：[docs/architecture/domain-model.md](file:///home/abUC/adventure-platform/docs/architecture/domain-model.md)
- 系統架構詳細說明：[docs/architecture/system-architecture.md](file:///home/abUC/adventure-platform/docs/architecture/system-architecture.md)
- 本地開發完整指引：[docs/development/getting-started.md](file:///home/abUC/adventure-platform/docs/development/getting-started.md)
- 依賴與版本策略規範：[docs/development/dependency-policy.md](file:///home/abUC/adventure-platform/docs/development/dependency-policy.md)
- Agent 開發規範：[AGENT.md](file:///home/abUC/adventure-platform/AGENT.md)
