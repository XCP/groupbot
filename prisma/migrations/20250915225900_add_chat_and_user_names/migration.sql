-- AlterTable
ALTER TABLE "public"."Group" ADD COLUMN     "chatName" TEXT;

-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "tgName" TEXT,
ADD COLUMN     "tgUsername" TEXT;
