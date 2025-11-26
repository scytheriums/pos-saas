
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImage = process.argv[2];
const outputDir = path.join(process.cwd(), 'public', 'icons');

async function generateIcons() {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const sizes = [192, 512];

    for (const size of sizes) {
        await sharp(sourceImage)
            .resize(size, size)
            .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
        console.log(`Generated icon-${size}x${size}.png`);
    }
}

generateIcons().catch(console.error);
