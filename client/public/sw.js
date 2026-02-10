const CACHE_NAME = 'savemedia-v1.0.0';
const STATIC_CACHE_NAME = 'savemedia-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'savemedia-dynamic-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/instagram-downloader',
  '/tiktok-downloader',
  '/youtube-downloader',
  '/src/main.tsx',
  '/src/index.css',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/downloads',
  '/api/auth/user',
  '/sitemap.xml'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install Event');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching Static Assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate Event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE_NAME && 
                   cacheName !== DYNAMIC_CACHE_NAME &&
                   cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log('Service Worker: Removing old cache', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first with fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }
  
  // Handle static assets with cache-first strategy
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font' ||
      request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Default strategy for other requests
  event.respondWith(networkFirstStrategy(request));
});

// Network First Strategy (for API calls and dynamic content)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      
      // Don't cache POST requests or download endpoints
      if (request.method === 'GET' && !request.url.includes('/download/')) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network request failed, trying cache', error);
    const cacheResponse = await caches.match(request);
    
    if (cacheResponse) {
      return cacheResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/') || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cacheResponse = await caches.match(request);
  
  if (cacheResponse) {
    return cacheResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache first strategy failed', error);
    throw error;
  }
}

// Navigation Handler (for SPA routing)
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Navigation request failed, serving app shell');
    const cacheResponse = await caches.match('/');
    return cacheResponse || new Response('App offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Background Sync for failed download requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'download-retry') {
    event.waitUntil(retryFailedDownloads());
  }
});

async function retryFailedDownloads() {
  console.log('Service Worker: Retrying failed downloads');
  // Implementation would depend on how you want to handle offline downloads
  // This could involve IndexedDB to store failed requests and retry them
}

// Push Notification Handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Your download is ready!',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Download',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('SaveMedia', options)
  );
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message Handler for client communication
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('Service Worker: All caches cleared');
}

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-downloads') {
    event.waitUntil(updateDownloadStatus());
  }
});

async function updateDownloadStatus() {
  // Check for download status updates in the background
  console.log('Service Worker: Checking download status updates');
}

// Error Handler - Suppress extension-related errors
self.addEventListener('error', (event) => {
  // Ignore errors from browser extensions
  if (event.error && (
    event.error.message?.includes('NetworkMonitor') ||
    event.error.message?.includes('extension') ||
    event.error.message?.includes('inject_main')
  )) {
    return; // Silently ignore extension errors
  }
  console.error('Service Worker: Unhandled error', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  // Ignore promise rejections from browser extensions
  const reason = event.reason?.message || event.reason?.toString() || '';
  if (
    reason.includes('NetworkMonitor') ||
    reason.includes('extension') ||
    reason.includes('inject_main') ||
    reason.includes('port is moved into back/forward cache')
  ) {
    event.preventDefault(); // Prevent error from propagating
    return; // Silently ignore extension errors
  }
  console.error('Service Worker: Unhandled promise rejection', event.reason);
});

console.log('Service Worker: Script loaded successfully');
