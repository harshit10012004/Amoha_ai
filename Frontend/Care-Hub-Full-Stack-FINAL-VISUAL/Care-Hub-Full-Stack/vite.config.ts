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
      workbox: { navigateFallback: "/index.html" }
    })
  ]
});