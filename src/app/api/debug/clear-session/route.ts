import { NextResponse } from 'next/server';

// Development-only endpoint to force clear Better Auth session
export async function POST() {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    try {
        // Return HTML with JavaScript to clear session cookies and storage
        return new NextResponse(
            `<!DOCTYPE html>
<html>
<body>
  <h1>Clearing session...</h1>
  <script>
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    localStorage.clear();
    sessionStorage.clear();
    setTimeout(() => { window.location.href = '/sign-in'; }, 1000);
  </script>
</body>
</html>`,
            { headers: { 'Content-Type': 'text/html' } }
        );
    } catch (error) {
        return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
    }
}
