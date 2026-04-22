import path from "node:path";
import { defineConfig } from "vite";

/**
 * Pilot static mirror: `npm run dev` uses `serve public` (no bundling) so legacy
 * HubSpot scripts and CSS stay intact. Production output is `npm run build`
 * (verbatim copy public → dist). This Vite config remains for optional `npm run dev:vite`.
 */
export default defineConfig({
  root: path.resolve(__dirname, "public"),
  publicDir: false,
  appType: "mpa",
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "public/index.html"),
        contact: path.resolve(__dirname, "public/contact.html"),
      },
    },
  },
});
