/*
  Warnings:

  - You are about to drop the column `timestamp` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `userName` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropIndex
DROP INDEX "AuditLog_tenantId_idx";

-- DropIndex
DROP INDEX "AuditLog_timestamp_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_idx" ON "AuditLog"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_resource_idx" ON "AuditLog"("tenantId", "resource");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
