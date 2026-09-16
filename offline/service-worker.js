import { precacheAndRoute } from 'workbox/precaching';
import { createHandlerBoundToURL } from 'workbox-routers';
import { registerRoute } from 'workbox/core';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSync } from 'workbox-background-sync';

const CACHE_NAME = 'amoha-v1';
const OFFLINE_URL = '/offline';

// Claim all clients immediately when SW loads
self.clients.claim();

// Precache the app shell
precacheAndRoute(self.__WB_MANIFEST);

// Listen for updatefound event - new SW found
self.addEventListener('updatefound', () => {
  // Get the new SW's service worker registration
  const newSw = self.registration.installing;

  // Listen for state changes (installing -> waiting -> activating)
  newSw.addEventListener('statechange', () => {
    // New SW is ready and waiting to activate
    if (newSw.state === 'installed') {
      if (navigator.serviceWorker.controller) {
        // New content is available
        console.log('New content is available; please refresh.');
        
        // Show update notification to user
        // In a production app, you'd show a banner/button here
      } else {
        // There is no service worker yet, so this is the first SW
        console.log('Content is cached for offline use.');
      }
    }
  });
});

// Listen for controller change - SW actually activated
self.addEventListener('controllerchange', () => {
  // The SW has activated and taken control of all pages
  console.log('Service worker activated and controlling all pages.');
});

// Route: App shell - Cache first for HTML/CSS/JS
registerRoute(
  ({request}) => request.destination === 'document',
  new CacheFirst({
    cacheName: 'app-shell',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
    // Handle SW update: refresh page when new SW controls
    fetchDidSucceed: async ({request, event}) => {
      const response = await fetch(request);
      const sw = await navigator.serviceWorker.getRegistration();
      if (sw && sw.installing) {
        // New SW is about to become active - clone response but mark for refresh
        // The VitePWA plugin handles the actual refresh
      }
      return response;
    },
  }),
  // Exclude URLs that should always go to network
  ({url}) => url.pathname !== '/offline'
);

// Route: API responses - Network first with stale-while-revalidate fallback
registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 60, // 30 minutes
      }),
    ],
    networkTimeoutSeconds: 5,
  }),
  // Only for same-origin API calls
  ({url}) => url.origin === self.location.origin
);

// Route: Images - Cache first for app icons/logos
registerRoute(
  ({url}) => url.pathname.match(/\.(png|jpg|jpeg|svg|webp)$/),
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Route: Fonts - Stale while revalidate
registerRoute(
  ({url}) => url.pathname.match(/\.(woff|woff2|ttf|eot)$/),
  new StaleWhileRevalidate({
    cacheName: 'fonts',
  })
);

// Route: Offline fallback page
const offHandler = createHandlerBoundToURL(OFFLINE_URL);
registerRoute(
  ({url}) => url.pathname !== '/' && !url.pathname.startsWith('/api/'),
  async ({event}) => {
    try {
      const response = await fetch(event.request);
      return response;
    } catch (err) {
      return offHandler(event);
    }
  }
);

// Background sync for offline data
const SYNC_QUEUE_NAME = 'amoha-sync-queue';

const sync = new BackgroundSync(
  'amoha-sync',
  {
    maxRetentionTime: 24 * 60, // 24 hours
  }
);

// Register sync route for pending care logs
registerRoute(
  ({url}) => url.pathname === '/api/care-log/offline-sync',
  async ({request, event}) => {
    const {dataType, data} = await request.json();
    
    // Store in IndexedDB/SQLite first
    // Then queue for background sync
    
    const queueEntry = {
      id: Date.now() + Math.random(),
      dataType,
      data,
      timestamp: Date.now(),
    };
    
    // Add to background sync queue
    await sync.addRequest(event.request);
    
    return new Response(JSON.stringify({status: 'queued'}));
  },
  'POST'
);

// Log when SW is registered and ready
self.addEventListener('register', () => {
  console.log('Service Worker registering');
});

self.addEventListener('registered', () => {
  console.log('Service Worker registered');
});

self.addEventListener('activate', (event) => {
  // Remove old caches that are no longer in use
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            // Delete old caches
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  console.log('Service Worker activated', CACHE_NAME);
});

console.log('Amoha Service Worker loaded');