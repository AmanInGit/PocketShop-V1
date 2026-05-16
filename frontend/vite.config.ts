import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// Note: vite-plugin-pwa will be installed when enabling full PWA features
// import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  envDir: '.',
  plugins: [
    react(),
    // Phase 1: PWA skeleton - plugin disabled for now
    // To enable later:
    // 1. Install: pnpm add -D vite-plugin-pwa
    // 2. Uncomment the import above
    // 3. Uncomment and configure the plugin below
    // 4. Remove `disable: true` to activate service worker
    
    // VitePWA({
    //   disable: true, // Set to false to enable PWA features
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
    //   manifest: {
    //     name: 'PocketShop',
    //     short_name: 'PocketShop',
    //     description: 'Virtual storefront for local businesses',
    //     start_url: '/',
    //     display: 'standalone',
    //     background_color: '#ffffff',
    //     theme_color: '#ff6600',
    //     icons: [
    //       { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    //       { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    //     ],
    //   },
    //   workbox: {
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24, // 24 hours
    //           },
    //         },
    //       },
    //     ],
    //   },
    // }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true
  },
  root: '.',
  publicDir: 'public',
  build: {
    // Let Vite/Rollup choose chunks. Custom manualChunks split react vs other
    // node_modules into separate files and caused TDZ errors in production
    // (Uncaught ReferenceError: Cannot access 'z' before initialization).
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
  },
})
