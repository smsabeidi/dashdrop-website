#!/usr/bin/env node
/**
 * Scans pilot HTML files for asset-like URLs (sibling ../ mirrors, hs/, _hcms/).
 * Writes tools/asset-inventory.json for copy/QA reference.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const PILOT_HTML = ["index.html", "contact.html"].map((f) =>
  path.join(PROJECT_ROOT, f),
);

/** @param {string} html */
function collectFromHtml(html, sourceFile) {
  /** @type {Set<string>} */
  const urls = new Set();

  const add = (u) => {
    if (!u || u.startsWith("data:") || u.startsWith("#")) return;
    urls.add(u);
  };

  // href= and src= (single or double quoted)
  for (const m of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    add(m[1].trim());
  }

  // srcset: split by comma, take URL before space or end
  for (const m of html.matchAll(/\bsrcset\s*=\s*["']([^"']+)["']/gi)) {
    for (const part of m[1].split(",")) {
      const token = part.trim().split(/\s+/)[0];
      if (token) add(token);
    }
  }

  // CSS url(...)
  for (const m of html.matchAll(/url\s*\(\s*["']?([^)"'\s]+)["']?\s*\)/gi)) {
    add(m[1].trim());
  }

  // data-* that look like URLs (csv, background, etc.)
  for (const m of html.matchAll(/\bdata-[a-z0-9_-]+\s*=\s*["']([^"']+)["']/gi)) {
    const v = m[1].trim();
    if (
      v.startsWith("../") ||
      v.startsWith("./") ||
      v.startsWith("/") ||
      v.includes(".csv") ||
      v.includes(".json")
    ) {
      add(v);
    }
  }

  return { sourceFile, urls: [...urls].sort() };
}

function classify(url) {
  if (url.startsWith("http://") || url.startsWith("https://"))
    return "absolute_remote";
  if (url.startsWith("../")) return "sibling_mirror";
  if (url.startsWith("hs/") || url.startsWith("/hs/")) return "hubspot_local";
  if (url.startsWith("_hcms/") || url.startsWith("/_hcms/"))
    return "hubspot_forms_local";
  if (url.startsWith("mailto:") || url.startsWith("javascript:"))
    return "non_asset";
  if (url.startsWith("./") || /^[a-z0-9_-]+\.html$/i.test(url))
    return "internal_html";
  return "other";
}

function main() {
  /** @type {string[]} */
  const allUrls = [];
  const byFile = [];

  for (const file of PILOT_HTML) {
    if (!fs.existsSync(file)) {
      console.error("Missing:", file);
      process.exit(1);
    }
    const html = fs.readFileSync(file, "utf8");
    const { urls, sourceFile } = collectFromHtml(html, path.basename(file));
    byFile.push({ file: path.basename(sourceFile), count: urls.length, urls });
    allUrls.push(...urls);
  }

  const unique = [...new Set(allUrls)].sort();
  const siblingRoots = new Set();
  for (const u of unique) {
    if (u.startsWith("../")) {
      const rest = u.slice(3);
      const root = rest.split("/")[0];
      if (root) siblingRoots.add(root);
    }
  }

  const out = {
    generatedAt: new Date().toISOString(),
    pilotFiles: PILOT_HTML.map((p) => path.basename(p)),
    siblingMirrorRoots: [...siblingRoots].sort(),
    uniqueUrls: unique,
    byFile,
    classified: Object.fromEntries(
      unique.map((u) => [u, classify(u)]),
    ),
  };

  const outPath = path.join(__dirname, "asset-inventory.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", outPath);
  console.log("Unique URLs:", unique.length);
  console.log("Sibling mirror host folders:", [...siblingRoots].join(", "));
}

main();
