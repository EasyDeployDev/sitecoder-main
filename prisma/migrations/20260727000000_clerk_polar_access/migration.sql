-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hasAccessPass" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "polarCustomerId" TEXT;

-- Make password optional for Clerk-backed accounts
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Default new/existing active users past waitlist
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'APPROVED';
UPDATE "User" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "User_clerkId_key" ON "User"("clerkId");
CREATE INDEX IF NOT EXISTS "User_clerkId_idx" ON "User"("clerkId");
