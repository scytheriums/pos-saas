import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Simple route matchers
const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks/clerk',
    '/api/debug(.*)',
    '/',
    '/privacy',
]);

// Simpler middleware - only handle auth, let page components handle redirects
export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    // Always allow public routes
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    // If not authenticated and trying to access protected route
    if (!userId) {
        // For API routes, return 401
        if (req.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // For pages, redirect to sign-in
        const signInUrl = new URL('/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
    }

    // Authenticated - let the request through
    // Page components will handle onboarding redirects
    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
