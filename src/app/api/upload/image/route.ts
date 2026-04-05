import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { saveImage } from '@/lib/upload';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const authResult = await getAuthUser();
        if ('error' in authResult) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        // Get form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as 'logo' | 'product';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!type || !['logo', 'product'].includes(type)) {
            return NextResponse.json({ error: 'Invalid type. Must be "logo" or "product"' }, { status: 400 });
        }

        // Determine subfolder based on type
        const subfolder = type === 'logo' ? 'logos' : 'products';

        // Save the image
        const result = await saveImage(file, subfolder);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            url: result.url,
            filename: result.filename,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
