-- AlterTable PurchaseOrderItem: make variantId optional, add itemName, unit, updateVariantCost
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "variantId" DROP NOT NULL;
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "itemName" TEXT;
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "unit" TEXT;
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "updateVariantCost" BOOLEAN NOT NULL DEFAULT false;
