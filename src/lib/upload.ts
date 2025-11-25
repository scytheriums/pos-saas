import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadResult {
    success: boolean;
    url?: string;
    filename?: string;
    error?: string;
}

export async function validateImage(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File size exceeds 5MB limit' };
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed' };
    }

    return { valid: true };
}

export async function saveImage(file: File, subfolder: 'logos' | 'products'): Promise<UploadResult> {
    try {
        // Validate the image
        const validation = await validateImage(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Generate unique filename
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `${randomUUID()}.${extension}`;
        const filepath = join(UPLOAD_DIR, subfolder, filename);

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save file
        await writeFile(filepath, buffer);

        // Return public URL
        const url = `/uploads/${subfolder}/${filename}`;
        return { success: true, url, filename };
    } catch (error) {
        console.error('Error saving image:', error);
        return { success: false, error: 'Failed to save image' };
    }
}

export function getImageExtension(filename: string): string {
    return filename.split('.').pop() || '';
}

export function isValidImageExtension(extension: string): boolean {
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase());
}
