import sharp from 'sharp';

/**
 * Optimizes an image buffer by resizing and converting to WebP.
 * 
 * @param buffer - The input image buffer
 * @param options - Optional configuration for resizing and quality
 * @returns Promise<Buffer> - The optimized image buffer
 */
export async function optimizeImage(
    buffer: Buffer,
    options: {
        width?: number;
        height?: number;
        quality?: number;
    } = {}
): Promise<Buffer> {
    const {
        width = 1200,
        height = 1200,
        quality = 80
    } = options;

    return sharp(buffer)
        .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .webp({ quality })
        .toBuffer();
}
