-- AlterTable: Add enableStockManagement to Tenant
ALTER TABLE "Tenant" ADD COLUMN "enableStockManagement" BOOLEAN NOT NULL DEFAULT true;
