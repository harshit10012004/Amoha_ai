import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Care Hub",
        short_name: "CareHub",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f8f7",
        theme_color: "#0f766e"
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^http:\/\/127\.0\.0\.1/],
        offlineEcho: {
          // Search destination when offline
          policy: "network-first",
          // Optional override for the workbox Echo.
          // If you want to add runtime caching, use workbox-routers
        },
        plugins: [
          // Expiration plugin for all caches
          new (require('workbox-expiration').ExpirationPlugin)({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          })
        ],
        runtimeCaching: [
          // Cache API responses for 30 minutes
          {
            urlPattern: /^http:\/\/10\.0\.0\.0\/api\/|^http:\/\/192\.168\.0\.0\/api\/|^http:\/\/localhost\/api/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-responses',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Cache app shell HTML
          {
            urlPattern: /^http:\/\/127\.0\.0\.1\/|^http:\/\/localhost\/|^\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-shell',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
          // Cache images
          {
            urlPattern: /\.(png|jpg|jpeg|svg|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    })
  ]
});