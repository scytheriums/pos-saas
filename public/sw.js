// Service Worker for PWA offline capability
const CACHE_NAME = 'awan-pos-v3';

// Pages and API reads the POS needs to start offline: network first, last good copy as fallback
const OFFLINE_PAGES = ['/pos'];
const OFFLINE_API_READS = ['/api/tenant/me', '/api/settings/tenant', '/api/me/permissions', '/api/shifts'];

function networkFirstWithCache(request) {
    return fetch(request).then((response) => {
        if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
    }).catch(() => caches.match(request).then((cached) => cached || Promise.reject(new Error('offline'))));
}
const OFFLINE_URL = '/offline';

// Assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
];

// Install event - cache static assets (tolerates individual failures)
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            // Cache each asset individually so one failure doesn't block install
            for (const url of STATIC_ASSETS) {
                try {
                    const response = await fetch(url, { redirect: 'manual' });
                    if (response.ok || response.type === 'opaqueredirect') {
                        await cache.put(url, response);
                    }
                } catch (e) {
                    console.warn(`[Service Worker] Failed to cache ${url}:`, e);
                }
            }
        })
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Network first, falling back to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome extension requests
    if (event.request.url.startsWith('chrome-extension://')) return;

    const url = new URL(event.request.url);

    // POS start-up reads: network first, cached copy when offline
    if (OFFLINE_API_READS.includes(url.pathname)) {
        event.respondWith(
            networkFirstWithCache(event.request).catch(() => new Response(
                JSON.stringify({ error: 'Offline - API unavailable' }),
                { headers: { 'Content-Type': 'application/json' }, status: 503 }
            ))
        );
        return;
    }

    // API requests: Network first, no cache
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response(
                    JSON.stringify({ error: 'Offline - API unavailable' }),
                    {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    }
                );
            })
        );
        return;
    }

    // The POS page itself: keep the last good copy so it can be reopened offline
    if (event.request.mode === 'navigate' && OFFLINE_PAGES.includes(url.pathname)) {
        event.respondWith(
            networkFirstWithCache(event.request).catch(() =>
                caches.match(OFFLINE_URL).then(r => r || new Response('Offline', { headers: { 'Content-Type': 'text/html' } }))
            )
        );
        return;
    }

    // For navigation requests: Network first, fallback to offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() =>
                caches.match(OFFLINE_URL).then(
                    r => r || new Response('<html><body style="font-family:sans-serif;text-align:center;padding:2rem"><h1>Offline</h1><p>No internet connection.</p></body></html>', {
                        headers: { 'Content-Type': 'text/html' }
                    })
                )
            )
        );
        return;
    }

    // For other requests: Cache first, fallback to network
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            });
        })
    );
});
