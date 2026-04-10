-- Add new ExpenseCategory enum values
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'PURCHASE_ORDER';
ALTER TYPE "ExpenseCategory" ADD VALUE IF NOT EXISTS 'PETTY_CASH';

-- Add polymorphic reference columns to Expense
ALTER TABLE "Expense" ADD COLUMN "referenceType" TEXT;
ALTER TABLE "Expense" ADD COLUMN "referenceId" TEXT;

-- Add composite index for reference lookups
CREATE INDEX "Expense_referenceType_referenceId_idx" ON "Expense"("referenceType", "referenceId");
