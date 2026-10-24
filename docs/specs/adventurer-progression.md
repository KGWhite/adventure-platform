# Adventurer Progression Vertical Slice 需求規格

> **狀態**：已實作（2026-10-24，D1–D6）。驗證方式與實作差異見 [§10 實作備註](#10-實作備註)。實作完成後需同步更新 [README.md](../../README.md)、[docs/game-design.md](../game-design.md)、[docs/architecture/domain-model.md](../architecture/domain-model.md)、[docs/architecture/system-architecture.md](../architecture/system-architecture.md) 與 [docs/specs/action-card-battle.md](action-card-battle.md)。

## 0. 目標與範圍

**獎勵循環**：小朋友一開始拿到一張冒險者 ID 卡 → 解任務、打王累積功績 → 等級提升 → 學會新技能，並從工作人員手上領到對應的實體技能卡 → 打王時用這些卡組合技能 → 隨時刷 ID 卡在 `/status` 看到自己的等級與技能。

**要驗證的兩件事**

1. **成長看得見**：小朋友刷 ID 卡就能看到自己的等級、離下一級還差多少，以及已學會與尚未學會的技能；剛學會的技能會有慶祝演出。
2. **技能是獎勵**：Boss 戰中，只有已學會的技能組合才會施放；還沒學會時給出友善提示並改用基本攻擊，讓孩子知道「升級就能用」。

**In scope**

- 等級由累積功績換算，並在功績變動時同步更新。
- 技能依等級解鎖（記錄在帳號上，不綁定實體卡）。
- 新路由 `/status`：小朋友自助刷卡的冒險者狀態終端。
- Boss 戰依冒險者已學會的技能結算組合。
- 升級事件與 Boss 大螢幕勝利畫面上的「LEVEL UP」提示。

**Out of scope（後續切片）**

- 實體技能卡發放紀錄（哪張卡已交給誰）與遺失補發。
- 階級晉升（Rank Up）；等級與階級分開，互不影響。
- 經驗值（EXP）等新資源、等級上限調整介面、技能樹分支選擇。
- 角色立繪與外觀選擇。
- 公會大廳看板 `/display/guild-01`。

## 1. 決策

| # | 決策 | 結論 |
|---|---|---|
| D1 | 等級來源 | **已定案**：依累積功績（Merit）換算。功績本來就只增不減，等級不會倒退；不新增資源 |
| D2 | 技能卡歸屬 | **已定案**：技能解鎖記在帳號上。實體技能卡是升級時發給孩子的紀念與道具，打王時卡片仍可共用（沿用 Action Card Battle D1），由冒險者的解鎖狀態決定能不能施放 |
| D3 | 狀態畫面位置 | **已定案**：獨立的 `/status` 自助終端（平板或大螢幕），不整合進 `/guild` |
| D4 | 刷到尚未學會的組合 | **已定案**：改為施放「元素彈」基本攻擊，並提示「還沒學會火焰龍捲，先用元素彈！」。每次刷卡都有效果，同時讓孩子知道升級的價值 |
| D5 | 「新技能」慶祝怎麼判定 | **已定案**：記錄冒險者上次在 `/status` 看到的等級（`lastSeenLevel`），比它高的等級所解鎖的技能顯示 NEW 與慶祝演出，看過一次後更新 |
| D6 | 等級上限 | **已定案**：本切片上限 Lv5（技能剛好全部解鎖），超過顯示「MAX」。之後新增技能時再延伸 |

## 2. 等級與技能表

### 2.1 等級門檻（累積功績）

| 等級 | 累積功績 | 解鎖技能 | 對應卡片組合 |
|---|---|---|---|
| Lv1 | 0 | 普通攻擊、元素彈 | ⚔️；單張 🔥／💧／🌪️ 逾時 |
| Lv2 | 20 | 元素斬 | 🔥／💧／🌪️ → ⚔️ |
| Lv3 | 50 | 火焰龍捲 | 🔥 + 🌪️ |
| Lv4 | 100 | 治癒之雨 | 💧 + 🌪️ |
| Lv5 | 160 | 蒸氣爆發 | 🔥 + 💧 |

- 目前功績來源：擊敗 Boss +10、完成「討伐黑騎士」任務 +20。一個孩子完成一次任務（含打王）約 +30 功績，大約 1～2 輪升一級。
- Demo 資料：Aria 功績 20 → Lv2；Leon 功績 50 → Lv3；Rookie 功績 0 → Lv1。
- 門檻與技能等級以程式常數定義（`progression/levels.ts`），與 `battles/skills.ts` 的技能 ID 對應，本切片不建資料表與後台。
- 「魔法失控」（同元素兩張）不是技能，所有等級都會發生。

### 2.2 與階級（Rank）的關係

- **等級（Level）**：由功績自動換算，代表個人成長，決定能用的技能。
- **階級（Rank F～S）**：沿用現有設計，需申請與管理員審核，決定商店與任務資格。
- 兩者都看功績，但門檻與用途不同，互不影響。

## 3. 使用者流程

### 3.1 刷卡看狀態（`/status`）

1. 平板或大螢幕開啟 `/status`，待機畫面顯示大大的「刷你的冒險者卡！」與動畫；相機持續掃描（Android Chrome 另可用 NFC），也保留開發用的手動卡片按鈕。
2. 小朋友刷 ID 卡 → 立即播放刷卡回饋（沿用 `playScanFeedback`）→ 呼叫 `POST /status/scan`。
3. 畫面顯示：
   - 冒險者名字、**大字等級徽章**（Lv3）、階級。
   - **升級進度條**：「再 18 功績升到 Lv4！」；滿級顯示「MAX」。
   - 金幣、功績、目前裝備的武器與防具（沿用背包資料）。
   - **技能卡牆**：已學會的技能以彩色卡片顯示名稱與卡片組合圖示（例：🔥 + 🌪️ 火焰龍捲）；未學會的以剪影顯示「Lv4 解鎖」。
4. 若有自上次查看後新學會的技能（D5），先播放全螢幕「LEVEL UP！學會新技能」演出（3 秒），再顯示狀態頁，新技能卡片帶 NEW 標記並提示「請到公會領取技能卡」。
5. 20 秒無操作或刷下一張卡時回到待機畫面。刷到行動卡時提示「這是行動卡，請刷冒險者卡」。

### 3.2 升級的瞬間

- 功績增加的同一筆交易內重新計算等級。若等級提升，寫入新等級並發送 `adventurer.level_up` 事件：
  - 擊敗 Boss 而升級：Boss 大螢幕勝利畫面加上「LEVEL UP！Lv3 學會火焰龍捲」。
  - 公會領獎而升級：`/guild` 領獎成功訊息加上升級提示。
- 工作人員看到提示後，把對應的實體技能卡交給孩子（發卡紀錄不在本切片範圍）。

### 3.3 Boss 戰的技能限制

- 開戰時快照冒險者等級與已學會的技能。
- 刷卡組合出的技能若尚未學會（D4）：改為施放元素彈，回應與事件標示 `lockedSkill`，終端與大螢幕顯示「還沒學會火焰龍捲，先用元素彈！」。
- 普通攻擊、元素彈、魔法失控不受等級限制。
- 按鈕攻擊不受影響。

## 4. 資料模型

```prisma
model AdventurerProfile {
  // ...existing fields
  level         Int @default(1) // 改為由 merit 換算的快取，功績變動時同步更新
  lastSeenLevel Int @default(1) // 上次在 /status 看到的等級（D5）
}
```

- 已學會的技能由 `level` 推導（`requiredLevel <= level`），不建立技能解鎖資料表。
- Migration：新增 `lastSeenLevel`，並以功績回填一次既有冒險者的 `level`；`lastSeenLevel` 回填為相同值，避免既有冒險者第一次刷卡就出現全部技能的 NEW。
- Seed：依功績設定 Demo 冒險者的 `level`。

## 5. API

### 5.1 `POST /api/v1/status/scan`

```json
// request
{ "credentialValue": "cred-demo-002", "displayId": "status-01" }
```

```json
// 200
{
  "player": {
    "id": "...",
    "name": "Leon",
    "rank": { "code": "F", "name": "Rank F" },
    "gold": 100,
    "merit": 50
  },
  "level": {
    "current": 3,
    "max": 5,
    "merit": 50,
    "currentLevelMerit": 50,
    "nextLevelMerit": 100,
    "meritToNext": 50
  },
  "skills": [
    { "id": "strike", "name": "普通攻擊", "cards": ["STRIKE"], "requiredLevel": 1, "unlocked": true, "isNew": false },
    { "id": "fire-tornado", "name": "火焰龍捲", "cards": ["FIRE", "WIND"], "requiredLevel": 3, "unlocked": true, "isNew": true },
    { "id": "healing-rain", "name": "治癒之雨", "cards": ["WATER", "WIND"], "requiredLevel": 4, "unlocked": false, "isNew": false }
  ],
  "equipment": { "WEAPON": null, "ARMOR": null },
  "leveledUpSinceLastSeen": true
}
```

- 回應後將 `lastSeenLevel` 更新為目前等級，所以同一個 NEW 只會出現一次。
- 對 `displayId` 發送既有的 `player.scanned`。
- 錯誤：憑證不存在 404、停用 400、資料庫不可用 503（不使用記憶體 fallback）。

### 5.2 既有端點調整

- `POST /battles/:id/cards`：`result = "cast"` 時，`skill` 增加 `lockedSkill: { id, name, requiredLevel } | null`（被替換成元素彈時才有值）。
- `POST /battles`：`battle.started` 的 `player` 增加 `level`。
- `POST /player-quests/:id/claim`：回應增加 `levelUp: { from, to, unlockedSkills } | null`。
- `BattleState.reward` 增加 `levelUp`（同上格式）。

## 6. 即時事件

```ts
| 'adventurer.level_up'

interface AdventurerLevelUpData {
  playerId: string;
  playerName: string;
  fromLevel: number;
  toLevel: number;
  unlockedSkills: { id: string; name: string; cards: ActionCardKind[] }[];
  source: 'BATTLE_VICTORY' | 'QUEST_REWARD';
}
```

- 擊敗 Boss 升級：發送到該場戰鬥的 `displayId`，排在 `reward.received` 之後。
- 公會領獎升級：發送到 `guild-01`。
- `skill.cast` 增加 `lockedSkill` 欄位（同 §5.2）。

## 7. 畫面設計重點（給小朋友）

- 字要大：等級數字至少佔畫面高度 1/6，技能名稱與卡片圖示在 2 公尺外看得清楚。
- 技能卡牆以實體卡的配色呈現（火橘、水藍、風綠、攻擊銀白），讓孩子把畫面和手上的卡對起來。
- 未學會的技能用剪影與鎖頭，不顯示傷害數值，只顯示「Lv4 解鎖」，保留期待感。
- 升級演出：金色光芒、等級數字跳動、新技能卡片翻面；音效沿用 `sfx.playVictory()`；支援 `prefers-reduced-motion`。
- 不顯示其他小朋友的資料；待機畫面不顯示排行榜。

## 8. 驗收標準

### 等級與技能

- [x] AC1：功績 0／19／20／49／50／100／160／999 分別對應 Lv1／1／2／2／3／4／5／5。
- [x] AC2：Migration 後既有冒險者的 `level` 依功績回填，`lastSeenLevel` 等於回填後的等級。
- [x] AC3：擊敗 Boss 讓 Aria 功績 20 → 30（Lv2 不變），不發送 `adventurer.level_up`；再領任務獎勵 30 → 50，升到 Lv3 並發送一次 `adventurer.level_up`（`unlockedSkills` 為火焰龍捲）。
- [x] AC4：一次跨越兩個等級時，`unlockedSkills` 包含兩個等級的技能。

### `/status`

- [x] AC5：刷 Leon 的卡顯示 Lv3、「再 50 功績升到 Lv4」，普通攻擊、元素彈、元素斬、火焰龍捲為已學會，治癒之雨與蒸氣爆發為剪影並標示解鎖等級。
- [x] AC6：升級後第一次刷卡播放 LEVEL UP 演出，新技能帶 NEW；同一張卡再刷一次不再出現 NEW。
- [ ] AC7：20 秒無操作回到待機畫面；刷行動卡顯示提示且不呼叫 API；停用卡顯示錯誤。
- [x] AC8：滿級（Lv5）顯示 MAX，所有技能已學會。

### Boss 戰

- [x] AC9：Lv1 冒險者刷火＋風，施放元素彈（基本傷害），回應與事件帶 `lockedSkill: 火焰龍捲`，終端與大螢幕顯示提示。
- [x] AC10：Lv3 冒險者刷火＋風正常施放火焰龍捲；刷水＋風仍被替換為元素彈（治癒之雨需 Lv4）。
- [x] AC11：普通攻擊、單張元素逾時、同元素失控在 Lv1 仍照原規則結算。
- [x] AC12：戰鬥中途升級（例如同一位冒險者在別處領獎）不影響進行中戰鬥的技能快照。
- [ ] AC13：擊敗 Boss 導致升級時，Boss 大螢幕勝利畫面顯示 LEVEL UP 與新技能。

### 文件與品質

- [x] AC14：Migration 與 seed 可在乾淨資料庫執行；Demo 冒險者等級為 Aria Lv2、Leon Lv3、Rookie Lv1。
- [x] AC15：README、`docs/game-design.md`、domain model、system architecture 與 `action-card-battle.md`（技能限制）已同步更新。

## 9. 風險與後續

- **功績同時決定等級與階級**：若之後調整功績獎勵，兩者節奏會一起變動；必要時再拆出獨立的經驗值。
- **實體卡與帳號狀態不一致**：孩子可能拿著別人的技能卡；本切片以帳號解鎖狀態為準，畫面提示即可，不阻擋刷卡。
- **後續延伸**：技能卡發放紀錄與補發、`/status` 顯示近期戰績、公會大廳看板顯示當日升級的冒險者。

## 10. 實作備註

- **驗證方式**：
  - AC1、AC4 由 `apps/api/src/progression/levels.spec.ts` 驗證。
  - AC9～AC12 由 `apps/api/src/battles/battles.service.spec.ts` 以 demo 冒險者（Rookie Lv1、Leon Lv3）與固定亂數驗證。
  - AC3、AC5、AC6、AC8 與 AC7 的停用卡與未知卡由 `apps/api/test/adventurer-progression.e2e-spec.ts` 對測試資料庫驗證。
  - 本機整合環境實測：`/status` 待機畫面、刷 Leon 顯示 Lv3 與技能卡牆、提高功績後刷卡播放 LEVEL UP 並出現 NEW；以 API 對 Rookie 實測火＋風被替換為元素彈。
  - AC2、AC14：migration 回填與 seed 於測試資料庫與本機開發資料庫執行，Aria Lv2、Leon Lv3、Rookie Lv1。
- **尚未驗證**：AC7 的 20 秒自動回到待機與刷到行動卡的提示、AC9 在終端與大螢幕上的提示文字（API 與事件內容已驗證）、AC13 Boss 大螢幕勝利畫面的 LEVEL UP 顯示，只經過型別檢查與建置，未在瀏覽器實測。
- **等級同步**：功績增加後由 `ProgressionService.syncLevel` 在同一筆交易內以條件更新（`level < 新等級`）寫入，確保同一次升級只回報一次。`/status` 掃卡時也會順便補正等級快取。
- **整合測試**：多個 e2e 檔案共用同一個資料庫並重設同一位 demo 冒險者，`vitest.config.e2e.ts` 改為依序執行檔案（`fileParallelism: false`）。
- **技能卡圖示**：API 以 `ELEMENT` 表示「任一元素卡」（元素彈、元素斬），前端顯示為 ✨。
