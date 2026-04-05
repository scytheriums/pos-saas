-- CreateTable
CREATE TABLE "PettyCashPayout" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PettyCashPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PettyCashPayout_shiftId_idx" ON "PettyCashPayout"("shiftId");

-- CreateIndex
CREATE INDEX "PettyCashPayout_tenantId_idx" ON "PettyCashPayout"("tenantId");

-- AddForeignKey
ALTER TABLE "PettyCashPayout" ADD CONSTRAINT "PettyCashPayout_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashPayout" ADD CONSTRAINT "PettyCashPayout_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashPayout" ADD CONSTRAINT "PettyCashPayout_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
