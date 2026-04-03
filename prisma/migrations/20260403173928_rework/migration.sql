-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_tenantId_fkey";

-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "autoGenerateSku" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skuCounter" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "skuFormat" TEXT NOT NULL DEFAULT '{BUSINESS}/{DATE}/{COUNTER}',
ADD COLUMN     "skuPrefix" TEXT;

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
