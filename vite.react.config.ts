import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const ROOT = path.resolve(__dirname);
const SHELLS = path.join(ROOT, "vite-shells");

/**
 * Dev: map canonical site paths to shells under /vite-shells/ so
 * /index.html, /solutions/same-day.html, etc. work without a visual change.
 * Production: run `npm run flatten:react-dist` after `vite build` (see build:react).
 */
function mpaDevCanonicalShellRoutes(): Plugin {
  return {
    name: "mpa-dev-canonical-shell-routes",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0] ?? "";
        if (
          url.startsWith("/@") ||
          url.startsWith("/node_modules/") ||
          url.startsWith("/src/") ||
          url.startsWith("/assets/") ||
          url.startsWith("/@vite") ||
          url.startsWith("/@fs")
        ) {
          next();
          return;
        }
        if (url === "/" || url === "/index" || url === "/index/") {
          req.url = "/vite-shells/index.html" + (req.url?.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "");
          next();
          return;
        }
        if (url === "/favicon.ico") {
          next();
          return;
        }
        if (url.startsWith("/vite-shells/")) {
          next();
          return;
        }
        const query = req.url?.includes("?") ? "?" + req.url.split("?").slice(1).join("?") : "";
        if (!url.includes("..")) {
          if (url.endsWith(".html")) {
            const rel = url.replace(/^\//, "");
            const candidate = path.join(SHELLS, rel);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              req.url = "/vite-shells/" + rel + query;
            }
            next();
            return;
          }
          if (url.length > 1 && !url.slice(1).includes(".")) {
            const rel = `${url.replace(/^\//, "")}.html`;
            const candidate = path.join(SHELLS, rel);
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
              req.url = "/vite-shells/" + rel + query;
            }
          }
        }
        next();
      });
    },
  };
}

/**
 * MPA inputs: rollup entry keys mirror site paths (e.g. `solutions/same-day` →
 * `dist-react/solutions/same-day.html`). Vite may also emit copies under
 * `dist-react/vite-shells/`; run `npm run flatten:react-dist` to ensure canonical paths exist.
 */
function collectReactShellInputs(): Record<string, string> {
  const input: Record<string, string> = {};
  if (!fs.existsSync(SHELLS)) {
    throw new Error(
      "Missing vite-shells/ — run `npm run gen:pages` (or node tools/build-react-shells.mjs)",
    );
  }
  function walk(relWithinShells: string) {
    const dir = path.join(SHELLS, relWithinShells);
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(relWithinShells, name.name).replace(/\\/g, "/");
      const abs = path.join(SHELLS, rel);
      if (name.isDirectory()) walk(rel);
      else if (name.name.endsWith(".html")) {
        const key = rel.replace(/\.html$/i, "");
        input[key] = abs;
      }
    }
  }
  walk("");
  return input;
}

/**
 * React preservation build: mirrored assets from `public/`, one HTML shell per migrated page.
 */
export default defineConfig({
  root: ROOT,
  publicDir: "public",
  plugins: [react(), mpaDevCanonicalShellRoutes()],
  server: {
    port: 5174,
    strictPort: false,
    open: "/index.html",
  },
  build: {
    outDir: path.join(ROOT, "dist-react"),
    emptyOutDir: true,
    rollupOptions: {
      input: collectReactShellInputs(),
    },
  },
});
