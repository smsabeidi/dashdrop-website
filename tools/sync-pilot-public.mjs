#!/usr/bin/env node
/**
 * Copies mirrored host trees from the Sitesucker parent into public/,
 * copies hs/ and _hcms/ from the project root, and writes rewritten pilot HTML
 * to mirrored-pages/ (HTML is not stored under public/ — avoids Vite publicDir collisions).
 *
 * Env:
 *   MIRROR_PARENT — default: parent of project root (…/us.sitesucker.mac.sitesucker)
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

function purgeHtmlUnderPublic(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) purgeHtmlUnderPublic(full);
    else if (name.isFile() && name.name.endsWith(".html")) fs.unlinkSync(full);
  }
}

function cpTree(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn("Skip missing source:", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("Copied", path.basename(src), "->", dest);
}

function main() {
  console.log("MIRROR_PARENT =", MIRROR_PARENT);
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(MIRROR_PAGES, { recursive: true });
  purgeHtmlUnderPublic(PUBLIC_DIR);

  for (const dir of HOST_DIRS) {
    const src = path.join(MIRROR_PARENT, dir);
    const dest = path.join(PUBLIC_DIR, dir);
    cpTree(src, dest);
  }

  cpTree(path.join(PROJECT_ROOT, "hs"), path.join(PUBLIC_DIR, "hs"));
  cpTree(path.join(PROJECT_ROOT, "_hcms"), path.join(PUBLIC_DIR, "_hcms"));

  for (const name of ["index.html", "contact.html"]) {
    const raw = fs.readFileSync(path.join(PROJECT_ROOT, name), "utf8");
    const dest = path.join(MIRROR_PAGES, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rewriteHtmlPaths(raw), "utf8");
    console.log("Wrote mirrored-pages/" + name + " (paths rewritten)");
  }

  // Typekit kit CSS @import points at a sibling filename with & and % encoding;
  // the mirrored child file is empty (/**/). Strip @import so static servers and
  // Vite do not try to resolve a path with query-like characters on disk.
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
