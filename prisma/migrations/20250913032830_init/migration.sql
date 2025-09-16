-- CreateTable
CREATE TABLE "public"."Group" (
    "chatId" TEXT NOT NULL,
    "ownerTgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("chatId")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "asset" TEXT,
    "minAmount" TEXT,
    "includeUnconfirmed" BOOLEAN NOT NULL DEFAULT false,
    "recheckEvery" TEXT NOT NULL DEFAULT '24h',
    "onFail" TEXT NOT NULL DEFAULT 'soft_kick',

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attestation" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "tgId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Member" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "tgId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'verified',
    "lastCheck" TIMESTAMP(3),

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invite" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "policyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Log" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "tgId" TEXT,
    "level" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Policy_chatId_key" ON "public"."Policy"("chatId");

-- CreateIndex
CREATE INDEX "Attestation_chatId_tgId_idx" ON "public"."Attestation"("chatId", "tgId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_chatId_tgId_key" ON "public"."Member"("chatId", "tgId");

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Group"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Member" ADD CONSTRAINT "Member_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Group"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invite" ADD CONSTRAINT "Invite_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Group"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Log" ADD CONSTRAINT "Log_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."Group"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;
