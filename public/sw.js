// Service Worker for PWA offline capability
const CACHE_NAME = 'awan-pos-v1';
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

    // For navigation requests: Network first, fallback to offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
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
