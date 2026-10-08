-- CreateEnum
CREATE TYPE "PlayerQuestStatus" AS ENUM ('ACCEPTED', 'COMPLETED', 'CLAIMED');

-- AlterTable
ALTER TABLE "quests" ADD COLUMN "objectiveType" TEXT NOT NULL DEFAULT 'defeat_boss',
ADD COLUMN "targetId" TEXT,
ADD COLUMN "targetCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "rewardGold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rewardMerit" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "requiredRankId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "player_quests" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "status" "PlayerQuestStatus" NOT NULL DEFAULT 'ACCEPTED',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_quests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "player_quests" ADD CONSTRAINT "player_quests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "adventurer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_quests" ADD CONSTRAINT "player_quests_questId_fkey" FOREIGN KEY ("questId") REFERENCES "quests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
