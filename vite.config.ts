import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This repo is the CLIENT only. The generation pipeline/API is a separate (private) service.
// In dev, /api is proxied to it (default :3847); without that service the UI renders but can't run
// a generation.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:3847", changeOrigin: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true },
});
