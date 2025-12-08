import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Development-only endpoint to force clear Clerk session
export async function POST() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ message: 'No active session to clear' });
        }

        // Return HTML with JavaScript to clear session
        return new NextResponse(
            `
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Clearing session...</h1>
                <script>
                    // Clear all cookies
                    document.cookie.split(";").forEach(function(c) { 
                        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                    });
                    
                    // Clear storage
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Redirect to sign-in
                    setTimeout(() => {
                        window.location.href = '/sign-in';
                    }, 1000);
                </script>
            </body>
            </html>
            `,
            {
                headers: {
                    'Content-Type': 'text/html',
                },
            }
        );
    } catch (error) {
        return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }
}
