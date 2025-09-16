-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "policyHash" TEXT;

-- CreateTable
CREATE TABLE "public"."JoinRequest" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "tgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JoinRequest_expiresAt_status_idx" ON "public"."JoinRequest"("expiresAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_chatId_tgId_key" ON "public"."JoinRequest"("chatId", "tgId");

-- AddForeignKey
ALTER TABLE "public"."JoinRequest" ADD CONSTRAINT "JoinRequest_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Group"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;
