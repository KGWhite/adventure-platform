-- AlterTable
ALTER TABLE "adventurer_profiles" ADD COLUMN "lastSeenLevel" INTEGER NOT NULL DEFAULT 1;

-- Backfill: level is derived from accumulated merit (see apps/api/src/progression/levels.ts)
UPDATE "adventurer_profiles"
SET "level" = CASE
    WHEN "merit" >= 160 THEN 5
    WHEN "merit" >= 100 THEN 4
    WHEN "merit" >= 50 THEN 3
    WHEN "merit" >= 20 THEN 2
    ELSE 1
END;

-- Existing adventurers should not see every skill as NEW on their first /status scan
UPDATE "adventurer_profiles" SET "lastSeenLevel" = "level";
