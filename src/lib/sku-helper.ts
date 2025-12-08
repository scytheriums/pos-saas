import { Prisma } from '@prisma/client';
import { generateSKU } from './sku-generator';

interface GenerateVariantSKUOptions {
    tenant: {
        autoGenerateSku: boolean;
        skuFormat: string;
        skuPrefix: string | null;
        skuCounter: number;
        name: string;
    };
    providedSku?: string;
    productName: string;
}

/**
 * Generate SKU for a product variant if auto-generation is enabled
 * Returns the SKU to use (either provided or generated)
 */
export function getVariantSKU(options: GenerateVariantSKUOptions): string | null {
    const { tenant, providedSku, productName } = options;

    // If SKU is provided and not empty, use it
    if (providedSku && providedSku.trim() !== '') {
        return providedSku;
    }

    // If auto-generate is disabled, return null (will need manual SKU)
    if (!tenant.autoGenerateSku) {
        return null;
    }

    // Generate SKU
    return generateSKU({
        businessName: tenant.name,
        counter: tenant.skuCounter,
        format: tenant.skuFormat,
        prefix: tenant.skuPrefix || undefined,
        productName
    });
}
