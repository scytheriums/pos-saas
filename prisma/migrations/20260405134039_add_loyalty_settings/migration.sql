-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "minimumRedeemPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointRedemptionRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "pointsPerCurrency" DECIMAL(10,4) NOT NULL DEFAULT 0;
