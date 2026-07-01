-- AlterTable
ALTER TABLE "Chat"
  ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Not started',
  ADD COLUMN     "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN     "icon" TEXT,
  ADD COLUMN     "properties" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN     "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN     "updatedAt" TIMESTAMP(3);

-- Backfill updatedAt for existing rows, then enforce NOT NULL
UPDATE "Chat" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Chat" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Chat_status_idx" ON "Chat"("status");

-- CreateIndex
CREATE INDEX "Chat_archived_idx" ON "Chat"("archived");

-- CreateTable
CREATE TABLE "PropertyDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDef_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyDef_order_idx" ON "PropertyDef"("order");
