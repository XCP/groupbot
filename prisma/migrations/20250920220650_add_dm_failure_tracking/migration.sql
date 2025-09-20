-- AlterTable
ALTER TABLE "public"."Member" ADD COLUMN     "dmFailure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restrictedAt" TIMESTAMP(3);
