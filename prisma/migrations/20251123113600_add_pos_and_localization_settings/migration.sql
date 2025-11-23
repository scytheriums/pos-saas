-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "autoPrintReceipt" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "barcodeScanner" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IDR',
ADD COLUMN     "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "soundEffects" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeFormat" TEXT NOT NULL DEFAULT '24h',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta';
