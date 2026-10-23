# Action Card Battle Vertical Slice 需求規格

> **狀態**：已實作（2026-10-23，D1–D5 採建議方案）。驗證方式與實作差異見 [§11 實作備註](#11-實作備註)。實作完成後需同步更新 [README.md](../../README.md)、[docs/game-design.md](../game-design.md)、[docs/architecture/domain-model.md](../architecture/domain-model.md) 與 [docs/architecture/system-architecture.md](../architecture/system-architecture.md)。

## 0. 目標與範圍

**要驗證的兩件事**

1. **刷卡立即有感**：小朋友刷卡的瞬間，手邊終端與大螢幕都要立刻有反應，不讓孩子盯著沒反應的畫面等待。
2. **實體卡片就是遊戲動作**：Boss 戰中，小朋友刷一張「行動卡」就是一次攻擊；在時間內依序刷兩張卡可組合出技能。孩子手上的卡片取代 Boss 操偶師的「Attack」按鈕。

**驗證閉環**：Boss 操偶師掃冒險者身分卡開戰 → 切到「卡片模式」→ 小朋友刷行動卡 → 終端 100ms 內震動與音效、大螢幕 300ms 內出現卡片飛入 → 第二張卡組合成技能（或單卡逾時成為基本攻擊）→ Server 權威結算傷害與 Boss 反擊 → 大螢幕播放技能動畫 → 勝負結算沿用現有流程。

**In scope**

- 行動卡（`ActionCard`）資料模型與 seed：1 種攻擊卡、3 種元素卡。
- 技能組合規則（雙卡組合、單卡逾時、失敗組合），由 Server 權威判定。
- `/actor/boss` 新增「卡片模式」：相機連續掃描與手動卡片按鈕。
- `/display/boss-01` 新增卡槽、組合倒數、技能與失敗動畫。
- 終端在本地即時回饋（震動、音效、閃光）。範圍涵蓋 `/actor/boss`、`/actor/shop`、`/guild` 的所有掃卡動作。
- 行動卡 QR payload 格式；Web NFC 讀卡（D3：Android Chrome 選配）。

**Out of scope（後續切片）**

- 角色立繪、怪物與裝備美術、角色外觀選擇（美術管線另案）。
- 多人協力合體技（同一場戰鬥多名冒險者）。
- 卡片歸屬個人、在商店購買行動卡、卡片升級。
- 消耗品卡（藥水）與 Boss 技能 AI。
- USB／藍牙讀卡機、原生 App 外殼。
- 燈光、音響、機關等 World Output。
- 戰鬥中卡槽狀態的持久化（沿用現有「戰鬥狀態存在 API 記憶體」的限制）。

## 1. 已定案決策

| # | 決策 | 結論 |
|---|---|---|
| D1 | 行動卡歸屬 | **場地共用道具**：卡片不綁定冒險者，誰在戰鬥中就算誰的動作。卡片歸屬個人留待後續切片 |
| D2 | 誰來刷卡 | **Boss 操偶師的手機**（`/actor/boss` 卡片模式），小朋友把卡遞到鏡頭前；NFC 時改為碰手機背面 |
| D3 | NFC 是否納入本切片 | **納入 Web NFC 讀取作為選配**：僅 Android Chrome 支援，偵測不到時自動隱藏；QR 與手動模式為必備 |
| D4 | 單張元素卡逾時 | **成為「元素彈」基本攻擊**：每次刷卡都一定有效果，不讓孩子覺得白刷 |
| D5 | 按鈕攻擊是否保留 | **保留**，卡片模式與按鈕模式可在戰鬥中切換（卡片遺失或掃描失敗時的備援） |

## 2. 使用者流程

### 2.1 卡片模式戰鬥（`/actor/boss`）

1. 操偶師照現有流程掃冒險者身分卡並開戰。
2. 戰鬥畫面多一組切換：「🔘 按鈕攻擊 / 🃏 卡片攻擊」。切到卡片攻擊後，相機保持開啟並持續掃描，不會掃到一次就關閉。
3. 小朋友把行動卡遞到鏡頭前：
   - 終端**立即**震動 50ms、播放刷卡音效、畫面邊框閃光（不等 API）。
   - 呼叫 `POST /battles/:id/cards`。
4. 依卡槽狀態與組合規則（§3）得到結果：
   - **蓄力中**：卡槽顯示第一張卡與 6 秒倒數圈，提示「再刷一張卡組合技能！」。
   - **施放技能／攻擊**：顯示技能名稱與傷害，Boss 反擊結果沿用現有 HP 條。
   - **魔法失控**：顯示失敗提示（無傷害、Boss 也不反擊）。
   - **冷卻中**：同一張卡 2 秒內重複讀到，靜默忽略（不呼叫 API，也不出現失敗提示）。
5. 勝利或落敗沿用現有流程與 `battle.victory`／`battle.defeat`。

### 2.2 手動卡片模式（開發與備援）

- 卡片模式下顯示四顆大按鈕：⚔️ 攻擊卡、🔥 火、💧 水、🌪️ 風。按下等同刷到對應的 seed 卡片，送出相同的 API，供無相機時開發與現場備援使用。

### 2.3 大螢幕（`/display/boss-01`）

- 戰鬥 HUD 下方新增**卡槽列**：最多 2 格。
- `card.scanned`：卡片從畫面下方飛入卡槽，並播放元素色光暈。若是第一張元素卡，開始 6 秒倒數圈。
- `skill.cast`：全螢幕技能演出 1.5～2.5 秒（火焰龍捲、治癒之雨等各自有配色與音效），接著沿用 `battle.damage` 的扣血與飄字。
- `skill.fizzled`：卡片碎裂動畫與「魔法失控！」字樣，1 秒。
- 皆支援 `prefers-reduced-motion`：以淡入淡出取代旋轉與震動。

### 2.4 所有終端的即時刷卡回饋

- `/actor/boss`、`/actor/shop/:shopId`、`/guild` 在**本地解碼成功的瞬間**（QR 辨識或 NFC 讀到）立即播放：`navigator.vibrate(50)`（支援時）、`sfx.playScan()`、200ms 邊框閃光。手動模式按下按鈕時同樣播放。
- 回饋只代表「讀到卡了」。API 失敗時接著顯示既有錯誤訊息，不撤回已播放的回饋。

## 3. 技能組合規則（Server 權威）

### 3.1 卡片種類

| 類型 `ActionCardType` | 名稱 | 圖示 |
|---|---|---|
| `STRIKE` | 攻擊卡 | ⚔️ |
| `FIRE` | 火之卡 | 🔥 |
| `WATER` | 水之卡 | 💧 |
| `WIND` | 風之卡 | 🌪️ |

### 3.2 卡槽與組合

每場戰鬥在 Server 記憶體中有一個卡槽，容量 2，**組合時限 6 秒**（從第一張卡起算）。

| 卡槽狀態 | 刷到的卡 | 結果 |
|---|---|---|
| 空 | `STRIKE` | 立即施放 **普通攻擊**，卡槽保持空 |
| 空 | 元素卡 | **蓄力**：放入卡槽，開始 6 秒倒數 |
| 1 張元素卡 | `STRIKE` | 施放 **元素斬**（依該元素） |
| 1 張元素卡 | 不同元素卡 | 施放對應的 **雙元素技能**（不分順序） |
| 1 張元素卡 | 相同元素卡 | **魔法失控**：清空卡槽，無傷害，Boss 不反擊 |
| 1 張元素卡 | （6 秒逾時） | 施放 **元素彈**（D4），由 Server 計時器觸發 |

### 3.3 技能表

基礎傷害 `base = 32–45 隨機 + 武器 attack`（沿用 Shop + Equipment 切片的公式）。Boss 反擊沿用 `max(1, 12–20 − 防具 defense)`。

| 技能 `skillId` | 組合 | 效果 | Boss 反擊 |
|---|---|---|---|
| `strike` 普通攻擊 | STRIKE | `base` | 有 |
| `element-bolt` 元素彈 | 單張元素卡逾時 | `base` | 有 |
| `element-slash` 元素斬 | 元素 → STRIKE | `round(base × 1.5)` | 有 |
| `fire-tornado` 火焰龍捲 | FIRE + WIND | `base × 2` | 有 |
| `steam-burst` 蒸氣爆發 | FIRE + WATER | `round(base × 1.5)` | **無**（Boss 暈眩） |
| `healing-rain` 治癒之雨 | WATER + WIND | 冒險者回復 30 HP（不超過 maxHp），無傷害 | 有 |
| `fizzle` 魔法失控 | 相同元素 ×2 | 無 | 無 |

- 技能表與組合規則以程式常數定義（`battles/skills.ts`），本切片不建立技能資料表或後台管理介面。
- 卡片刷入時若戰鬥已結束（`status !== 'active'`），回 409 `BATTLE_NOT_ACTIVE`。
- 同一場戰鬥同一時間只處理一張卡：請求依序處理，避免逾時計時器與刷卡同時結算。

### 3.4 防連刷

- **終端去抖動**：相機連續掃描時，同一個卡片值 2 秒內只送出一次。
- **Server 冷卻**：同一場戰鬥同一張實體卡（`cardValue`）2 秒內再次送達，回 200 `result: "cooldown"`，不結算、不推播。

## 4. 資料模型

```prisma
enum ActionCardType {
  STRIKE
  FIRE
  WATER
  WIND
}

model ActionCard {
  id        String         @id @default(cuid())
  value     String         @unique // 實體載體上的 token，例如 "card-fire-001"
  type      ActionCardType
  label     String?                // 印刷標示，方便現場辨識
  enabled   Boolean        @default(true)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@map("action_cards")
}
```

- `ActionCard` 與 `Credential` 分開：`Credential` 回答「我是誰」，`ActionCard` 回答「我要做什麼」，兩者不互相查詢。
- 戰鬥卡槽、冷卻與計時器存在 `BattleState`（API 記憶體），不寫入資料庫：

```ts
interface BattleState {
  // ...existing fields
  castSlot: { type: ActionCardType; cardValue: string; scannedAt: string }[];
  comboDeadline: string | null;
}
```

- 結算結果仍寫入既有 `battles` 表（HP、狀態）。本切片不新增技能施放紀錄表。

**Seed**：每種卡 3 張，共 12 張，值為 `card-strike-001`～`003`、`card-fire-001`～`003`、`card-water-001`～`003`、`card-wind-001`～`003`。

## 5. 卡片載體格式

| 載體 | 內容 |
|---|---|
| QR Code | `adventure://card/<value>`，例如 `adventure://card/card-fire-001` |
| NFC（NDEF） | 單一 Text 或 URI record，內容同上 |
| 手動模式 | 直接送出 seed 卡片值 |

- 前端解析規則：`adventure://player/` 開頭為身分卡，`adventure://card/` 開頭為行動卡。卡片模式下讀到身分卡會提示「這是冒險者卡，請刷行動卡」；身分掃描時讀到行動卡則反過來提示。
- 不帶前綴的純文字值沿用現狀：身分掃描時視為 `credentialValue`，卡片模式下視為 `cardValue`。

## 6. API

### 6.1 `POST /api/v1/battles/:id/cards`

```json
// request
{ "cardValue": "card-fire-001" }
```

```json
// 200
{
  "result": "charged",
  "skill": null,
  "castSlot": [{ "type": "FIRE" }],
  "comboDeadline": "2026-11-01T10:00:06.000Z",
  "battle": { "...": "BattleState，含 lastTurn" }
}
```

- `result`：`charged` | `cast` | `fizzled` | `cooldown`。
- `result = "cast"` 時，`skill` 為 `{ id, name, damage, heal, bossCountered }`，`battle.lastTurn` 更新。
- 錯誤：
  - 戰鬥不存在 → 404 `BATTLE_NOT_FOUND`
  - 戰鬥已結束 → 409 `BATTLE_NOT_ACTIVE`
  - 卡片不存在或停用 → 404 `CARD_NOT_FOUND` / 400 `CARD_DISABLED`
  - 資料庫不可用 → 503 `DATABASE_UNAVAILABLE`（查卡需要資料庫，不使用記憶體 fallback）
- 逾時結算（元素彈）由 Server 計時器觸發，只透過事件推播，終端收到 `skill.cast` 後更新畫面。

### 6.2 `GET /api/v1/action-cards`

- 回傳啟用中的行動卡清單（`value`、`type`、`label`），供手動模式按鈕與列印 QR 使用。

### 6.3 既有端點

- `POST /battles/:id/attack` 保留，行為不變（D5）。按鈕攻擊不受卡槽影響，也不會清空卡槽。

## 7. 即時事件

`GameEventType` 新增：

```ts
| 'card.scanned'
| 'skill.cast'
| 'skill.fizzled'

interface CardScannedData {
  battleId: string;
  playerId: string;
  cardType: 'STRIKE' | 'FIRE' | 'WATER' | 'WIND';
  castSlot: ('STRIKE' | 'FIRE' | 'WATER' | 'WIND')[];
  comboDeadline: string | null;
}

interface SkillCastData {
  battleId: string;
  playerId: string;
  skillId: string;
  skillName: string;
  cards: ('STRIKE' | 'FIRE' | 'WATER' | 'WIND')[];
  damage: number;
  heal: number;
  bossCountered: boolean;
}

interface SkillFizzledData {
  battleId: string;
  playerId: string;
  cards: ('STRIKE' | 'FIRE' | 'WATER' | 'WIND')[];
}
```

**發送順序**（同一請求內）：

1. `card.scanned`：Server 查到卡片後**立即**發送，在結算之前，讓大螢幕先播卡片飛入。
2. 結算後依結果發送 `skill.cast` 或 `skill.fizzled`。
3. 有 HP 變化時，接著發送既有的 `battle.damage`；勝負沿用 `battle.victory` / `battle.defeat` / `reward.received`。

`cooldown` 結果不發送任何事件。`displayId` 沿用該場戰鬥的 `displayId`。

## 8. 即時回饋效能目標

| 量測點 | 目標 |
|---|---|
| 解碼成功 → 終端本地回饋（震動／音效／閃光） | ≤ 100ms |
| 解碼成功 → 大螢幕開始播放卡片飛入（`card.scanned`） | ≤ 300ms（區網） |
| 解碼成功 → 大螢幕開始播放技能演出 | ≤ 500ms（區網） |
| 技能演出長度 | 1.5～2.5 秒，不阻擋下一張卡的刷入 |

- 相機連續掃描間隔由現有的 400ms 縮短為 150ms，僅在卡片模式下生效。
- 大螢幕在演出期間收到新的 `card.scanned` 時，卡槽立即更新，技能演出排入佇列依序播放。

## 9. 驗收標準

### 卡片與組合

- [x] AC1：seed 後 `GET /action-cards` 回傳 12 張卡，每種 3 張。
- [x] AC2：卡槽為空時刷攻擊卡，立即施放普通攻擊，傷害落在 `32–45 + 武器 attack`，Boss 反擊。
- [x] AC3：刷火之卡回 `charged` 與 6 秒期限；6 秒內再刷風之卡回 `cast`／`fire-tornado`，傷害為 `base × 2`。
- [x] AC4：刷水之卡後刷火之卡施放 `steam-burst`，且該回合 Boss 不反擊。
- [x] AC5：刷水之卡後刷風之卡施放 `healing-rain`，HP 回復 30 且不超過 maxHp。
- [x] AC6：刷元素卡後刷攻擊卡施放 `element-slash`，傷害為 `round(base × 1.5)`。
- [x] AC7：同元素連刷兩張回 `fizzled`，HP 皆不變。
- [x] AC8：只刷一張元素卡並等待 6 秒，Server 自動施放 `element-bolt` 並推播 `skill.cast`。
- [x] AC9：同一張卡 2 秒內重送回 `cooldown`，不推播事件；換另一張同類型的卡則正常結算。
- [x] AC10：戰鬥結束後刷卡回 409 `BATTLE_NOT_ACTIVE`；未知卡片回 404，停用卡片回 400。
- [x] AC11：刷卡與逾時計時器同時發生時，該卡槽只結算一次（需單元測試，使用假計時器）。
- [x] AC12：按鈕攻擊在卡片模式下仍可使用，且不影響卡槽內容。

### 終端與大螢幕

- [ ] AC13：`/actor/boss` 卡片模式下相機持續開啟，連續刷三張不同卡皆被讀到。
- [x] AC14：手動模式的四顆卡片按鈕可完成 AC2～AC7 的所有組合。
- [ ] AC15：`/actor/boss`、`/actor/shop`、`/guild` 掃卡成功時，在 API 回應前就播放震動、音效與閃光；網路斷線時仍會播放，之後顯示錯誤訊息。
- [x] AC16：大螢幕依序顯示卡片飛入、倒數圈、技能演出與扣血；`skill.fizzled` 顯示失控動畫。
- [ ] AC17：開啟 reduced motion 時，大螢幕不播放旋轉與震動動畫，資訊仍完整顯示。
- [ ] AC18：卡片模式讀到身分卡、或身分掃描讀到行動卡時，顯示對應提示且不呼叫錯誤的 API。
- [ ] AC19：Android Chrome 上可用 NFC 貼紙觸發 AC2～AC7；不支援 Web NFC 的瀏覽器不顯示 NFC 選項。

### 效能與文件

- [x] AC20：在區網環境實測 10 次，`card.scanned` 從解碼到大螢幕開始動畫的中位數 ≤ 300ms（以終端與大螢幕的 console 時間戳記比對）。
- [x] AC21：Migration 與 seed 可在乾淨的資料庫上執行；README、`docs/game-design.md`（§7.2、§12）、domain model、system architecture 已同步更新。

## 10. 風險與後續

- **iOS 不支援 Web NFC**：iPad 或 iPhone 擔任操偶終端時只能使用 QR，硬體方案仍屬 `game-design.md` §12.4 的待討論項目。
- **QR 連續掃描的距離與光線**：現場需實測卡片尺寸（建議 QR 至少 3cm）與鏡頭對焦距離，必要時改用固定架。
- **節奏由卡片主導**：Boss 反擊頻率會隨孩子刷卡速度上升；冷卻 2 秒與組合時限 6 秒需現場試玩後調整（以常數集中管理）。
- **後續延伸**：卡片歸屬個人與商店販售行動卡、多人合體技、World Output（燈光與音效聯動技能）、角色與技能美術資產。

## 11. 實作備註

- **驗證方式**：
  - AC2～AC9、AC11、AC12 由 `apps/api/src/battles/battles.service.spec.ts` 與 `skills.spec.ts` 以固定亂數與假計時器驗證。
  - AC1、AC10 由 `apps/api/test/action-card-battle.e2e-spec.ts` 對測試資料庫驗證。
  - AC14、AC16 在本機整合環境以手動卡片按鈕實測：攻擊、火＋風、水＋風、水＋水（失控）、單張元素逾時；大螢幕的卡槽與技能演出以 DOM 觀察確認。
  - AC20 以手動卡片按鈕在區網實測 10 次：按下到大螢幕出現卡片中位數 25ms（最大 27ms），到技能演出中位數 31ms（最大 33ms）。此數據不含相機解碼時間。
- **尚未實機驗證**：AC13（相機連續掃描實體 QR 卡）、AC15（震動與音效的實際體感）、AC17（reduced motion 呈現）、AC18（掃錯卡種的提示）、AC19（Android Chrome Web NFC）。功能已實作，需以實體卡片、行動裝置與系統設定實測。
- **手動卡片按鈕**：每種卡依序輪替使用 seed 中的不同卡片值，避免 2 秒同卡冷卻擋住同類型組合（例如水＋水的魔法失控）。
- **結果提示列**：`/actor/boss` 卡片模式的結果提示列固定佔位，避免連續點擊時按鈕位移造成誤觸。
- **逾時結算同步**：元素彈由 Server 計時器觸發後，`/actor/boss` 透過 `skill.cast` 事件重新讀取戰鬥狀態。
- **大螢幕演出時序**：技能演出以半透明覆蓋層播放，`battle.damage` 的扣血與飄字在覆蓋層下同步更新，而非等演出結束後才扣血。
- **掃描元件**：`/actor/boss` 的身分卡掃描改用共用的 `useQrScanner`；`/guild` 仍使用自身的相機程式碼，僅加入即時回饋與 payload 判斷。
