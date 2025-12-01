// Service Worker for Predator Analytics Mobile App
// Offline functionality and caching

const CACHE_NAME = 'predator-analytics-v1';
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Skip waiting');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('Service Worker: Claiming clients');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle API requests differently
    if (url.pathname.startsWith('/api/') || url.hostname.includes('localhost')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful API responses for 5 minutes
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response if network fails
                    return caches.match(request)
                        .then(cachedResponse => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            // Return offline page for API failures
                            return new Response(JSON.stringify({
                                error: 'Offline',
                                message: 'No network connection',
                                timestamp: Date.now()
                            }), {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                        });
                })
        );
        return;
    }
    
    // Handle static assets and pages
    event.respondWith(
        caches.match(request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response.ok) {
                            return response;
                        }
                        
                        // Cache successful responses
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseClone);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Return cached index.html for navigation failures
                        if (request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        // Return offline fallback
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    console.log('Service Worker: Background sync started');
    
    // Handle any queued offline actions
    return self.registration.showNotification('Predator Analytics', {
        body: 'App is back online. Syncing data...',
        icon: '/mobile-app/icon-192x192.png',
        badge: '/mobile-app/icon-72x72.png'
    });
}

// Push notifications
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New alert from Predator Analytics',
        icon: '/mobile-app/icon-192x192.png',
        badge: '/mobile-app/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/mobile-app/icon-96x96.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/mobile-app/icon-96x96.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Predator Analytics', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'explore') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/mobile-app/')
        );
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'update-data') {
        event.waitUntil(updateData());
    }
});

function updateData() {
    console.log('Service Worker: Periodic sync - updating data');
    
    // Fetch latest data and update cache
    return fetch('/api/v1/system/status')
        .then(response => response.json())
        .then(data => {
            // Cache the updated data
            return caches.open(CACHE_NAME)
                .then(cache => {
                    return cache.put('/api/v1/system/status', new Response(JSON.stringify(data)));
                });
        })
        .catch(error => {
            console.log('Service Worker: Periodic sync failed', error);
        });
}

console.log('Service Worker: Loaded successfully');
