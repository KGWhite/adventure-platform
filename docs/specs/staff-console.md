# Staff Console Vertical Slice 需求規格

> **狀態**：已實作（2026-10-26，D1–D11；D9～D11 為首版試用後追加）。驗證方式與實作差異見 [§10 實作備註](#10-實作備註)。實作完成後需同步更新 [README.md](../../README.md)、[docs/game-design.md](../game-design.md)、[docs/architecture/domain-model.md](../architecture/domain-model.md)、[docs/architecture/system-architecture.md](../architecture/system-architecture.md) 與 [docs/development/getting-started.md](../development/getting-started.md)。

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
| D9 | 大螢幕顯示內容 | **已定案（追加）**：冒險者可能只看大螢幕，所以大螢幕要顯示與手機接近的資訊。商店：刷卡後顯示金幣與完整商品陳列（含鎖定原因），店員點選商品時同步放大該商品與價格，購買後播放 GET! 並回到陳列；公會：刷卡後顯示冒險者狀態、裝備與委託（可接取、進行中進度、可領獎）。工作人員按「下一位」或「換卡」時大螢幕回到待機 |
| D10 | 刷卡手機 | **已定案（追加）**：Android 與 iPhone 都可能使用。相機辨識優先用瀏覽器內建 `BarcodeDetector`，不支援時（iPhone Safari、桌機）改用 jsQR 解碼 |
| D11 | NFC 冒險者卡 | **已定案（追加）**：公會、商店、Boss 的身分辨識都加上 NFC（Android Chrome 的 Web NFC），與狀態崗位一致。卡片沿用寫入內容的做法（NDEF 文字或網址記錄 `adventure://player/<憑證>`），不讀卡片序號；讀到一張冒險者卡後停止感應。iPhone 瀏覽器不支援，只能刷 QR |

## 2. 崗位

| 崗位 | `nodeId` | 手機（總控台內） | 大螢幕 |
|---|---|---|---|
| 🏛 公會 | `guild-01` | 刷卡、冒險者狀態、接任務、領獎、換裝 | **新增**：任務告示板、目前冒險者、接任務／完成／升級演出 |
| 🏪 商店 | `shop-01` | 沿用 `ShopActorView` | 沿用 `ShopDisplayView` |
| ⚔ Boss 關 | `boss-01` | 沿用 `BossActorView`（按鈕攻擊與行動卡） | 沿用 `BossDisplayView` |
| 🛡 狀態查詢 | `status-01` | 刷卡、顯示精簡的等級摘要 | **新增**：沿用 `/status` 的等級、技能卡牆與 LEVEL UP 演出 |

- 崗位清單以程式常數定義，前後端各一份（`apps/api/src/stage/stations.ts`、`apps/web/src/types/stage.ts`），本切片不建資料表與後台。
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
4. 切換崗位時，已開過的崗位畫面保留在背景（不清空），切回時接續原本的冒險者與操作；進行中的 Boss 戰不會被中止。
5. 總控台右上角提供「開啟大螢幕」連結（`/display`）與登出。

### 3.3 冒險者進入崗位

1. 冒險者在手機上刷卡（相機、Android Chrome NFC 或測試卡按鈕）→ 沿用各崗位既有的刷卡 API，`displayId` 帶目前崗位的 `nodeId`。
2. 伺服器對該 `nodeId` 推送既有事件（`player.scanned`、`battle.*`、`shop.purchase_completed`、`quest.*`、`adventurer.level_up`），大螢幕已訂閱該 `nodeId`，所以同時顯示。
3. 狀態查詢崗位另外推送 `status.viewed`（§6），讓大螢幕顯示等級與技能卡牆。

### 3.4 大螢幕

1. 開啟 `/display`（不需登入）→ 呼叫 `GET /stage` 取得目前崗位 → 訂閱該 `nodeId` 的事件並顯示對應大畫面；`nodeId` 為 `null` 時顯示待機畫面（D5）。
2. 收到 `stage.changed` → 切換畫面。已顯示過的崗位大畫面保留在背景並持續接收該 `nodeId` 的事件，切回時顯示最新狀態（例如進行中的 Boss 戰）。
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
- `POST /players/:playerId/equipment`、`DELETE /players/:playerId/equipment/:slot`

維持公開：

- `POST /status/scan`（`/status` 自助終端，D6）
- 所有 `GET` 查詢端點、`/events/*` 與 WebSocket（大螢幕唯讀）

### 5.4 `POST /api/v1/status/scan` 調整

- 除了既有的 `player.scanned`，另外對同一個 `displayId` 推送 `status.viewed`（§6），內容為本次回應。
- `/status` 自助終端也使用 `status-01`，所以小朋友自助刷卡時，跟隨模式大螢幕若停在狀態查詢崗位也會同步顯示。

### 5.5 `POST /api/v1/shops/:shopId/preview`（D9）

需 `STAFF` 或 `ADMIN`。店員點選或取消商品時呼叫，讓商店大螢幕同步放大該商品。

```json
// request
{ "itemId": "item-wooden-sword", "displayId": "shop-01" }
```

- `itemId` 為 `null` 表示關閉確認畫面；不在該商店或已停用的商品回 400（`ITEM_NOT_AVAILABLE`）。
- 推送 `shop.item_previewed`，不改變任何遊戲狀態。

### 5.6 `POST /api/v1/stage/clear`（D9）

需 `STAFF` 或 `ADMIN`。工作人員按「下一位」或「換卡」時呼叫，回 204。

```json
// request
{ "nodeId": "shop-01" }
```

- `nodeId` 必須是崗位清單內的值，否則回 400；推送 `station.cleared` 到該 `nodeId`，不改變目前崗位。

### 5.7 掃卡結果同步（D9）

- `POST /shops/:shopId/scan` 另外推送 `shop.scanned`，內容為本次回應（商店、冒險者、裝備、含鎖定原因的商品清單）。
- `POST /guild/scan` 另外推送 `guild.scanned`，內容為本次回應（冒險者、進行中委託、可接取委託、背包與裝備）。
- 接任務、任務進度、領獎、升級與換裝沿用既有事件，大螢幕依事件內容更新畫面。

## 6. 即時事件

```ts
| 'stage.changed'
| 'status.viewed'
| 'shop.scanned'
| 'shop.item_previewed'
| 'guild.scanned'
| 'station.cleared'

interface StageChangedData {
  nodeId: string | null;
  previousNodeId: string | null;
}

// status.viewed 的 data 即 POST /status/scan 的回應
// （player、level、skills、equipment、leveledUpSinceLastSeen）
// shop.scanned、guild.scanned 的 data 分別為兩個掃卡端點的回應

interface ShopItemPreviewedData {
  shopId: string;
  itemId: string | null;
}

interface StationClearedData {
  nodeId: string;
}
```

- `stage.changed` 以 `displayId: 'all'` 推送，所有大螢幕都會收到；`/display/<nodeId>` 固定畫面忽略此事件。
- `status.viewed`、`shop.scanned`、`shop.item_previewed`、`guild.scanned` 推送到請求的 `displayId`；`station.cleared` 推送到該崗位的 `nodeId`。

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
- 公會大螢幕：待機時顯示任務告示板（`GET /quests`）；收到 `guild.scanned` 顯示冒險者狀態、裝備與委託（D9），並依 `quest.*`、`equipment.changed`、`adventurer.level_up` 更新；接任務、領獎與升級播放演出；收到 `station.cleared` 回到告示板。
- 商店大螢幕：收到 `shop.scanned` 顯示金幣與商品陳列，`shop.item_previewed` 放大店員選中的商品，`shop.purchase_completed` 播放 GET! 後回到陳列（已購商品標示已擁有），`station.cleared` 回到待機輪播。
- 相機掃描統一使用 `useQrScanner`（公會改用共用 hook），內建 `BarcodeDetector` 不可用時以 jsQR 解碼（D10）。
- 狀態查詢大螢幕：重用 `/status` 的結果畫面與 LEVEL UP 演出，資料來自 `status.viewed`。
- 手機畫面以單手直式操作為準（寬 360–430px）；大螢幕以 16:9 橫式為準。
- 呼叫 §5.3 端點時帶上 `Authorization` 標頭；收到 401 時導向 `/login`。

## 8. 驗收標準

### 登入與權限

- [x] AC1：`staff` 登入後導向 `/staff`；`staff` 開啟 `/admin` 被導回 `/staff`。
- [x] AC2：未登入開啟 `/staff`、`/guild`、`/actor/boss` 導向 `/login`；`/status`、`/display`、`/display/boss-01` 不需登入。
- [x] AC3：未帶 token 呼叫 §5.3 列出的端點回 401；`USER` 角色呼叫回 403；`STAFF` 與 `ADMIN` 成功。
- [x] AC4：Migration 與 seed 可在乾淨資料庫執行，產生 `staff` 帳號。

### 崗位同步

- [x] AC5：`PUT /stage` 切到 `shop-01` 後，`GET /stage` 回傳 `shop-01`，並推送一次 `stage.changed`（`previousNodeId` 為前一個崗位）；重複切到 `shop-01` 不再推送。
- [x] AC6：`PUT /stage` 傳入不存在的 `nodeId` 回 400，崗位不變。
- [x] AC7：手機切換崗位後 1 秒內，`/display` 切到對應的大畫面。
- [x] AC8：`/display` 重新整理後顯示目前崗位；API 重啟後顯示待機畫面。

### 崗位互動

- [x] AC9：公會崗位刷 Aria 的測試卡，手機顯示冒險者狀態與任務，大螢幕同時顯示 Aria 名牌；接任務後大螢幕播放接任務演出。
- [x] AC10：商店崗位刷卡購買木劍，大螢幕播放購得動效（沿用 Shop 切片行為）。
- [x] AC11：Boss 崗位刷卡開戰並以行動卡攻擊，大螢幕顯示戰鬥（沿用 Boss 與 Action Card 切片行為）；戰鬥中切到公會再切回 Boss，戰鬥狀態仍在。
- [x] AC12：狀態查詢崗位刷 Leon 的卡，大螢幕顯示 Lv3 與技能卡牆；升級後第一次刷卡播放 LEVEL UP 演出。
- [x] AC13：一位工作人員只用 `/staff` 與 `/display`，完成「公會接任務 → 打王 → 回公會領獎 → 商店購買 → 狀態查詢」完整循環。
- [x] AC15：商店崗位刷卡後，大螢幕顯示冒險者金幣，以及與手機相同的商品清單及鎖定原因；店員點選商品時大螢幕放大該商品，取消時恢復；購買後播放 GET! 並回到陳列，已購商品標示已擁有；按「下一位」大螢幕回到待機輪播。
- [x] AC16：公會崗位刷卡後，大螢幕顯示冒險者狀態、裝備與委託；接任務後顯示進行中委託與進度；按「換卡」大螢幕回到告示板。
- [x] AC17：各崗位用相機掃描冒險者 QR 卡皆可辨識；不支援 `BarcodeDetector` 的瀏覽器以 jsQR 解碼；切換崗位會釋放前一個崗位的相機與 NFC，背景崗位不處理刷卡。
- [x] AC18：支援 Web NFC 的裝置在公會、商店、Boss 身分辨識出現 NFC 選項；感應冒險者卡後辨識該冒險者並停止感應，感應行動卡時提示請刷冒險者卡；Boss 戰鬥中仍可用 NFC 刷行動卡。

### 文件與品質

- [x] AC14：README、`docs/game-design.md`、domain model、system architecture 與 getting started 已同步更新（`STAFF` 角色、崗位、新路由、權限變更、demo 帳號）。

## 9. 風險與後續

- **既有頁面需要登入**：`/guild` 與 `/actor/*` 改為需要登入後，現場平板或手機要先登入工作人員帳號；token 過期時會被導回登入頁。
- **崗位狀態在記憶體**：API 重啟後大螢幕回到待機畫面，需要工作人員重新選擇崗位；第一版可接受。
- **單一舞台**：只有一組「手機 + 大螢幕」。之後要支援多組時，可將崗位狀態改為以舞台或工作人員為鍵，`/display` 改為 `/display/stage/<stageId>`。
- **既有問題**：`GuildTerminalView` 的 SSE 備援網址為 `/api/v1/events/sse`，但 API 實際路徑是 `/api/v1/events/stream`；拆分公會畫面時改用共用的 `useGameEvents` 一併修正。
- **後續延伸**：多位工作人員分工、「下一位」與閒置逾時統一規則、工作人員操作稽核、GM 監看所有崗位的控制台。

## 10. 實作備註

- **驗證方式**：
  - AC3～AC6 由 `apps/api/test/staff-console.e2e-spec.ts` 對測試資料庫驗證：11 個寫入端點未帶 token 回 401、`USER` 回 403、`STAFF` 與 `ADMIN` 通過；`PUT /stage` 的切換、重複切換不推送、未知崗位與缺少 `nodeId` 回 400；`status.viewed` 內容等於掃卡回應。`StageService` 另有單元測試（`apps/api/src/stage/stage.service.spec.ts`）。
  - 既有的 Shop、Action Card、Progression e2e 改以 `test/helpers/staff-auth.ts` 取得 `staff` token 後呼叫受保護端點。
  - AC1、AC2、AC7～AC13 以 Playwright 對本機 Docker Compose 環境實測（手機 390×844 開 `/staff`、16:9 開 `/display`）：登入導向與 `?next=` 回原頁、公開頁面、切換崗位後大螢幕在 110ms 內切換、公會接任務 → Boss 戰（中途切到公會再切回）→ 勝利 → 公會領獎 → LEVEL UP → 商店購買 → 狀態查詢技能卡牆、大螢幕重新整理與 API 重啟後的狀態。登入後的 `/guild`、`/actor/boss`、`/actor/shop/shop-01` 舊頁面也照常運作。
- **刷卡驗證（AC17）**：以 Chromium 假鏡頭實測。一組以假的 `BarcodeDetector` 回傳指定內容，驗證公會、商店、Boss（身分卡與行動卡連續掃描）、狀態四個崗位的相機掃描、API 與大螢幕同步，以及切換崗位後相機軌道確實關閉、背景崗位不送出刷卡（17 項）；另一組不提供 `BarcodeDetector`，以含 QR 圖案的影片作為鏡頭，由 jsQR 實際解碼 Aria 的卡（約 0.9 秒）。
- **大螢幕同步驗證（AC15、AC16）**：Playwright 實測 11 項（商品陳列與鎖定原因、選中放大與取消、GET! 後標示已擁有、下一位回待機、公會狀態／裝備／委託、接任務後進度、換卡回告示板）；API 事件內容由 e2e 驗證。
- **NFC 驗證（AC18）**：以模擬的 `NDEFReader` 實測 18 項：公會、商店、Boss 的 NFC 選項啟動讀卡器、感應後辨識冒險者並同步大螢幕、讀到一張卡後停止感應、換卡後可重新開始、商店拒絕行動卡、Boss 以 NFC 憑證 `ADV-DEV-001-NFC` 辨識 Rookie 後用 NFC 行動卡攻擊、切換崗位後所有讀卡器都已關閉。
- **尚未驗證**：實體手機（Android Chrome 內建辨識、iPhone Safari jsQR）的相機與 NFC 掃描、區網內多台裝置同時連線、大螢幕音效。
- **與規格不同之處**：
  - **崗位畫面保留在背景**（§3.2 第 4 點、§3.4 第 2 點）：原規格是切換崗位時清空手機畫面、大螢幕改訂閱新崗位。實測發現 Boss 大螢幕重新掛載後只能從 `battle.started` 建立戰鬥畫面，戰鬥中切走再切回會停在「等待挑戰者」。改為手機與大螢幕都把開過的崗位保留在背景（`hidden`），各自持續接收事件。代價是背景中的大螢幕仍會對該崗位的事件播放音效，例如 `/status` 自助終端刷卡、或切走後 6 秒內的元素彈逾時。
  - **崗位清單前後端各一份**（§2）：`packages/shared` 尚未被任何應用程式引用，為四個字串建立共用套件屬於預先建置基礎設施，因此兩邊各自定義並互相註明。
  - **卸下裝備也需要權限**（§5.3）：`DELETE /players/:playerId/equipment/:slot` 同樣會改變遊戲狀態，一併改為僅限 `STAFF`、`ADMIN`。
- **權限實作**：受保護端點使用 `@StaffOnly()`（`auth/decorators/staff-only.decorator.ts`，組合 `JwtAuthGuard`、`RolesGuard` 與 `@Roles(STAFF, ADMIN)`）。前端以 `utils/apiFetch.ts` 帶上 token，收到 401 時清除 token 並導回 `/login?next=`；路由權限集中在 `router/routeAccess.ts`。
- **大螢幕訂閱**：`/display` 以固定頻道 `stage` 接收 `stage.changed`（以 `displayId: 'all'` 廣播），每次 WebSocket 連上後重新呼叫 `GET /stage`；各崗位大畫面各自訂閱自己的 `nodeId`。
- **公會畫面拆分**：`GuildCounter` 承接原 `GuildTerminalView` 的掃卡、狀態、任務與裝備邏輯，`/guild` 只保留頁首與 `GuildCounter`。即時更新改用共用的 `useGameEvents('guild-01')`，修正原本 SSE 備援網址（`/api/v1/events/sse`）錯誤；原本 WebSocket 未帶 `displayId` 時實際訂閱到 `boss-01` 並依 `battle.victory` 重新整理，現在改依 `guild-01` 的 `quest.progress_updated` 與 `quest.completed`。
- **背景崗位釋放刷卡器**：首版保留背景崗位後，切走的崗位相機與 NFC 仍在運作，可能搶用鏡頭或處理到別的崗位的刷卡。各操作畫面新增 `active` prop，失去焦點時關閉相機與 NFC。
- **jsQR 依賴**：選用 jsQR 1.4.0（純 JavaScript、無相依、離線可用）。`barcode-detector` polyfill 預設從 CDN 下載約 1 MB 的 WebAssembly 解碼器，需要另外處理離線部署；jsQR 自 2021 年後沒有新版本，但功能穩定完整。解碼前將畫面縮到最寬 640px 以控制運算量。
- **已知小問題**：`STAFF` 開啟 `/admin` 時，管理頁面會在導回 `/staff` 前短暫渲染並呼叫 `GET /admin/summary`（API 正確回 403）。`USER` 開啟 `/admin` 原本就有相同行為。
