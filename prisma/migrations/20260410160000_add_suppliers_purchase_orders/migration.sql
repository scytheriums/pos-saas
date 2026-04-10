-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- AlterTable: add supplierId to Product
ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT;

-- CreateTable: Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PurchaseOrder
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "expectedDate" TIMESTAMP(3),
    "notes" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PurchaseOrderItem
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_tenantId_idx" ON "Supplier"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder"("tenantId", "status");
CREATE INDEX "PurchaseOrder_tenantId_createdAt_idx" ON "PurchaseOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
CREATE INDEX "PurchaseOrderItem_variantId_idx" ON "PurchaseOrderItem"("variantId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
