# Game Design Document: Physical RPG Platform

本文檔記錄 Adventure Platform (`adventure-platform`) 之核心遊戲設計、世界觀運作機制、實體互動模型、世界呈現架構與未來擴充藍圖。

---

## 1. 核心願景與設計理念 (Vision & Philosophy)

### 1.1 讓現實世界本身成為遊戲世界
本專案的目標並非打造一款「讓玩家盯著手機螢幕操作的傳統手遊」，而是構建一個**存在於實體世界中的 RPG 平台（Physical RPG Platform / Physical MMORPG Engine）**。

- **實體移動與探索**：冒險者在真實空間（活動會場、校園、營隊、主題場館或實體設施）中自由移動，尋找真人 NPC、商店、Boss、設施與其他角色。
- **冒險者專注於現實互動**：冒險者主要持有一張**實體 Adventure Card**，透過與實體場景及真人角色的面對面互動來進行遊戲，不需要在探索過程中長時間低頭盯著手機。
- **手機為世界角色與 GM 的操作工具**：智慧型手機主要由**世界角色（World Actor）**與**遊戲管理員（GM）**持有，作為身分掃描、狀態檢視、規則判定與業務操作的專用控制終端（Control）。
- **實體世界呈現（Display Node）**：藉由場地中的螢幕、看板、投影機與燈光音效裝置，將數位世界中發生的事件重新呈現在現實空間中（Presentation）。

### 1.2 數位與實體世界的雙向連結模型
實體 RPG 的本質是建立數位世界與現實空間的「雙向連結」：

```text
┌─────────────────┐       出示 Adventure Card (QR Code / NFC)    ┌──────────────────────┐
│  真人冒險者     ├─────────────────────────────────────────────►│                      │
│ (Physical Human)│                                              │                      │
└─────────────────┘                                              │                      │
                                                                 │   數位遊戲世界       │
┌─────────────────┐       即時事件呈現 (WebSocket)                │ (Digital Game World) │
│  現實實體空間   │◄─────────────────────────────────────────────┤                      │
│ (Physical Space)│         Display Node / Output                └──────────────────────┘
└─────────────────┘
```

- **Adventure ID**：將「真人玩家」連接到「數位角色」。
- **Actor Device**：讓真人 NPC、Boss、店主、GM 等角色對數位遊戲世界進行**操作（Control）**。
- **Display Node**：將數位遊戲世界中的狀態、事件與結果重新呈現在**現實世界（Presentation）**。

$$\text{Actor Device} = \textbf{Control} \quad\Big/\quad \text{Display Node} = \textbf{Presentation}$$

兩者職責嚴格分離，構成了現實與數位之間的完整閉環。

---

## 2. Adventure ID、憑證技術與 Scanner 抽象 (Identity & Scanner Abstraction)

### 2.1 第一階段 Adventure ID 決策：實體 QR Code Adventure Card
在第一階段 MVP 中，**暫時不使用 NFC**，改採 **QR Code Adventure ID**：
- 每位冒險者持有一張實體 Adventure Card，卡片上印製唯一的 **QR Code** 用於身分識別。
- **決策動機**：第一階段主要目的是以極簡成本快速驗證核心閉環：
  $$\text{Adventure ID} \longrightarrow \text{實體互動} \longrightarrow \text{Game Server} \longrightarrow \text{Game Logic} \longrightarrow \text{WebSocket Event} \longrightarrow \text{Display Node}$$
- 不希望第一階段因為 NFC Reader 設備採購、NFC Tag 格式相容性或行動瀏覽器權限限制（例如 iOS Safari 對 Web NFC 的限制）而阻礙遊戲核心流程的驗證。

### 2.2 Adventure ID 與掃描載體技術分離 (Identity vs Carrier Separation)
架構設計上，**嚴禁將 QR Code 視為 Adventure ID 本身**：
- **Adventure ID**：是遊戲世界中的玩家核心身分（Player Identity）。
- **QR Code**：僅是第一階段 Adventure ID 的其中一種**實體承載憑證（Carrier / Credential）**。

```text
Adventure ID (遊戲世界玩家身分)
     │
     ▼
Credential (實體憑證載體: 第一階段 QR Code / 未來 NFC Tag / Barcode)
     │
     ▼
Scanner (掃描適配器: Camera / NFC Reader / Manual Debug)
     │
     ▼
Player Identity (Game Server 解析出的真實冒險者)
```

- **第一階段**：
  - `Credential` = QR Code
  - `Scanner` = 裝置相機鏡頭（Camera）／QR 掃描器
- **未來階段**：
  - `Credential` = NFC Card / NFC Tag
  - `Scanner` = NFC Reader（Web NFC / 外接 USB / 藍牙讀卡機）

不論前端使用何種方式讀取，統一呼叫 `scanCredential() -> adventureId / credentialToken`。**核心遊戲領域邏輯（Battle、Shop、Guild、Quest、Boss、Display）嚴格不知道、也不應在乎 Adventure ID 是透過 QR Code、NFC、條碼或手動輸入所取得。**

### 2.3 Scanner 抽象架構 (Scanner Abstraction)
系統在輸入層保留高度可插拔的 Scanner 抽象：

```text
Scanner (抽象介面)
├── QRScanner       (第一階段核心：利用手機/筆電 Camera 進行圖像辨識)
├── NFCScanner      (未來擴充：Web NFC / 外接 Reader 讀取晶片 UID)
├── ManualScanner   (除錯與開發專用：鍵盤輸入或快速選擇測試玩家)
└── FutureScanner   (未來生物辨識、條碼或自定義硬體)
```

- **統一輸出規格**：所有 Scanner 實作皆輸出標準之 `AdventureIdentity`（字串 Token）。
- **邊界防護**：Battle、Shop、Guild、Quest、Boss、Display 等業務模組**只依賴解析後的 Player Identity，嚴格不得依賴 QR Code 或特定掃描硬體**。

### 2.4 QR Code Payload 規範
**第一階段嚴禁將完整的玩家狀態資料編碼寫入 QR Code 中。**

- **QR Code 內容**：僅包含唯一憑證代碼或 Token，例如：
  `adventure://player/{credentialToken}` 或 `cuid_cl9xyz...`
- **嚴格禁止包含**：
  - 金幣（Gold）
  - 功績（Merit）
  - 等級（Level）
  - 背包道具（Inventory）
  - 任務進度（Quest）
  - 當前生命值（HP）
- **設計哲學**：QR Code 是**靜態實體媒介**，而玩家資料是**動態伺服器狀態（Server State）**。QR Code 只負責回答「這名玩家是誰？」，角色數值與進度一律向 Game Server 即時查詢。

### 2.5 安全性與 Credential 映射模型 (Security & Credential Mapping)
架構上**切勿直接假設 QR 內容即為資料庫玩家主鍵（`Player.id`）**。

資料庫採用 `Player` (1) $\longleftrightarrow$ `Credential` (N) 映射架構：
```text
Player (AdventurerProfile)
  └── Credential (id, type, value, enabled, adventurerId)
        ├── [QRCODE] 憑證 A (第一階段 Adventure Card)
        ├── [NFC]    憑證 B (未來配發之 NFC 徽章卡)
        └── [RFID]   憑證 C (特殊手環或備用卡)
```

**架構優勢**：
1. **防偽與輪替（Token Rotation）**：可隨時替換過期或洩漏之憑證 Token。
2. **失卡補發（Lost Card Replacement）**：實體卡片遺失時，僅需作廢（Revoke）該 Credential，並綁定新卡，冒險者的等級、金幣與裝備資料毫髮無傷。
3. **無縫升級 NFC**：同一個冒險者在第一階段使用 QR Card，未來發放 NFC Card 後，直接為該帳號追加綁定一筆 NFC Credential，兩張卡片皆可識別為同一名 Player，完全不需要重新註冊或轉移角色。

### 2.6 開發與測試輔助：手動輸入模式 (Manual Credential Input)
即使第一階段以 QR Code 為主，系統在前端與測試環境中仍**強制保留手動輸入模式（ManualScanner）**：
- 開發者可於介面中直接輸入測試 Token 或自下拉選單快速代入冒險者。
- 確保在無相機設備、本機無 HTTPS 鏡頭權限、或自動化測試流程中，核心遊戲開發與驗證工作完全不受阻礙。

### 2.7 NFC 平滑遷移路徑 (NFC Migration Path)
未來獲得 NFC 設備與 Tag 後，升級路徑如下：

```text
[目前第一階段]
Camera ──► QRScanner ──► credentialToken ──┐
                                           │
[未來 NFC 階段]                            ▼
NFC Reader ─► NFCScanner ──► credentialToken ─► Game Server (驗證並解析 Player)
                                                   │
                                                   ▼ (以下 100% 維持不變)
                                            Player & Player State
                                            World Node
                                            Rule Engine
                                            Interaction
                                            Battle / Shop / Guild / Quest
                                            WebSocket Event
                                            Display Node
```

- **遷移本質**：僅替換最外層的 **Input Adapter**，Game Server 及其核心業務邏輯**完全零重構**。

---

## 3. 核心領域抽象架構 (Core Unified Abstraction)

世界中存在形形色色的設施與事件（武器店、防具店、藥店、鍛造屋、神殿、酒館、銀行、拍賣場、競技場、傳送門、城門、寶箱、NPC、Boss、幸運屋等）。為避免為每一種玩法重複建立封閉且僵化的獨立架構，系統統一抽象為以下核心架構：

$$\text{Player} + \text{World Node} + \text{Interaction} + \text{Rule} \longrightarrow \text{Updated Player State}$$

```text
┌──────────────┐       ┌───────────────────────────────┐
│    Player    │       │          World Node           │
│  (冒險者身分)│       │  ┌─────────┬─────────┬──────┐ │
└──────┬───────┘       │  │ Input   │ Actor   │Output│ │
       │               │  │(Scanner)│ Control │(Disp)│ │
       │               │  └─────────┴─────────┴──────┘ │
       │               └───────────────┬───────────────┘
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │          Rule Engine          │
       │ (依 Player State 檢驗互動條件)│
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │          Interaction          │
       │       (執行之遊戲行為)        │
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │      Updated Player State     │
       │    (扣除金幣/獲得功績/更新)   │
       └───────────────┬───────────────┘
                       ▼
       ┌───────────────────────────────┐
       │         Realtime Event        │
       │  (推播至 Display Node 呈現)   │
       └───────────────────────────────┘
```

### 3.1 核心元素定義
1. **Player（玩家／冒險者）**：
   - 冒險者的核心身分與基本檔案（ID、稱號、綁定之實體 Credential）。
2. **World Node（世界節點）**：
   - 存在於世界中的實體或虛擬互動點。可細分為三大部分：
     - **Input**：Scanner（相機掃描 QR Code、手動輸入或未來 NFC）。
     - **Actor Control**：真人 World Actor 手機操作端。
     - **Output**：Display Node（螢幕、看板、音效、機關）。
3. **Interaction（互動行為）**：
   - 玩家在該節點上所能發起的具體行為（購買裝備、接取委託、交回任務、發起戰鬥挑戰、請求治療、開啟寶箱等）。
4. **Rule（規則引擎）**：
   - 判定玩家是否滿足執行某項 Interaction 的前提條件（功績門檻、金幣餘額、前置任務完成狀態、特定職業或裝備等）。
5. **Player State（玩家狀態）**：
   - 冒險者目前的所有遊戲狀態集合（等級、HP/MP、職業、功績 Merit、金幣 Coins、裝備、進行中與已完成任務、好感度、Buff/Debuff 等）。

---

## 4. 世界呈現裝置 (Display Node)

Display Node 是將數位遊戲世界的變化「投影」回實體空間的關鍵窗口。

### 4.1 核心原則：控制與呈現分離 (Control vs Presentation)
- **Actor Device = Control**：手機主要供真人 NPC / Boss / 店主 / GM 操作，注重快速點擊、身分感應與流程推進。
- **Display Node = Presentation**：大型螢幕或看板供冒險者與現場旁觀者觀看，注重沉浸感、動畫反饋與氛圍營造。

### 4.2 典型使用情境

#### A. Boss 戰鬥螢幕 (Boss Battle Display)
- 位於 Boss 決鬥場地旁之大螢幕（電視、投影機或大型外接螢幕）。
- **流程（第一階段 QR Code MVP）**：
  1. 冒險者出示 Adventure Card，Boss 扮演者使用手機相機掃描卡片上的 QR Code。
  2. Boss Actor Web 取得 `credentialToken`，發送 Command 請求 Game Server 驗證。
  3. Server 依憑證解析出 Adventurer 身分，建立 Battle 房間。
  4. Display Node 透過 WebSocket 即時切換至戰鬥畫面。
- **呈現內容**：
  - 挑戰者玩家名稱、隊伍陣容、當前 HP。
  - Boss 名稱、等級、當前 HP 數值與血條。
  - 裝備、Buff / Debuff 圖標。
  - 攻擊動作動畫、Boss 技能特效、受擊傷害飄字（Damage Floating Text）。
  - 勝利（Victory）／戰敗（Defeat）全螢幕動效。
  - 獲得之經驗值（EXP）、金幣（Gold）、功績（Merit）與掉落戰利品（Loot）。

#### B. 公會狀態終端 (Guild Adventurer Status Terminal)
- 設置於冒險者公會內的固定自助螢幕（筆記型電腦螢幕、平板或直立式觸控螢幕）。
- **第一階段零硬體門檻**：直接使用筆記型電腦或平板內建相機鏡頭作為 QR Scanner，無需外接專用讀卡器。
- 玩家無須低頭看手機，走到終端出示卡片掃描 QR Code，即可在大螢幕上查看自己的完整角色立繪與狀態：
  - 冒險者姓名、等級、目前階級徽章（Rank Badge）。
  - 生命值（HP）、經驗值（EXP）、金幣餘額（Gold）、公會功績總額（Merit）。
  - 目前裝備之武器、防具與飾品。
  - 進行中任務（Current Quest）與完成進度。
  - 成就榮譽與資格證狀態。
- **資訊探索即 Gameplay**：將查閱不同面向的資訊分佈在世界各設施中：
  - **公會（Guild）**：查閱完整冒險者身分、階級與任務。
  - **銀行（Bank）**：查閱金幣資產與定存明細。
  - **神殿（Temple）**：查閱 HP 上限、詛咒與異常狀態。
  - **酒館（Tavern）**：查閱謠言情報與懸賞公告。
  - **排行榜看板（Ranking Board）**：查閱公會排行榜與榮譽榜單。

#### C. 公共世界看板 (Public Display)
- 不需要玩家主動掃卡，作為實體場景中的長駐背景動態看板，讓世界顯得生生不息：
  - **冒險者排行榜**（如：前三名功績領先者）。
  - **今日 Boss 討伐捷報**（如：黑騎士已被討伐 17 次、巨龍討伐 3 次、魔王討伐 0 次）。
  - **世界突發事件公告**（如：城門遭受怪物襲擊倒數）。
  - **全伺服器跑馬燈廣播**（如：某某冒險者剛剛晉升為黃金階級！）。

---

## 5. 事件驅動設計與通訊架構 (Event-Driven Architecture)

### 5.1 職責劃分：Command 與 Event 分離
- **REST API**：負責**命令（Command）**與主動操作（掃描玩家、發起戰鬥、執行攻擊、購買道具、核發任務）。
- **WebSocket**：負責**即時事件推播（Realtime Event）**（戰鬥開始、HP 扣減、攻擊動畫觸發、勝利結算、狀態變更）。

```text
[Adventure Card (QR)] ──(相機掃描)──► [Actor 手機 Web] ──(REST API)──► [Game Server]
                                                                          │
                                                                   (規則裁決與計算)
                                                                          │
                                                                          ▼
[Display Web] ◄──────────────(WebSocket 推播 Event)───────────────────────┘
```

### 5.2 Display Node 之輕量化無狀態設計
Display Node **不應**內嵌複雜的遊戲規則或業務判斷邏輯。Game Server 負責所有裁決與數值計算，Display 僅作為事件的「渲染器」：
1. Display 載入時開啟對應路徑（例如 `/display/boss-01` 或 `/display/guild-01`）。
2. 與 Game Server 建立 WebSocket 連線並訂閱該節點頻道。
3. 接收後端推送之標準 Event 物件並播放對應畫面／動畫。

#### 事件清單範例
- `player.scanned`：冒險者憑證感應／掃描成功。
- `player.status.updated`：冒險者狀態變更。
- `battle.started`：對戰開始，載入戰鬥舞台。
- `battle.attack`：發動攻擊，播放攻擊或技能動畫。
- `battle.damage`：受擊扣血，顯示受傷動畫與飄字。
- `battle.victory`：勝利結算，播放勝利特效並依 Payload 呈現獎勵（Gold/Merit/Loot）。
- `battle.defeat`：戰敗結算。
- `quest.completed`：任務完成回報成功。
- `reward.received`：獲得實體或虛擬獎勵。
- `player.level_up`：等級或階級提升。
- `world.event.started`：全域世界事件啟動。

#### 事件 Payload 範例（`battle.victory`）
```json
{
  "event": "battle.victory",
  "timestamp": 1728300000000,
  "payload": {
    "battleId": "btl_cl9xyz123",
    "playerId": "adv_cm1abc456",
    "playerName": "Aria",
    "bossId": "boss_black_knight",
    "bossName": "黑騎士",
    "exp": 150,
    "gold": 50,
    "merit": 10,
    "loot": [
      { "itemId": "item_dark_fragment", "name": "暗黑碎片", "quantity": 1 }
    ]
  }
}
```

---

## 6. 真人世界角色與 Actor Mode (World Actors & Roles)

### 6.1 角色扮演模型 (Role Model)
```text
Player (實體探索者)
└── Adventurer (持 Adventure Card 之冒險者)

World Actor (真人扮演者，透過手機端操作控制)
├── Guild Staff (公會櫃台幹事 / 審查員)
├── Merchant (商人體系)
│   ├── Weapon Merchant (武器店老闆)
│   ├── Armor Merchant (防具店老闆)
│   └── Potion Merchant (藥水商人)
├── NPC (世界居民 / 任務給予者 / 劇情推動者)
├── Boss (首領怪物 / 決鬥者，如黑騎士)
├── Blacksmith (鍛造屋工匠)
├── Priest (神殿祭司 / 醫者)
├── Gate Keeper (城門守衛 / 關卡守護者)
└── Event Actor (特殊節慶 / 限時突發事件角色)

GM (最高管理員)
└── World Master (全域掌控者、事件調度、即時仲裁)
```

### 6.2 Actor Mode 機制
- 工作人員以手機登入後，可依活動安排選擇目前擔任的 **Actor Mode**（如切換為武器店主或黑騎士）。
- 手機作為專用操作設備，具備相機鏡頭掃描 QR Code、權限自訂、折扣給予、隱藏任務觸發與戰鬥操作等能力。

---

## 7. 具體設施玩法範例 (World Node Scenarios)

### 7.1 商店玩法（第一階段 QR Code MVP 流程）
1. 工作人員以手機開啟 Actor Web，切換至 `Weapon Shop` 模式。
2. 冒險者出示 Adventure Card，店主以手機鏡頭掃描卡片 QR Code。
3. 取得 `credentialToken`，Game Server 驗證解析出該冒險者身分。
4. 前端呼叫 `GET /shop/items?playerId=...`，載入專屬於該玩家可購商品清單（一般、功績限制、任務解鎖、隱藏商品）。
5. 店主與冒險者面對面議價、介紹裝備，店主於手機端選擇商品並確認購買。
6. 發送 Purchase API，Game Server 扣除玩家金幣並加入裝備庫存。
7. WebSocket 推播成功交易事件，若店內設有 Display Node，同步播放購得裝備之視覺反饋。
> **未來若切換為 NFC**：僅需將第 2 步鏡頭掃描替換為 NFC 感應，其餘步驟 100% 保持不變。

### 7.2 Boss 戰鬥玩法（以黑騎士為例）
- **真人演繹**：工作人員進入 `Boss Mode -> 黑騎士`。
- **雙螢幕分工**：
  - **Boss 手機（Actor Device）**：使用鏡頭掃描冒險者 QR Code，出示攻擊按鈕、釋放技能、施加 Debuff、結算勝負。
  - **場地螢幕（Display Node）**：同步以震撼視覺展示血條扣減、攻擊動畫與勝利結算。
- **流程獨立性**：Battle 領域計算與結算完全只認知 Player Identity，不受 QR Code 實體細節影響。

### 7.3 冒險者公會 (Adventurer Guild)
- 負責委託接取、驗證、金幣與功績核發、階級審核，並配置公會狀態終端（利用設備內建鏡頭掃描 QR）供冒險者檢視個人全貌。

---

## 8. 經濟與資源雙軌模型 (Dual-Track Economy)

```text
                      ┌──────────────────────┐
                      │   任務與世界事件完成 │
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │       金幣 Coins        │     │       功績 Merit        │
    │      (可消耗資源)       │     │     (累積成就/地位)     │
    └────────────┬────────────┘     └────────────┬────────────┘
                 │                               │
    ┌────────────┴────────────┐     ┌────────────┴────────────┐
    │ - 購買武器、防具與道具  │     │ - 提升冒險者公會階級    │
    │ - 強化裝備與神殿維護    │     │ - 解鎖高階任務與 Boss   │
    │ - 支付娛樂設施與活動費  │     │ - 解鎖特殊商店隱藏商品  │
    │ - 繳納通行費與雇用服務  │     │ - 影響 NPC 態度與劇情   │
    └─────────────────────────┘     └─────────────────────────┘
```

- **階級規劃草案（數值待平衡調整）**：初心者 (0)、青銅 (10)、白銀 (30)、黃金 (80)、英雄 (200)。

---

## 9. 機率型遊戲與娛樂設施規範 (Luck House & Mini-games)

- **玩法**：命運酒館、幸運屋、怪物競猜、骰子點數、卡牌比大小、寶箱抽選。
- **全年齡安全規範**：嚴格禁止真實貨幣下注、嚴禁任何形式之現金或等值物兌換，純粹作為冒險世界中的虛擬娛樂。

---

## 10. 長期輸出裝置抽象：World Output Node

目前以螢幕顯示為主的 **Display Node**，在長期規劃中將泛化為 **World Output Node**，納入多元感官與實體機關：

```text
World Node
├── Input (Scanner: 第一階段 QR Camera / 未來 NFC / Manual)
├── Actor Control (Actor Device: Phone Web)
└── Output (World Output Node)
    ├── Display (電視 / 螢幕 / 平板 / 投影機)
    ├── Audio (音響音效 / 勝利號角廣播)
    ├── Light (RGB 燈光特效 / 環境燈暗轉)
    └── Physical Effect (實體機關 / 寶箱自動解鎖 / 房門開啟)
```

**範例情境（Boss 擊敗之全場聯動）**：
當黑騎士 HP 歸零時，Game Server 派發 `battle.victory` 事件：
- **Display**：播放全螢幕 Victory 金色動畫與戰利品列表。
- **Audio**：音響即時奏響凱旋交響樂。
- **Light**：房間燈光轉為暖金勝利色調。
- **Physical Effect**：通往下一區域的實體電子門鎖自動解鎖打開。

> [!NOTE]
> 目前第一階段僅專注實作與驗證 **Display Output**，其他物理機關留待後續階段演進。

---

## 11. 第一階段 MVP 與首個 POC 定義 (Phase 1 Boss Battle POC)

### 11.1 第一階段驗證目標
> **「玩家出示實體 QR Code Adventure Card 後，Server 能讓指定的 Display 即時產生畫面變化。」**

避免在初期鋪張開發過多複雜內容，優先打通端到端技術通路。

### 11.2 技術選型與路由規劃
- **憑證形式**：印有 QR Code 之實體卡片（Adventure Card）。
- **掃描技術**：Web 端的 Camera 掃描（相機鏡頭）+ 手動輸入模式（Manual Debug）。
- **前端技術**：Web Browser（React PWA，跨螢幕相容）。
- **後端技術**：NestJS Modular Monolith API + WebSocket Gateway。
- **通訊模式**：Command 走 REST API，Realtime Event 走 WebSocket。
- **Display 網址範例**：
  - `/display/boss-01`
  - `/display/guild-01`
  - `/display/shop-01`

### 11.3 第一個 POC：Boss Battle POC 執行步驟
首個可運行的 POC 聚焦於驗證核心六層閉環：
$$\text{Adventure ID (QR)} + \text{Actor Device} + \text{Game Server} + \text{World State} + \text{WebSocket} + \text{Display Node}$$

```text
  [1. 準備資料]               [2. 建立連線]              [3. 掃描發起]
  建立 2 冒險者             Display Browser           Boss 手機 Camera
  印出 2 張 QR 冒險者卡     開啟 /display/boss-01      掃描卡片 QR Code
  建立 1 Boss               連線至 WebSocket           發送 POST /battle/start
  建立 1 Boss Display                                  (攜帶 credentialToken)
          │                         │                          │
          └─────────────────────────┼──────────────────────────┘
                                    ▼
                          [4. Server 解析 Player 並建立 Battle]
                                    │
                                    ├─► WebSocket 推播 battle.started
                                    ▼
                          [5. Display 顯示對戰]
                          呈現 Player / Boss / HP
                                    │
                                    ▼
                          [6. Boss Actor 按下 Attack]
                          發送 POST /battle/attack
                                    │
                                    ├─► Server 計算扣減傷害
                                    ├─► WebSocket 推播 battle.damage
                                    ▼
                          [7. Display 播放打擊動畫]
                          血條扣減、飄出傷害數字
                                    │
                                    ▼
                          [8. Boss HP 歸零結算]
                          Server 觸發戰勝結算
                                    │
                                    ├─► 發放 Gold 與 Merit
                                    ├─► WebSocket 推播 battle.victory (附帶 Loot)
                                    ▼
                          [9. Display 播放 Victory 動畫]
                          顯示獲得經驗、金幣、功績與戰利品
```

**驗證標準**：
完成上述 POC 即代表基礎實體 RPG 骨幹成立，後續即可安心疊加 Guild、Shop、NPC、裝備系統與多螢幕擴充。

---

## 12. 設計狀態分類矩陣 (Design Status Matrix)

### 12.1 已確認方向 (Confirmed Directions)
- [x] **實體互動核心**：Adventure ID（實體識別）、Actor Device（真人控制）、Display Node（現實世界呈現）、Game Server（規則裁決）。
- [x] **第一階段憑證技術**：QR Code 實體卡片（暫不使用 NFC，避免硬體與相容性阻塞）。
- [x] **憑證與身分解耦**：QR Code 僅是 Credential Carrier，遊戲核心只識別 Player Identity。
- [x] **控制與呈現分離**：Actor Device = Control，Display Node = Presentation。
- [x] **通訊協定架構**：Command 採 REST API，即時狀態與動畫推播採 WebSocket。
- [x] **三位一體 World Node**：`Input (Scanner) + Actor Control + Output (Display Node)`。
- [x] **雙軌經濟資源**：流通消耗金幣（Coins）與成就資格功績（Merit）。
- [x] **年齡安全規範**：機率型娛樂設施嚴禁法幣賭博與現金兌現。

### 12.2 已完成實作項目 (Completed Vertical Slices)
- [x] **QR Code Adventure Card 憑證架構**：實體卡片印製靜態 Token，動態角色資料完全由 Server 權威維護。
- [x] **Scanner 雙模式支援**：手機鏡頭掃描 QR Code，內建 Manual Credential Input 開發除錯模式。
- [x] **Boss Actor Web (`/actor/boss`)**：手機端戰鬥終端，大按鈕單手操作，支援玩家身分解析、戰鬥發起、單手點擊 Attack。
- [x] **Boss Display Node (`/display/boss-01`)**：TV / 大螢幕沉浸式 RPG HUD，即時血條動畫、受擊飄字、震動動效、勝利與獎勵結算、自動重置計時器。
- [x] **純 Node.js RFC 6455 WebSocket Gateway**：支援即時雙向連線與 SSE 串流備援，推播標準遊戲事件。
- [x] **Server 權威戰鬥與獎勵更新**：Server 計算扣血與勝負，勝利後自動更新 Player `gold` 與 `merit` 並寫入 `merit_ledgers`。
- [x] **Guild + Quest Vertical Slice MVP (首個完整 RPG Gameplay Loop)**：
  - 完整閉環：**Adventure Card → 公會掃 QR (`/guild`) → 顯示角色狀態 → 接任務 (`Defeat Black Knight`) → 前往 Boss 戰鬥 → 擊敗黑騎士 → Server 權威更新 Quest Progress 至 completed → 回公會再次掃卡 → 顯示 QUEST COMPLETE → Claim Reward 領取報酬 → 寫入 Gold / Merit / MeritLedger**。
  - **公會實體終端機 (`/guild`)**：適合平板、筆電與固定 Kiosk 終端，包含相機掃描、手動測試代碼、冒險者狀態面板、任務接取、進度條與華麗任務完成領獎動效。
  - **Server 決定權威與解耦架構**：Boss 戰鬥模組、Boss Actor 與 Boss Display 完全不涉及 Quest 規則；戰鬥勝利經由 Domain Handler 依據 Player ID 與 Boss ID 自動更新任務進度並推播 WebSocket 事件。
  - **獎勵所有權明確切分 (Reward Ownership)**：明確劃分 Battle Reward（討伐黑騎士勝利發放）與 Quest Reward（公會委託達成領取）。
  - **防重複領獎機制**：嚴格交易驗證，防止重複完成與重複 Claim。
- [x] **Demo 測試資料**：Aria (`cred-demo-001`)、Leon (`cred-demo-002`)、Black Knight (`boss-01`)、Defeat the Black Knight Quest (`quest-defeat-black-knight`)。

### 12.3 下一步候選流程 (Next Candidates)
1. **Shop + Equipment 垂直切片**：武器店／防具店／道具店 World Node，使用戰鬥與任務獲得之金幣購買裝備，並提供冒險者裝備與背包檢視。
2. **Rank Up 晉升儀式**：累積足夠功績後，於公會終端發起階級晉升考核並切換稱號與資格證。
3. **Guild Status Terminal 大螢幕 (`/display/guild-01`)**：公會大廳冒險者名冊與即時看板。

### 12.4 待確認與待討論項目 (Pending Discussion)
- [ ] **未來 NFC Reader 最終硬體方案**：評估 Web NFC、手持工業 POS、外接 USB 讀卡機或藍牙讀卡器在未來活動現場的穩定性。
- [ ] **是否需要 Native App**：長期評估純 Web PWA 是否足以應對各種週邊與低延遲通訊，或需封裝 Native Shell。
- [ ] **World Output 物理機關聯動**：實體燈光（DMX / Zigbee）、音響與自動門鎖之通訊協定（MQTT / Webhooks）。
- [ ] **多 Display 同步機制**：同一區域若有多個螢幕時的頻道分組與同步機制。
- [ ] **離線與弱網容錯 (Offline Mode)**：戶外偏遠營地之本地快取驗證與延後同步策略。
- [ ] **數值與經濟平衡**：任務報酬、升級門檻與商品定價之公式定案。
