-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN     "status" "WaitlistStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN     "reviewedAt" TIMESTAMP(3),
  ADD COLUMN     "reviewedById" TEXT;

-- Backfill: everyone who already has a session (i.e. has ever signed in)
-- is grandfathered in as APPROVED so existing users aren't locked out by
-- this migration. Anyone without a session stays PENDING and must be
-- approved by an admin/owner before they can sign in.
UPDATE "User" SET "status" = 'APPROVED'
WHERE "id" IN (SELECT DISTINCT "userId" FROM "Session");

-- The workspace OWNER(s) are always implicitly approved.
UPDATE "User" SET "status" = 'APPROVED' WHERE "role" = 'OWNER';

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
