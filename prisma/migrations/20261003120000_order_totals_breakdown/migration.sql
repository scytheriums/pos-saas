-- AlterTable: record how an order's total was built, so refunds can reverse it
ALTER TABLE "Order" ADD COLUMN "subtotal" DECIMAL(65,30);
ALTER TABLE "Order" ADD COLUMN "taxAmount" DECIMAL(65,30);
ALTER TABLE "Order" ADD COLUMN "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "pointsDiscount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "pointsEarned" INTEGER NOT NULL DEFAULT 0;
