/**
 * Vite dev-server config for Frantics (Phase 27b).
 *
 * Frantics's runtime is classic-script DOM + a Node/ws backend on
 * port 3000. Vite here is a dev-only HMR + fast-reload layer that
 * proxies EVERY runtime route to the Node server — Vite just
 * injects its HMR client into the HTML responses it receives.
 *
 * Usage (two terminals):
 *   1) npm start   — Node WebSocket server on port 3000
 *   2) npm run dev — Vite on port 5173, proxies to 3000
 *   Open http://localhost:5173/test/ (or /host/, /controller/, etc.)
 *
 * Prod still uses `npm start` alone — Vite is not in the prod path.
 */
import { defineConfig } from 'vite';

const NODE_ORIGIN = 'http://localhost:3000';
const NODE_WS = 'ws://localhost:3000';

export default defineConfig({
  server: {
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      // WebSocket upgrade goes straight to the Node server
      '/ws':      { target: NODE_WS, ws: true, changeOrigin: true },

      // Runtime routes — HTML + per-host subpaths
      '^/test(/|$)':             { target: NODE_ORIGIN, changeOrigin: true },
      '^/host(/|$)':             { target: NODE_ORIGIN, changeOrigin: true },
      '^/controller(/|$)':       { target: NODE_ORIGIN, changeOrigin: true },
      '^/host-escape(/|$)':      { target: NODE_ORIGIN, changeOrigin: true },
      '^/host-hill(/|$)':        { target: NODE_ORIGIN, changeOrigin: true },
      '^/host-meteor(/|$)':      { target: NODE_ORIGIN, changeOrigin: true },
      '^/host-race(/|$)':        { target: NODE_ORIGIN, changeOrigin: true },

      // Shared asset routes
      '/assets': { target: NODE_ORIGIN, changeOrigin: true },
      '/shared': { target: NODE_ORIGIN, changeOrigin: true },
      '/engine': { target: NODE_ORIGIN, changeOrigin: true },
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.gstack/**',
        '**/screenshots-review/**',
        '**/.playwright-mcp/**',
      ],
    },
  },
});
