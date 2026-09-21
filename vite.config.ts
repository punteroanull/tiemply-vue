import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  // tsconfig.app.json and vitest.config.ts both resolve "@/", but this did not, so an
  // import that type-checked and passed its tests still broke the production build.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    vue(),
    VitePWA({
      // "prompt", not "autoUpdate": this app is used to clock in, and swapping the
      // running build under someone mid-action is worse than a short delay. The user is
      // told instead, and decides when. See src/services/pwaUpdate.ts.
      registerType: "prompt",
      // We register the worker ourselves so we can check for updates when the app comes
      // back to the foreground, which on a phone is the only reliable moment.
      injectRegister: null,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Tiemply - Employee Time Management",
        short_name: "Tiemply",
        description:
          "Track your working hours, manage absences, and view work logs",
        theme_color: "#2563eb", // Color principal de tu app (primary-600)
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
      },
      workbox: {
        // Drop precaches from previous builds instead of letting them pile up on phones
        cleanupOutdatedCaches: true,
        // Configuración para cachear recursos y API
        runtimeCaching: [
          {
            urlPattern: new RegExp("^http://localhost:8000/api/"), // Ajusta a tu API
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 1 día
              },
            },
          },
        ],
      },
    }),
  ],
});
