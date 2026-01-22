import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Web Worker configuration (T095 - Plugin Sandbox)
  worker: {
    format: 'es',
  },

  // Optimizations for workers and plugin system
  optimizeDeps: {
    // Ensure plugin SDK and React are pre-bundled for import maps
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      '@tauri-apps/api/core',
      // Plugin SDK - resolve via alias
      '@etools/plugin-sdk',
    ],
    exclude: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Plugin SDK alias for npm plugins
      "@etools/plugin-sdk": path.resolve(__dirname, "./src/lib/plugin-sdk/index.ts"),
    },
  },

  // Allow loading npm plugins from file system
  // This is needed for dynamically loading @etools-plugin/* packages
  // Note: server config is merged with the one below
  build: {
    // Code splitting for faster startup (T203)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunk for React
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Tauri API chunk
          if (id.includes('@tauri-apps')) {
            return 'tauri';
          }
          // UI components chunk
          if (id.includes('/src/components/ui/')) {
            return 'ui';
          }
          // Services chunk
          if (id.includes('/src/services/')) {
            return 'services';
          }
          // Hooks chunk
          if (id.includes('/src/hooks/')) {
            return 'hooks';
          }
          // Plugin SDK chunk
          if (id.includes('/src/lib/plugin-sdk/')) {
            return 'plugin-sdk';
          }
        },
      },
    },
    // Optimize chunk size warning
    chunkSizeWarningLimit: 500,
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // Allow loading plugins from any directory
    fs: {
      strict: false,
      allow: [
        // Allow loading from project root
        path.resolve(__dirname),
        // Allow loading from npm-packages directory (for development)
        path.resolve(__dirname, './npm-packages'),
      ],
    },
    // Add security headers for import maps (optional but recommended)
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
}));
