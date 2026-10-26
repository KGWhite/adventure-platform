# Shop + Equipment Vertical Slice 需求規格

> **狀態**：已實作（2026-10-23）。實作與原規格的差異記錄於 [§8 實作備註](#8-實作備註)；資料模型與 API 摘要同步於 [docs/architecture/domain-model.md](../architecture/domain-model.md)。

## 0. 目標與範圍

**驗證閉環**：戰鬥／任務取得金幣 → 店主 `/actor/shop` 掃卡 → 看到該玩家可購清單 → 確認購買（Server 扣金幣、物品入背包）→ `/display/shop-01` 播放購買動效 → 於公會或購買當下裝備 → 下一場 Boss 戰套用裝備數值。

**In scope**

- 單一商店（武器與防具）。
- 兩個裝備欄位：`WEAPON`、`ARMOR`。
- 購買、背包、裝備／卸下。
- 裝備數值影響 Boss 戰。
- Shop Display Node。

**Out of scope（後續切片）**

- 賣回、議價／折扣。
- 消耗品（藥水目前沒有使用情境）。
- 庫存上限。
- 任務解鎖的隱藏商品。
- 後台商品 CRUD（先以 seed 建立）。
- 通用金幣流水帳。
- 將 Black Knight Medal 轉為背包物品。
- 多間商店。

## 1. 已定案決策

| # | 決策 | 結論 |
|---|---|---|
| D1 | 裝備數值是否影響 Boss 戰 | **是**。武器加攻擊、防具減少 Boss 反擊傷害 |
| D2 | 換裝地點 | **購買時可立即裝備**，並可於 `/guild` 終端換裝；`/user` 僅檢視 |
| D3 | 資料庫不可用時的 Demo fallback | **Shop 一律需要資料庫**，DB 不可用時回 503，不擴充 `credentials` 的記憶體 fallback |
| D4 | 終端端點驗證 | **維持現狀**，與 `/guild/scan`、`/battles` 相同不需登入；終端裝置驗證另開任務處理 |

## 2. 使用者流程

### 2.1 購買（店主 Actor：`/actor/shop/:shopId`）

1. 店主開啟 `/actor/shop/shop-01`，畫面顯示店名與「等待冒險者」。
2. 以相機掃描 Adventure Card，或使用 Manual Credential Input。
3. 呼叫 `POST /shops/shop-01/scan`，畫面顯示冒險者名稱、階級、金幣、目前裝備，以及商品清單。每項商品標示狀態：可購買、金幣不足、階級不足（附所需階級）、已擁有。
4. 店主點選商品，確認對話框顯示價格、購買後剩餘金幣，以及「購買後立即裝備」勾選框（預設勾選）。
5. 確認後呼叫 `POST /shops/shop-01/purchases`：
   - 成功：Actor 畫面顯示成功並更新金幣與裝備，Display 播放購得動效。
   - 失敗：顯示原因（金幣不足、階級不足、已擁有、卡片停用），狀態不變。
6. 按「下一位」清除目前冒險者，或閒置 60 秒後自動清除。

### 2.2 換裝（公會終端：`/guild`）

1. 公會掃卡後，既有冒險者面板新增「裝備與背包」區塊。
2. 區塊顯示兩個欄位目前的裝備，以及背包中未裝備的物品。
3. 點選背包物品 →「裝備」：替換同欄位裝備，原裝備回到背包。點選已裝備物品 →「卸下」。

### 2.3 Boss 戰（既有行為修改）

- 玩家每次攻擊傷害：`32–45` → `32–45 + 武器 attack`。
- Boss 反擊傷害：`12–20` → `max(1, 12–20 − 防具 defense)`。
- 開戰時讀取並快照裝備數值；戰鬥中換裝不影響進行中的戰鬥。
- `battle.started` 的 `player` 增加 `attack`、`defense` 欄位，Display 可選擇顯示。

### 2.4 冒險者儀表板（`/user`，唯讀）

- 顯示背包與目前裝備，不提供操作。兒童玩家不一定持有手機，換裝集中在公會終端。

## 3. 資料模型（Prisma）

```prisma
enum ItemType {
  WEAPON
  ARMOR
}

model Item {
  id          String       @id // slug, e.g. "item-wooden-sword"
  name        String
  description String?
  type        ItemType          // 同時決定裝備欄位
  attack      Int          @default(0)
  defense     Int          @default(0)
  iconKey     String?           // 前端圖示對照鍵
  enabled     Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  shopItems   ShopItem[]
  playerItems PlayerItem[]

  @@map("items")
}

model Shop {
  id        String     @id // e.g. "shop-01"
  name      String
  enabled   Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  items     ShopItem[]
  purchases Purchase[]

  @@map("shops")
}

model ShopItem {
  id             String  @id @default(cuid())
  shopId         String
  itemId         String
  price          Int             // 金幣，> 0
  requiredRankId String?         // 以 Rank.order 比較
  sortOrder      Int     @default(0)
  enabled        Boolean @default(true)
  shop           Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  item           Item    @relation(fields: [itemId], references: [id])
  requiredRank   Rank?   @relation(fields: [requiredRankId], references: [id])

  @@unique([shopId, itemId])
  @@map("shop_items")
}

model PlayerItem {
  id         String            @id @default(cuid())
  playerId   String
  itemId     String
  equipped   Boolean           @default(false)
  acquiredAt DateTime          @default(now())
  player     AdventurerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  item       Item              @relation(fields: [itemId], references: [id])

  @@unique([playerId, itemId]) // 裝備不重複持有
  @@map("player_items")
}

model Purchase {
  id         String            @id @default(cuid())
  playerId   String
  shopId     String
  itemId     String
  price      Int
  goldBefore Int
  goldAfter  Int
  requestId  String            @unique // 冪等鍵
  createdAt  DateTime          @default(now())
  player     AdventurerProfile @relation(fields: [playerId], references: [id], onDelete: Cascade)
  shop       Shop              @relation(fields: [shopId], references: [id])

  @@map("purchases")
}
```

`Rank` 與 `AdventurerProfile` 需新增對應的反向關聯欄位。

### 3.1 一致性規則

- 同一玩家同一 `ItemType` 最多一件 `equipped = true`。由 service 在交易內先以 `SELECT … FOR UPDATE` 鎖定冒險者資料列，再卸下同類型裝備並裝上新裝備（`ItemType` 存在 `Item` 上，無法直接建立 partial unique index）。
- 扣金幣使用條件更新：`updateMany({ where: { id, gold: { gte: price } }, data: { gold: { decrement: price } } })`，影響筆數為 0 即視為金幣不足。
- 購買在同一個 `$transaction` 內完成：扣金幣、建立 `PlayerItem`、建立 `Purchase`。

### 3.2 Seed 資料

商店：`shop-01`（冒險者商店）。

| Item | 類型 | 數值 | 價格 | 階級需求 |
|---|---|---|---|---|
| 木劍 `item-wooden-sword` | WEAPON | ATK +3 | 30 | 無 |
| 鐵劍 `item-iron-sword` | WEAPON | ATK +8 | 100 | Rank E |
| 皮甲 `item-leather-armor` | ARMOR | DEF +3 | 40 | 無 |
| 鎖子甲 `item-chain-mail` | ARMOR | DEF +6 | 120 | Rank E |

數值對應現有 Demo 玩家：Aria 有 50 金幣，可買木劍或皮甲；擊敗 Boss 取得 120 金幣後，鐵劍仍需 Rank E（seed 的階級為 Rank F～S，Aria 為 Rank F），可用來驗證階級鎖定。

## 4. API（`/api/v1`）

所有端點與現有 `/guild/scan`、`/battles` 相同，供實體終端使用，不需要登入（見 D4）。錯誤回應包含 `code` 欄位。

### 4.1 `POST /shops/:shopId/scan`

```json
// request
{ "credentialValue": "cred-demo-001", "displayId": "shop-01" }
```

```json
// 200
{
  "shop": { "id": "shop-01", "name": "冒險者商店" },
  "player": {
    "id": "...",
    "name": "Aria",
    "rank": { "code": "...", "name": "初心者" },
    "gold": 50,
    "attack": 0,
    "defense": 0
  },
  "equipment": { "WEAPON": null, "ARMOR": null },
  "items": [
    {
      "itemId": "item-wooden-sword",
      "name": "木劍",
      "type": "WEAPON",
      "attack": 3,
      "defense": 0,
      "price": 30,
      "purchasable": true,
      "lockedReason": null
    },
    {
      "itemId": "item-iron-sword",
      "name": "鐵劍",
      "type": "WEAPON",
      "attack": 8,
      "defense": 0,
      "price": 100,
      "purchasable": false,
      "lockedReason": "RANK_REQUIRED",
      "requiredRank": { "code": "E", "name": "Rank E", "order": 2 }
    }
  ]
}
```

- `lockedReason`：`ALREADY_OWNED` | `RANK_REQUIRED` | `INSUFFICIENT_GOLD`（多個條件同時成立時依此順序取第一個）。
- 每項商品都帶 `requiredRank`（無限制時為 `null`）。
- 對 `displayId` 發送既有的 `player.scanned` 事件。
- 錯誤：商店不存在或停用 → 404；憑證不存在 → 404；憑證停用 → 400；DB 不可用 → 503。

### 4.2 `GET /shops/:shopId`

- 回傳商店資訊與商品清單（不含玩家狀態），供 Display 閒置時展示。

### 4.3 `POST /shops/:shopId/purchases`

```json
// request
{
  "credentialValue": "cred-demo-001",
  "itemId": "item-wooden-sword",
  "equip": true,
  "requestId": "uuid-v4",
  "displayId": "shop-01"
}
```

```json
// 201
{
  "purchaseId": "...",
  "player": { "gold": 20, "attack": 3, "defense": 0 },
  "item": { "id": "item-wooden-sword", "name": "木劍", "type": "WEAPON", "attack": 3, "defense": 0 },
  "equipped": true,
  "equipment": { "WEAPON": { "id": "item-wooden-sword", "name": "木劍" }, "ARMOR": null }
}
```

- 以 `credentialValue` 驗證身分（要求實體卡在場），不接受僅帶 `playerId`。
- `requestId` 為冪等鍵：重送相同 `requestId` 回傳第一次的結果，不重複扣款。前端每次按下「確認」時產生新的 `requestId`。
- 錯誤：`INSUFFICIENT_GOLD`、`RANK_REQUIRED`、`ALREADY_OWNED` → 409；`ITEM_NOT_AVAILABLE` → 400；同一 `requestId` 用於不同玩家、商店或商品 → 409 `REQUEST_ID_REUSED`；憑證停用 → 400 `CREDENTIAL_DISABLED`。
- 成功時發送 `shop.purchase_completed`；若 `equip = true`，另發送 `equipment.changed`。

### 4.4 `GET /players/:playerId/inventory`

- 回傳 `{ equipment: { WEAPON, ARMOR }, items: PlayerItem[], attack, defense }`，供 `/guild` 與 `/user` 共用。

### 4.5 `POST /players/:playerId/equipment`

- Request：`{ "playerItemId": "...", "displayId": "guild-01" }`（`displayId` 可省略，預設 `guild-01`）。回應 200。
- 裝備指定物品並自動卸下同欄位裝備，回傳新的 inventory 並發送 `equipment.changed`。

### 4.6 `DELETE /players/:playerId/equipment/:slot`

- `slot`：`WEAPON` | `ARMOR`。欄位已為空時回 200，不做任何變更。

### 4.7 既有端點修改

- `POST /guild/scan` 回應增加 `inventory`（即 4.4 的完整 inventory，含 `equipment`、`attack`、`defense` 與背包清單）；冒險者無法從資料庫載入背包時（例如記憶體 demo fallback）為 `null`。
- 建立戰鬥時從 DB 讀取裝備數值（見 2.3）。

## 5. 即時事件

`GameEventType` 新增：

```ts
| 'shop.purchase_completed'
| 'equipment.changed'

interface ShopPurchaseCompletedData {
  purchaseId: string;
  shopId: string;
  playerId: string;
  playerName: string;
  item: {
    id: string;
    name: string;
    type: 'WEAPON' | 'ARMOR';
    attack: number;
    defense: number;
    iconKey?: string;
  };
  price: number;
  goldAfter: number;
  equipped: boolean;
}

interface EquipmentChangedData {
  playerId: string;
  playerName: string;
  slot: 'WEAPON' | 'ARMOR';
  equippedItem: { id: string; name: string } | null;
  attack: number;  // 變更後總值
  defense: number; // 變更後總值
}
```

`displayId` 規則沿用現狀：由請求帶入；商店端點未帶入時預設為該 `shopId`（如 `shop-01`），裝備端點未帶入時預設 `guild-01`。

### 5.1 Shop Display Node（`/display/shop-01`）

| 狀態 | 觸發 | 畫面 |
|---|---|---|
| Idle | 預設，或結束後 60 秒 | 商品陳列輪播（Staff Console 切片起改為完整商品一覽，見 [staff-console.md](staff-console.md) D12） |
| Welcome | `player.scanned` | 「歡迎，Aria」與金幣 |
| Purchased | `shop.purchase_completed` | 物品放大展示、數值飄字、金幣扣減動畫，8 秒後回到 Welcome |
| Equipped | `equipment.changed` | 疊加「已裝備」與 ATK / DEF 變化 |

Display 維持無狀態，只依事件 payload 渲染。

## 6. 驗收標準

### 購買

- [x] AC1：Aria（50 金幣）於 `/actor/shop/shop-01` 掃卡，木劍、皮甲為可購買，鐵劍、鎖子甲顯示「需要 Rank E」。
- [x] AC2：購買木劍並勾選立即裝備後，金幣為 20、武器欄為木劍、ATK 為 3；DB 有一筆 `Purchase`（`goldBefore = 50`、`goldAfter = 20`）。
- [x] AC3：已持有木劍時再次掃卡顯示「已擁有」；強制送出購買請求回 `ALREADY_OWNED`，金幣不變。
- [x] AC4：金幣不足的商品顯示「金幣不足」；強制送出購買請求回 `INSUFFICIENT_GOLD`，狀態不變。
- [x] AC5：同一 `requestId` 連送兩次只扣款一次，兩次回應的 `purchaseId` 相同。
- [x] AC6：以不同 `requestId` 並行送出兩筆會讓金幣變負的購買，最多一筆成功，金幣不會小於 0（需有整合測試）。
- [x] AC7：停用的卡片掃描與購買皆回 400。

### 裝備

- [x] AC8：`/guild` 掃卡後可看到裝備欄與背包；從背包裝備皮甲後 DEF 為 3。
- [x] AC9：已裝備木劍時裝備鐵劍，木劍回到背包，同欄位不會同時有兩件裝備。
- [x] AC10：卸下武器後 ATK 回到 0。

### 戰鬥

- [x] AC11：裝備木劍時，每次攻擊傷害落在 35–48。
- [x] AC12：裝備皮甲時，Boss 反擊傷害落在 9–17，且最低為 1。
- [x] AC13：無裝備時戰鬥結果與現行行為相同。

### 即時呈現

- [x] AC14：購買成功後 1 秒內，`/display/shop-01` 開始播放購得動效；購買失敗時不發送任何事件。
- [x] AC15：`/display/boss-01` 只接收自己 `displayId` 的事件，看不到商店事件。

### 文件與品質

- [x] AC16：Migration 與 seed 可在乾淨的資料庫上執行；`docker compose up` 後可走完整個流程。
- [x] AC17：README（進度與路由）、`docs/game-design.md`（§7.1、§12）、`docs/architecture/domain-model.md` 已同步更新。

## 7. 相關但不在本切片處理的事項

- Black Knight Medal 目前只是字串，不會存入背包。
- 金幣除了 `Purchase` 之外沒有通用流水帳。
- 實體終端端點沒有裝置驗證（見 D4）。

## 8. 實作備註

- **階級名稱**：seed 的階級為 Rank F～S，原規格的「青銅」對應為 Rank E（`order` 2）。
- **Guild scan 回應**：以單一 `inventory` 欄位取代分散的 `equipment` / `attack` / `defense`，讓 `/guild` 不需額外請求即可顯示背包。
- **錯誤格式**：商店與背包端點的錯誤回應為 `{ statusCode, code, message }`。
- **驗收方式**：AC1–AC10 與 AC14（失敗不送事件）由 `apps/api/test/shop-equipment.e2e-spec.ts` 對測試資料庫驗證；AC11–AC13 由 `battles.service.spec.ts` 以固定亂數驗證；AC14 Display 動效、AC16 Docker Compose 流程於本機整合環境手動驗證；AC15 由既有 WebSocket / SSE 依 `displayId` 分送事件保證。`/user` 的唯讀背包卡片僅經型別檢查與建置驗證，未於瀏覽器登入實測。
- **未變更**：既有 Migration 與 schema 之間有一項與本切片無關的 drift（`quests.requiredRankId` 外鍵的 `ON DELETE` 行為），未納入本次 migration。
