-- AlterTable
ALTER TABLE "adventurer_profiles" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "hp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "maxHp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN "gold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "merit" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "bosses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "attackPower" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bosses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battles" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "playerHp" INTEGER NOT NULL,
    "bossHp" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "rewardGold" INTEGER NOT NULL DEFAULT 0,
    "rewardMerit" INTEGER NOT NULL DEFAULT 0,
    "rewardItem" TEXT,

    CONSTRAINT "battles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "adventurer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battles" ADD CONSTRAINT "battles_bossId_fkey" FOREIGN KEY ("bossId") REFERENCES "bosses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
