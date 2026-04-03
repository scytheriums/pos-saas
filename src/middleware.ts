import { NextRequest, NextResponse } from 'next/server';

// Cookie set by Better Auth on every authenticated session
const SESSION_COOKIE = "better-auth.session_token";

const PUBLIC_PATHS = [
    '/sign-in',
    '/sign-up',
    '/api/auth',
    '/api/debug',
    '/',
    '/privacy',
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    // Check for session cookie (lightweight edge-compatible check)
    const sessionCookie =
        req.cookies.get(SESSION_COOKIE) ||
        req.cookies.get(`__Secure-${SESSION_COOKIE}`);

    if (!sessionCookie?.value) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', pathname);
        return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
