-- AlterEnum: permissions for returns, purchasing (suppliers + POs) and expenses
ALTER TYPE "PermissionResource" ADD VALUE 'RETURNS';
ALTER TYPE "PermissionResource" ADD VALUE 'PURCHASING';
ALTER TYPE "PermissionResource" ADD VALUE 'EXPENSES';
