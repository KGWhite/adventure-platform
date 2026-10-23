-- CreateEnum
CREATE TYPE "ActionCardType" AS ENUM ('STRIKE', 'FIRE', 'WATER', 'WIND');

-- CreateTable
CREATE TABLE "action_cards" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "ActionCardType" NOT NULL,
    "label" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "action_cards_value_key" ON "action_cards"("value");
