-- AlterTable: Add offlineClientId column to Order for offline deduplication
ALTER TABLE "Order" ADD COLUMN "offlineClientId" TEXT;

-- CreateIndex: Unique constraint on offlineClientId
CREATE UNIQUE INDEX "Order_offlineClientId_key" ON "Order"("offlineClientId");
