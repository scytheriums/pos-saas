import { NextRequest, NextResponse } from 'next/server';

// Cookie set by Better Auth on every authenticated session
const SESSION_COOKIE = "better-auth.session_token";

// ---------------------------------------------------------------------------
// In-memory rate limiter (Edge-compatible, per-instance).
// For multi-instance deployments replace with Upstash Redis.
// ---------------------------------------------------------------------------
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, resetAt: now + windowMs };
    }
    if (entry.count >= limit) {
        return { allowed: false, resetAt: entry.resetAt };
    }
    entry.count += 1;
    return { allowed: true, resetAt: entry.resetAt };
}

function getIP(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
        req.headers.get('x-real-ip') ??
        'unknown'
    );
}

const PUBLIC_PATHS = [
    '/sign-in',
    '/sign-up',
    '/api/auth',
    '/api/debug',
    '/',
    '/privacy',
    '/test-env'
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p + '?'));
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const method = req.method;
    const ip = getIP(req);

    // --- Rate limits ---
    if (pathname === '/api/auth/sign-in' && method === 'POST') {
        const r = rateLimit(`signin:${ip}`, 10, 15 * 60 * 1000);
        if (!r.allowed) return NextResponse.json(
            { error: 'Too many sign-in attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((r.resetAt - Date.now()) / 1000).toString(), 'X-RateLimit-Limit': '10', 'X-RateLimit-Remaining': '0' } }
        );
    }

    if (pathname === '/api/auth/sign-up' && method === 'POST') {
        const r = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
        if (!r.allowed) return NextResponse.json(
            { error: 'Too many sign-up attempts. Please try again later.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((r.resetAt - Date.now()) / 1000).toString(), 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0' } }
        );
    }

    if (pathname === '/api/orders' && method === 'POST') {
        const r = rateLimit(`orders:${ip}`, 60, 60 * 1000);
        if (!r.allowed) return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429, headers: { 'Retry-After': Math.ceil((r.resetAt - Date.now()) / 1000).toString(), 'X-RateLimit-Limit': '60', 'X-RateLimit-Remaining': '0' } }
        );
    }

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
