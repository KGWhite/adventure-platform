# Adventure Platform Web (`@adventure-platform/web`)

Adventure Platform 的單一前端應用程式，支援行動瀏覽器、桌面瀏覽器與安裝型 PWA（Progressive Web App）。

## 技術架構

- **Framework**: React 19 + TypeScript + Vite
- **UI Component System**: Material UI (`@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`)
- **PWA**: `vite-plugin-pwa`
- **Linting**: Oxlint

> **注意**：本專案採用 MUI 作為唯一 UI 元件庫。嚴格禁止引入 Ant Design、Chakra UI、Mantine、Bootstrap、Tailwind UI 等其他相互競爭之元件庫。

## 專案結構

```text
src/
├── theme/                        # MUI 主題系統 (公會羊皮紙明亮淺色主題、放大排版字級)
│   ├── index.ts                  # 主題工廠 (createAppTheme)、羊皮紙元件預設值與陰影/邊框覆寫
│   ├── palette.ts                # 公會羊皮紙調色盤 (象牙底 #f8f4eb、赤紅 #be123c、金 #b45309、暖木炭字 #2d241e)
│   └── typography.ts             # 放大版排版系統 (h1 2.5rem, body1 1.0625rem, 強化手持與桌面可讀性)
├── layouts/                      # 體驗版面骨架
│   ├── index.ts                  # 版面匯出
│   ├── UserLayout.tsx            # 冒險者行動優先版面 (AppBar + BottomNavigation)
│   └── AdminLayout.tsx           # 公會管理員響應式版面 (AppBar + 摺疊/常駐 Drawer)
├── components/
│   ├── admin/                    # 公會管理員專用元件
│   │   ├── index.ts              # 匯出管理員元件
│   │   ├── AdminDashboard.tsx    # 公會核心數據總覽 (真實指標卡片)
│   │   ├── AdminAdventurersView.tsx # 冒險者名冊 (MUI Table、詳細彈窗、登記)
│   │   ├── AdminRanksView.tsx    # 階級順位與門檻配置 (資料庫驅動)
│   │   ├── AdminCredentialsView.tsx # 通用憑證管理 (QRCODE/RFID/NFC 登記)
│   │   └── AdminComingSoonView.tsx  # 整備中功能通用佔位元件
│   ├── adventurer/               # 冒險者專用元件
│   │   ├── index.ts              # 匯出冒險者元件
│   │   ├── RankBadge.tsx         # 資料驅動階級標記 (支援不同階級與外觀)
│   │   ├── MeritProgress.tsx     # 公會功績與晉升進度條 (安全處理門檻與上限)
│   │   └── CredentialStatusCard.tsx # 資格證與已綁定憑證卡片
│   ├── common/                   # 共享版面原語
│   │   ├── index.ts              # 匯出原語
│   │   ├── PageContainer.tsx     # 響應式頁面容器
│   │   ├── PageHeader.tsx        # 頁面標題與操作區
│   │   ├── LoadingState.tsx      # 載入中狀態
│   │   ├── EmptyState.tsx        # 無資料狀態
│   │   └── ErrorState.tsx        # 錯誤警示狀態
│   ├── LoginView.tsx             # 身分驗證頁面
│   ├── AdventurerView.tsx        # 冒險者儀表板 (/user)
│   ├── AdventurerProfileView.tsx # 冒險者個人檔案 (/user/profile)
│   ├── AdventurerQuestsView.tsx  # 公會委託告示欄 (/user/quests，Coming soon)
│   ├── AdventurerRewardsView.tsx # 公會獎勵兌換所 (/user/rewards，Coming soon)
│   └── AdminView.tsx             # 公會管理控制台進入點與分頁切換 (/admin)
├── context/
│   └── AuthContext.tsx           # 認證與使用者狀態 Context
├── router/
│   └── Router.tsx                # 路由與角色守衛 (RouteGuard)
├── types/
│   └── auth.ts                   # 型別定義
├── App.tsx                       # 應用程式進入點與子路徑路由
└── main.tsx                      # React DOM 渲染進入點
```

## 應用程式路由一覽

### 冒險者體驗路由 (Adventurer Mobile-First Routes)

| 路徑 | 說明 | 狀態 |
| :--- | :--- | :--- |
| `/user` | 冒險者公會總覽儀表板（稱號、階級、功績進度、資格證、公告） | 已完成 (Phase 2) |
| `/user/profile` | 冒險者個人詳細檔案（帳號 ID、階級門檻、綁定憑證、登出） | 已完成 (Phase 2) |
| `/user/quests` | 公會委託告示欄（任務清單） | 整備中 (Coming soon) |
| `/user/rewards` | 公會獎勵兌換所（功績獎勵） | 整備中 (Coming soon) |

### 管理員體驗路由 (Guild Admin Management Routes)

| 路徑 / Tab | 說明 | 狀態 |
| :--- | :--- | :--- |
| `/admin` (`dashboard`) | 公會核心數據總覽（冒險者、階級、憑證與註冊人數卡片） | 已完成 (Phase 3) |
| `/admin/adventurers` | 冒險者名冊管理（真實 API 資料表格、詳細檢視、登記新冒險者） | 已完成 (Phase 3) |
| `/admin/ranks` | 階級體系配置（資料庫驅動階梯順位與門檻清單） | 已完成 (Phase 3) |
| `/admin/credentials` | 實體／數位憑證管理（QR Code、RFID、NFC 通用抽象登記與清單） | 已完成 (Phase 3) |
| `/admin/quests` | 任務系統管理 | 整備中 (Coming soon) |
| `/admin/promotions` | 階級晉升審核 | 整備中 (Coming soon) |
| `/admin/rewards` | 榮譽獎勵庫發放管理 | 整備中 (Coming soon) |

## 開發指令

```bash
# 啟動 Vite 開發伺服器 (http://localhost:5173)
pnpm dev

# 專案建置 (型別檢查與 Vite 打包)
pnpm build

# 程式碼檢查
pnpm lint

# 預覽打包產物
pnpm preview
```
