#!/usr/bin/env node
/**
 * Writes src/pages/homepage-body.fragment.html from mirrored-pages/index.html
 * (or project-root index.html fallback): body inner HTML with executable <script>
 * removed; keeps type="application/json" scripts.
 *
 * Run: node tools/extract-homepage-fragment.mjs
 * (Also invoked from npm run gen:homepage)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const mirroredIndex = path.join(ROOT, "mirrored-pages", "index.html");
const rootIndex = path.join(ROOT, "index.html");
const srcPath = fs.existsSync(mirroredIndex) ? mirroredIndex : rootIndex;
const srcHtml = fs.readFileSync(srcPath, "utf8");
const m = srcHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
if (!m) {
  console.error("Could not find <body> in", path.relative(ROOT, srcPath));
  process.exit(1);
}
let inner = m[1];

/** Remove script tags unless type is application/json (HubSpot data blob). */
inner = inner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (full) => {
  if (/type\s*=\s*["']application\/json["']/i.test(full)) return full;
  return "";
});

const out = path.join(ROOT, "src", "pages", "homepage-body.fragment.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, inner, "utf8");
console.log("Wrote", path.relative(ROOT, out), `(${inner.length} chars)`);
