/**
 * SKU Generator Utility
 * Generates SKU codes based on tenant settings
 */

interface SKUGenerationOptions {
    businessName: string;
    counter: number;
    format?: string;
    prefix?: string;
    productName?: string;
}

/**
 * Generate SKU based on format template
 * Supported placeholders:
 * - {BUSINESS} - Business name (uppercase, no spaces)
 * - {DATE} - YYMMDD format
 * - {COUNTER} - Sequential number with leading zeros (0001, 0002, etc.)
 * - {RANDOM} - 6-character random alphanumeric
 * - {PRODUCT} - First 3 letters of product name (uppercase)
 */
export function generateSKU(options: SKUGenerationOptions): string {
    const {
        businessName,
        counter,
        format = '{BUSINESS}/{DATE}/{COUNTER}',
        prefix,
        productName
    } = options;

    let sku = format;

    // Replace {BUSINESS} - Business name formatted
    if (sku.includes('{BUSINESS}')) {
        const formattedBusiness = businessName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '') // Remove non-alphanumeric
            .substring(0, 8); // Limit to 8 chars
        sku = sku.replace(/{BUSINESS}/g, formattedBusiness || 'SHOP');
    }

    // Replace {DATE} - YYMMDD format
    if (sku.includes('{DATE}')) {
        const now = new Date();
        const yy = now.getFullYear().toString().substring(2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        sku = sku.replace(/{DATE}/g, `${yy}${mm}${dd}`);
    }

    // Replace {COUNTER} - 4-digit padded counter
    if (sku.includes('{COUNTER}')) {
        const paddedCounter = String(counter).padStart(4, '0');
        sku = sku.replace(/{COUNTER}/g, paddedCounter);
    }

    // Replace {RANDOM} - 6-character random alphanumeric
    if (sku.includes('{RANDOM}')) {
        const random = generateRandomCode(6);
        sku = sku.replace(/{RANDOM}/g, random);
    }

    // Replace {PRODUCT} - First 3 letters of product name
    if (sku.includes('{PRODUCT}') && productName) {
        const productCode = productName
            .toUpperCase()
            .replace(/[^A-Z]/g, '')
            .substring(0, 3)
            .padEnd(3, 'X'); // Pad with X if less than 3 letters
        sku = sku.replace(/{PRODUCT}/g, productCode);
    }

    // Add prefix if provided
    if (prefix) {
        sku = `${prefix}-${sku}`;
    }

    return sku;
}

/**
 * Generate random alphanumeric code
 */
function generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validate SKU format string
 */
export function isValidSKUFormat(format: string): boolean {
    const validPlaceholders = ['{BUSINESS}', '{DATE}', '{COUNTER}', '{RANDOM}', '{PRODUCT}'];
    const placeholders = format.match(/{[A-Z]+}/g) || [];

    // Check if all placeholders are valid
    return placeholders.every(placeholder => validPlaceholders.includes(placeholder));
}

/**
 * Preview SKU generation
 */
export function previewSKU(options: SKUGenerationOptions): string {
    return generateSKU(options);
}
