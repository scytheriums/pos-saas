/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works well for single-instance deployments (dev, Electron, self-hosted).
 * For multi-instance / serverless production, replace the store with an
 * Upstash Redis client:  https://github.com/upstash/ratelimit-js
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

// Module-level store — persists as long as the Node.js process runs.
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
    /** Unique key (e.g. IP address, tenant ID). */
    key: string;
    /** Maximum number of requests in the window. */
    limit: number;
    /** Window size in milliseconds. */
    windowMs: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // First request or window expired — start a fresh window.
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    if (entry.count >= limit) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Periodically evict expired entries to prevent memory growth.
// Runs every 5 minutes.
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store.entries()) {
            if (now > entry.resetAt) store.delete(key);
        }
    }, 5 * 60 * 1000);
}
