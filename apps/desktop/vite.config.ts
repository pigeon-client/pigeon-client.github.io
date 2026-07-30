import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// Optional public tunnel hostname (ngrok / TestSprite) for HMR + Host allowlist.
// @ts-expect-error process is a nodejs global
const publicHost = process.env.VITE_PUBLIC_HOST || host;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    // Default to IPv4 loopback so tools that dial 127.0.0.1 (e.g. TestSprite's
    // tunnel) can reach the dev server; bare "localhost" resolves to ::1 only.
    host: host ?? "127.0.0.1",
    // Allow any current ngrok subdomain (URLs rotate). Avoid hardcoding a stale host.
    allowedHosts: [".ngrok-free.app", ".ngrok-free.dev", ".ngrok.io", "localhost", "127.0.0.1"],
    hmr: publicHost
      ? {
          // Browser reaches Vite through HTTPS tunnel → use secure websocket.
          protocol: "wss",
          host: publicHost,
          clientPort: 443,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
