#!/usr/bin/env node
/**
 * Normalizes pilot HTML for single-root hosting:
 * - ../SomeMirrorHost/... -> /SomeMirrorHost/...
 * - Pilot cross-links: index.html / contact.html -> /index.html / /contact.html
 * - canonical link href for pilot pages
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} html
 * @returns {string}
 */
export function rewriteHtmlPaths(html) {
  let out = html;

  // Sibling mirror paths: ../hostname/ -> /hostname/
  // Require hostname to contain a dot (avoids ../foo relative paths)
  out = out.replace(/\.\.\/([\w.-]+\.[\w.-]+)\//g, "/$1/");

  /** @param {string} _m */
  function rewriteRelativeUrlAttr(_m, quote, attr, relPath) {
    const t = relPath.trim();
    if (/^https?:/i.test(t) || t.startsWith("//") || t.startsWith("mailto:") || t === "#")
      return `${attr}=${quote}${relPath}${quote}`;
    const normalized = t.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "");
    if (normalized.length === 0) return `${attr}=${quote}${relPath}${quote}`;
    return `${attr}=${quote}/${normalized}${quote}`;
  }

  // Internal pilot links: href="../../solutions/foo.html" -> href="/solutions/foo.html"
  out = out.replace(
    /\b(href)=(["'])(\.\.\/)+([^"']+)\2/gi,
    (m, attr, q, _dots, rest) => rewriteRelativeUrlAttr(m, q, attr, rest),
  );
  out = out.replace(
    /\b(src)=(["'])(\.\.\/)+([^"']+)\2/gi,
    (m, attr, q, _dots, rest) => rewriteRelativeUrlAttr(m, q, attr, rest),
  );
  out = out.replace(
    /\b(action)=(["'])(\.\.\/)+([^"']+)\2/gi,
    (m, attr, q, _dots, rest) => rewriteRelativeUrlAttr(m, q, attr, rest),
  );

  out = out.replace(/href\s*=\s*["']index\.html["']/gi, 'href="/index.html"');
  out = out.replace(/href\s*=\s*["']contact\.html["']/gi, 'href="/contact.html"');

  out = out.replace(
    /<link\s+rel\s*=\s*["']canonical["']\s+href\s*=\s*["']index\.html["']/i,
    '<link rel="canonical" href="/index.html"',
  );
  out = out.replace(
    /<link\s+rel\s*=\s*["']canonical["']\s+href\s*=\s*["']contact\.html["']/i,
    '<link rel="canonical" href="/contact.html"',
  );

  return out;
}

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error(
      "Usage: node tools/rewrite-html-paths.mjs <input.html> <output.html>",
    );
    process.exit(1);
  }
  const html = fs.readFileSync(path.resolve(inPath), "utf8");
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(outPath), rewriteHtmlPaths(html), "utf8");
  console.log("Wrote", outPath);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) main();
