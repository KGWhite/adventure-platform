# Staff Console Vertical Slice 需求規格

> **狀態**：規格草案（2026-10-26），決策 D1–D8 已定案，待實作。實作完成後需同步更新 [README.md](../../README.md)、[docs/game-design.md](../game-design.md)、[docs/architecture/domain-model.md](../architecture/domain-model.md)、[docs/architecture/system-architecture.md](../architecture/system-architecture.md) 與 [docs/development/getting-started.md](../development/getting-started.md)。

## 0. 目標與範圍

**現場配置（第一版）**：一位工作人員、一支手機、一個大螢幕。工作人員用手機登入**總控台**，切換扮演公會櫃台、商店店員、Boss 看守者與狀態查詢；手機切到哪個崗位，大螢幕就同步切到那個崗位的畫面。小朋友沒有手機，只帶冒險者 ID 卡，在工作人員的手機上刷卡就代表「進入」該崗位。

**要驗證的兩件事**

1. **一人一機玩得起來**：一位工作人員只用一支手機，就能完成公會接任務 → 打王 → 回公會領獎 → 商店購買 → 查看等級的完整循環，中途不用換網址或換裝置。
2. **兩個畫面始終同步**：手機切換崗位或刷卡後，大螢幕立即切到對應畫面並顯示同一位冒險者；大螢幕重新整理或斷線重連後，仍回到目前崗位。

**In scope**

- `STAFF` 角色與開發用工作人員帳號；工作人員操作 API 需登入。
- 總控台 `/staff`：崗位切換列，各崗位重用既有的操作畫面。
- 跟隨模式大螢幕 `/display`：依目前崗位切換大畫面，未選崗位時顯示待機畫面。
- 伺服器記錄目前崗位並推送 `stage.changed`。
- 公會拆出手機操作畫面，新增公會大螢幕 `/display/guild-01`。
- 狀態查詢成為總控台的一個崗位，大螢幕顯示刷卡結果。

**Out of scope（後續切片）**

- 多位工作人員、多支手機同時扮演不同崗位；多組「手機 + 大螢幕」。
- 崗位互動的「下一位」按鈕與閒置逾時統一規則（各畫面沿用現有行為）。
- 工作人員操作稽核紀錄（誰在何時發放了什麼）。
- 為「冒險者進入崗位」建立通用的資料表或領域模型。
- 移除既有網址（`/guild`、`/status`、`/actor/*`、`/display/<nodeId>`）。
- 冒險者 `/user` 儀表板調整（保留現狀）。

## 1. 決策

| # | 決策 | 結論 |
|---|---|---|
| D1 | 第一版人員配置 | **已定案**：一位工作人員、一支手機扮演所有崗位，搭配一個跟隨手機切換的大螢幕 |
| D2 | 工作人員驗證 | **已定案**：新增 `STAFF` 角色，以帳號密碼登入。`ADMIN` 也能使用總控台；`STAFF` 不能進入 `/admin` |
| D3 | 崗位與帳號的關係 | **已定案**：帳號不綁定崗位，登入後在總控台隨時切換 |
| D4 | 同步方式 | **已定案**：伺服器記錄目前崗位（記憶體），手機切換時寫入並推送 `stage.changed`；大螢幕載入時先查詢目前崗位，之後依事件切換 |
| D5 | 大螢幕待機畫面 | **已定案**：未選崗位時顯示「冒險者世界」待機畫面 |
| D6 | 狀態查詢 | **已定案**：成為總控台的一個崗位；既有 `/status` 自助終端保留並維持公開 |
| D7 | 統一測試入口 | **已定案**：總控台本身就是統一測試入口（各崗位內建測試卡按鈕），不另做 `/dev` |
| D8 | 既有網址 | **已定案**：保留 `/guild`、`/actor/*`、`/display/<nodeId>`，但工作人員頁面改為需要登入；`/status` 與所有 `/display/*` 維持公開 |

## 2. 崗位

| 崗位 | `nodeId` | 手機（總控台內） | 大螢幕 |
|---|---|---|---|
| 🏛 公會 | `guild-01` | 刷卡、冒險者狀態、接任務、領獎、換裝 | **新增**：任務告示板、目前冒險者、接任務／完成／升級演出 |
| 🏪 商店 | `shop-01` | 沿用 `ShopActorView` | 沿用 `ShopDisplayView` |
| ⚔ Boss 關 | `boss-01` | 沿用 `BossActorView`（按鈕攻擊與行動卡） | 沿用 `BossDisplayView` |
| 🛡 狀態查詢 | `status-01` | 刷卡、顯示精簡的等級摘要 | **新增**：沿用 `/status` 的等級、技能卡牆與 LEVEL UP 演出 |

- 崗位清單以前端與後端共用的常數定義，本切片不建資料表與後台。
- `nodeId` 同時是事件的 `displayId`，沿用現有的事件路由。

## 3. 使用者流程

### 3.1 工作人員登入

1. 工作人員開啟 `/login`，以 `STAFF` 帳號登入，自動導向 `/staff`；`ADMIN` 登入後仍導向 `/admin`，可手動前往 `/staff`。
2. 未登入就開啟 `/staff`、`/guild` 或 `/actor/*` 時導向 `/login`，登入後回到原頁。
3. Demo 帳號：`staff`（密碼記錄於 `apps/api/prisma/seed.ts`，僅限開發）。

### 3.2 切換崗位

1. 總控台上方是崗位切換列（公會｜商店｜Boss｜狀態），目前崗位高亮；第一次進入時未選崗位，顯示「請選擇崗位」。
2. 點選崗位 → 呼叫 `PUT /stage` → 手機下方換成該崗位的操作畫面。
3. 伺服器推送 `stage.changed` → 大螢幕切到該崗位的待機畫面。
4. 切換崗位時，手機上前一個崗位的冒險者畫面清空；進行中的 Boss 戰不會被中止，切回 Boss 關時沿用伺服器上的戰鬥狀態。
5. 總控台右上角提供「開啟大螢幕」連結（`/display`）與登出。

### 3.3 冒險者進入崗位

1. 冒險者在手機上刷卡（相機、Android Chrome NFC 或測試卡按鈕）→ 沿用各崗位既有的刷卡 API，`displayId` 帶目前崗位的 `nodeId`。
2. 伺服器對該 `nodeId` 推送既有事件（`player.scanned`、`battle.*`、`shop.purchase_completed`、`quest.*`、`adventurer.level_up`），大螢幕已訂閱該 `nodeId`，所以同時顯示。
3. 狀態查詢崗位另外推送 `status.viewed`（§6），讓大螢幕顯示等級與技能卡牆。

### 3.4 大螢幕

1. 開啟 `/display`（不需登入）→ 呼叫 `GET /stage` 取得目前崗位 → 訂閱該 `nodeId` 的事件並顯示對應大畫面；`nodeId` 為 `null` 時顯示待機畫面（D5）。
2. 收到 `stage.changed` → 改訂閱新的 `nodeId` 並切換畫面。
3. 斷線重連後重新呼叫 `GET /stage`，以伺服器狀態為準。

## 4. 資料模型

```prisma
enum Role {
  USER
  STAFF
  ADMIN
}
```

- Migration：`Role` 新增 `STAFF`。
- Seed：新增開發用帳號 `staff`（`STAFF`），不建立冒險者檔案。
- 目前崗位存在 API 記憶體（`StageService`），API 重啟後回到未選崗位；不建資料表。

## 5. API

### 5.1 `GET /api/v1/stage`

公開，供大螢幕查詢。

```json
// 200
{ "nodeId": "shop-01", "updatedAt": "2026-10-26T10:00:00.000Z" }
```

未選崗位時 `nodeId` 為 `null`。

### 5.2 `PUT /api/v1/stage`

需 `STAFF` 或 `ADMIN`。

```json
// request
{ "nodeId": "guild-01" }
```

- 回應同 §5.1，並推送 `stage.changed`。
- `nodeId` 不在崗位清單內回 400；`null` 表示回到待機畫面。
- 與目前崗位相同時不重複推送事件。

### 5.3 既有端點權限調整

以下會改變遊戲狀態的端點改為需要 `STAFF` 或 `ADMIN`（`JwtAuthGuard` + `RolesGuard`）：

- `POST /battles/scan`、`POST /battles`、`POST /battles/:id/attack`、`POST /battles/:id/cards`
- `POST /shops/:shopId/scan`、`POST /shops/:shopId/purchases`
- `POST /guild/scan`、`POST /player-quests`、`POST /player-quests/:id/claim`
- `POST /players/:playerId/equipment`

維持公開：

- `POST /status/scan`（`/status` 自助終端，D6）
- 所有 `GET` 查詢端點、`/events/*` 與 WebSocket（大螢幕唯讀）

### 5.4 `POST /api/v1/status/scan` 調整

- 除了既有的 `player.scanned`，另外對同一個 `displayId` 推送 `status.viewed`（§6），內容為本次回應。
- `/status` 自助終端也使用 `status-01`，所以小朋友自助刷卡時，跟隨模式大螢幕若停在狀態查詢崗位也會同步顯示。

## 6. 即時事件

```ts
| 'stage.changed'
| 'status.viewed'

interface StageChangedData {
  nodeId: string | null;
  previousNodeId: string | null;
}

// status.viewed 的 data 即 POST /status/scan 的回應
// （player、level、skills、equipment、leveledUpSinceLastSeen）
```

- `stage.changed` 以 `displayId: 'all'` 推送，所有大螢幕都會收到；`/display/<nodeId>` 固定畫面忽略此事件。
- `status.viewed` 推送到請求的 `displayId`。

## 7. 前端

### 7.1 路由

| 路由 | 權限 | 說明 |
|---|---|---|
| `/staff` | STAFF、ADMIN | 總控台 |
| `/display` | 公開 | 跟隨模式大螢幕 |
| `/display/guild-01` | 公開 | 公會大螢幕（固定） |
| `/display/status-01` | 公開 | 狀態查詢大螢幕（固定） |
| `/guild`、`/actor/*` | STAFF、ADMIN | 既有頁面，改為需要登入（D8） |
| `/status`、`/display/boss-01`、`/display/shop-01` | 公開 | 不變 |

### 7.2 元件調整

- 各操作與大螢幕元件目前從網址解析 `shopId`、`displayId`，改為接受 `nodeId` prop（未傳入時沿用網址解析），讓總控台與跟隨大螢幕可以嵌入。
- 公會：從 `GuildTerminalView` 拆出手機用的操作元件供總控台使用；`/guild` 平板版保留，改用拆出的元件組合。
- 公會大螢幕：待機時顯示任務告示板（`GET /quests`）；收到 `player.scanned` 顯示冒險者名牌與狀態；收到 `quest.accepted`、`quest.reward_claimed`、`adventurer.level_up` 播放演出。
- 狀態查詢大螢幕：重用 `/status` 的結果畫面與 LEVEL UP 演出，資料來自 `status.viewed`。
- 手機畫面以單手直式操作為準（寬 360–430px）；大螢幕以 16:9 橫式為準。
- 呼叫 §5.3 端點時帶上 `Authorization` 標頭；收到 401 時導向 `/login`。

## 8. 驗收標準

### 登入與權限

- [ ] AC1：`staff` 登入後導向 `/staff`；`staff` 開啟 `/admin` 被導回 `/staff`。
- [ ] AC2：未登入開啟 `/staff`、`/guild`、`/actor/boss` 導向 `/login`；`/status`、`/display`、`/display/boss-01` 不需登入。
- [ ] AC3：未帶 token 呼叫 §5.3 列出的端點回 401；`USER` 角色呼叫回 403；`STAFF` 與 `ADMIN` 成功。
- [ ] AC4：Migration 與 seed 可在乾淨資料庫執行，產生 `staff` 帳號。

### 崗位同步

- [ ] AC5：`PUT /stage` 切到 `shop-01` 後，`GET /stage` 回傳 `shop-01`，並推送一次 `stage.changed`（`previousNodeId` 為前一個崗位）；重複切到 `shop-01` 不再推送。
- [ ] AC6：`PUT /stage` 傳入不存在的 `nodeId` 回 400，崗位不變。
- [ ] AC7：手機切換崗位後 1 秒內，`/display` 切到對應的大畫面。
- [ ] AC8：`/display` 重新整理後顯示目前崗位；API 重啟後顯示待機畫面。

### 崗位互動

- [ ] AC9：公會崗位刷 Aria 的測試卡，手機顯示冒險者狀態與任務，大螢幕同時顯示 Aria 名牌；接任務後大螢幕播放接任務演出。
- [ ] AC10：商店崗位刷卡購買木劍，大螢幕播放購得動效（沿用 Shop 切片行為）。
- [ ] AC11：Boss 崗位刷卡開戰並以行動卡攻擊，大螢幕顯示戰鬥（沿用 Boss 與 Action Card 切片行為）；戰鬥中切到公會再切回 Boss，戰鬥狀態仍在。
- [ ] AC12：狀態查詢崗位刷 Leon 的卡，大螢幕顯示 Lv3 與技能卡牆；升級後第一次刷卡播放 LEVEL UP 演出。
- [ ] AC13：一位工作人員只用 `/staff` 與 `/display`，完成「公會接任務 → 打王 → 回公會領獎 → 商店購買 → 狀態查詢」完整循環。

### 文件與品質

- [ ] AC14：README、`docs/game-design.md`、domain model、system architecture 與 getting started 已同步更新（`STAFF` 角色、崗位、新路由、權限變更、demo 帳號）。

## 9. 風險與後續

- **既有頁面需要登入**：`/guild` 與 `/actor/*` 改為需要登入後，現場平板或手機要先登入工作人員帳號；token 過期時會被導回登入頁。
- **崗位狀態在記憶體**：API 重啟後大螢幕回到待機畫面，需要工作人員重新選擇崗位；第一版可接受。
- **單一舞台**：只有一組「手機 + 大螢幕」。之後要支援多組時，可將崗位狀態改為以舞台或工作人員為鍵，`/display` 改為 `/display/stage/<stageId>`。
- **既有問題**：`GuildTerminalView` 的 SSE 備援網址為 `/api/v1/events/sse`，但 API 實際路徑是 `/api/v1/events/stream`；拆分公會畫面時改用共用的 `useGameEvents` 一併修正。
- **後續延伸**：多位工作人員分工、「下一位」與閒置逾時統一規則、工作人員操作稽核、GM 監看所有崗位的控制台。
