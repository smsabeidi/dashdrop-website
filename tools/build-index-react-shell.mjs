#!/usr/bin/env node
/**
 * Generates index-react.html from mirrored-pages/index.html (or root index.html):
 * same <head> as mirror, injects #root shim CSS, body with #root + Vite module entry only.
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

const headMatch = srcHtml.match(/^([\s\S]*?)<\/head>/i);
if (!headMatch) {
  console.error("No </head> in", path.relative(ROOT, srcPath));
  process.exit(1);
}
const beforeHeadClose = headMatch[1];

const bodyOpen = srcHtml.match(/<body([^>]*)>/i);
const bodyAttrs = bodyOpen ? bodyOpen[1] : "";

const outPath = path.join(ROOT, "index-react.html");
const doc = `${beforeHeadClose}
<style id="react-pilot-root-shim">#root{display:contents}</style>
</head>
<body${bodyAttrs}>
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
</body></html>
`;

fs.writeFileSync(outPath, doc, "utf8");
console.log("Wrote", path.relative(ROOT, outPath));
