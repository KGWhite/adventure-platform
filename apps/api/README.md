# Adventure Platform API (`@adventure-platform/api`)

Adventure Platform 的 NestJS 後端，採 Modular Monolith 架構，對外提供 `/api/v1` REST API 與 `/ws` WebSocket 即時事件。

## 技術架構

- **Framework**: NestJS + TypeScript
- **ORM**: Prisma（`prisma/schema.prisma`、`prisma/migrations/`、`prisma/seed.ts`）
- **Database**: PostgreSQL 16
- **Auth**: JWT（Passport）+ `RolesGuard`
- **Validation**: 全域 `ValidationPipe` + `class-validator`
- **Testing**: Vitest
- **Linting**: Oxlint

模組、API 端點與資料模型請參閱：

- [docs/architecture/system-architecture.md](../../docs/architecture/system-architecture.md)
- [docs/architecture/domain-model.md](../../docs/architecture/domain-model.md)

## 開發指令

於 repository 根目錄執行（依賴管理一律使用 `pnpm`）：

```bash
# 產生 Prisma Client
pnpm --filter @adventure-platform/api prisma:generate

# 套用資料庫遷移
pnpm --filter @adventure-platform/api db:migrate

# 寫入開發 Seed 資料
pnpm --filter @adventure-platform/api db:seed

# 啟動開發伺服器 (watch mode, http://localhost:3000)
pnpm --filter @adventure-platform/api start:dev

# 單元測試
pnpm --filter @adventure-platform/api test

# 建置
pnpm --filter @adventure-platform/api build

# 程式碼檢查
pnpm --filter @adventure-platform/api lint
```

完整本機開發流程請參閱 [docs/development/getting-started.md](../../docs/development/getting-started.md)。
