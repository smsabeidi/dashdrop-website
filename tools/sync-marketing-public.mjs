#!/usr/bin/env node
/**
 * Copies mirrored asset trees into public/ (no HTML — avoids Vite copying static pages over MPA shells).
 * Writes rewritten canonical HTML to mirrored-pages/ (same paths as the live site).
 * Requires audit/migration-inventory.json from tools/migration-inventory.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rewriteHtmlPaths } from "./rewrite-html-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const MIRROR_PAGES = path.join(PROJECT_ROOT, "mirrored-pages");
const MIRROR_PARENT =
  process.env.MIRROR_PARENT || path.resolve(PROJECT_ROOT, "..");

const HOST_DIRS = [
  "46302491.fs1.hubspotusercontent-na1.net",
  "cdn.jsdelivr.net",
  "use.typekit.net",
  "p.typekit.net",
  "www.googletagmanager.com",
  "tags.tiqcdn.com",
  "js.hubspot.com",
];

function cpTree(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("Skip missing source:", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("Copied", path.basename(src), "->", dest);
}

/** Delete every .html under dir (public must not contain HTML for Vite builds). */
function purgeAllHtml(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) purgeAllHtml(full);
    else if (name.isFile() && name.name.endsWith(".html")) {
      fs.unlinkSync(full);
      console.log("Removed HTML from public:", path.relative(PUBLIC_DIR, full));
    }
  }
}

function main() {
  const invPath = path.join(PROJECT_ROOT, "audit", "migration-inventory.json");
  if (!fs.existsSync(invPath)) {
    console.error("Missing", invPath, "— run: node tools/migration-inventory.mjs");
    process.exit(1);
  }
  const inventory = JSON.parse(fs.readFileSync(invPath, "utf8"));
  const canonicalPaths = inventory.canonicalPaths;
  if (!Array.isArray(canonicalPaths) || canonicalPaths.length === 0) {
    console.error("migration-inventory.json has no canonicalPaths");
    process.exit(1);
  }

  console.log("MIRROR_PARENT =", MIRROR_PARENT);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(MIRROR_PAGES, { recursive: true });

  purgeAllHtml(PUBLIC_DIR);

  for (const dir of HOST_DIRS) {
    const src = path.join(MIRROR_PARENT, dir);
    const dest = path.join(PUBLIC_DIR, dir);
    cpTree(src, dest);
  }

  cpTree(path.join(PROJECT_ROOT, "hs"), path.join(PUBLIC_DIR, "hs"));
  cpTree(path.join(PROJECT_ROOT, "_hcms"), path.join(PUBLIC_DIR, "_hcms"));

  const allowed = new Set(canonicalPaths.map((p) => p.replace(/\\/g, "/")));

  function sweepMirrorHtml(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      const rel = path.relative(MIRROR_PAGES, full).replace(/\\/g, "/");
      if (name.isDirectory()) sweepMirrorHtml(full);
      else if (name.isFile() && name.name.endsWith(".html")) {
        if (!allowed.has(rel)) {
          fs.unlinkSync(full);
          console.log("Removed stale mirrored-pages HTML:", rel);
        }
      }
    }
  }
  sweepMirrorHtml(MIRROR_PAGES);

  let wrote = 0;
  for (const rel of canonicalPaths) {
    const srcFile = path.join(PROJECT_ROOT, rel);
    if (!fs.existsSync(srcFile)) {
      console.warn("Missing source HTML:", rel);
      continue;
    }
    const raw = fs.readFileSync(srcFile, "utf8");
    const destFile = path.join(MIRROR_PAGES, rel);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.writeFileSync(destFile, rewriteHtmlPaths(raw), "utf8");
    wrote++;
  }
  console.log("Wrote", wrote, "HTML files under mirrored-pages/");

  const typekitMain = path.join(PUBLIC_DIR, "use.typekit.net", "hph6sac.css");
  if (fs.existsSync(typekitMain)) {
    let tk = fs.readFileSync(typekitMain, "utf8");
    tk = tk.replace(/@import\s+url\s*\([^)]*p\.typekit\.net[^)]*\)\s*;?\s*/gi, "");
    fs.writeFileSync(typekitMain, tk, "utf8");
    console.log("Patched use.typekit.net/hph6sac.css (removed p.typekit.net @import)");
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
