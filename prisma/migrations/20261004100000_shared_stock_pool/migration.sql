-- Shared stock pool with units of measure.
-- A product can keep one stock count (in its base unit) shared by all its variants,
-- each variant being a pack size: 1 of the variant = conversionFactor base units.

-- CreateEnum
CREATE TYPE "StockMode" AS ENUM ('PER_VARIANT', 'SHARED_POOL');

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN "stockMode" "StockMode" NOT NULL DEFAULT 'PER_VARIANT';
ALTER TABLE "Product" ADD COLUMN "sharedStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "poolCost" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD CONSTRAINT "Product_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "unitId" TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN "conversionFactor" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_conversionFactor_check" CHECK ("conversionFactor" >= 1);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: StockAdjustment
ALTER TABLE "StockAdjustment" ADD COLUMN "baseQuantity" INTEGER;

-- Unit names are unique per store
CREATE UNIQUE INDEX "Unit_tenantId_name_key" ON "Unit"("tenantId", "name");

-- Default units for every existing store (new stores get them at onboarding)
INSERT INTO "Unit" ("id", "name", "abbreviation", "tenantId")
SELECT gen_random_uuid()::text, u.name, u.abbreviation, t."id"
FROM "Tenant" t
CROSS JOIN (VALUES
    ('Pieces', 'pcs'),
    ('Gram', 'g'),
    ('Kilogram', 'kg'),
    ('Millilitre', 'ml'),
    ('Litre', 'L'),
    ('Pack', 'pack'),
    ('Box', 'box'),
    ('Dozen', 'dozen')
) AS u(name, abbreviation)
ON CONFLICT ("tenantId", "name") DO NOTHING;
