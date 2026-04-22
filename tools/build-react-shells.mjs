#!/usr/bin/env node
/**
 * Builds react-shells/<path>.html from each public HTML: original document head,
 * #root shim, empty #root with data-page-key, Vite entry.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_HTML = path.join(ROOT, "mirrored-pages");
const SHELLS = path.join(ROOT, "vite-shells");

function walkHtml(dir, baseRel, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    const rel = path.join(baseRel, name.name).replace(/\\/g, "/");
    if (name.isDirectory()) walkHtml(full, rel, out);
    else if (name.isFile() && name.name.endsWith(".html")) out.push(rel);
  }
}

/**
 * @param {string} relPublic
 */
function publicPathToPageKey(relPublic) {
  return relPublic.replace(/\.html$/i, "").replace(/\\/g, "/");
}

function main() {
  const htmlFiles = [];
  walkHtml(SOURCE_HTML, "", htmlFiles);
  htmlFiles.sort();

  fs.rmSync(SHELLS, { recursive: true, force: true });
  fs.mkdirSync(SHELLS, { recursive: true });

  for (const rel of htmlFiles) {
    const abs = path.join(SOURCE_HTML, rel);
    const html = fs.readFileSync(abs, "utf8");

    const headMatch = html.match(/^([\s\S]*?)<\/head>/i);
    if (!headMatch) {
      console.warn("No </head> in", rel);
      continue;
    }
    const beforeHeadClose = headMatch[1];

    const bodyOpen = html.match(/<body([^>]*)>/i);
    const bodyAttrs = bodyOpen ? bodyOpen[1] : "";

    const pageKey = publicPathToPageKey(rel);
    const shellRel = rel;
    const outPath = path.join(SHELLS, shellRel);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    const doc = `${beforeHeadClose}
<style id="react-pilot-root-shim">#root{display:contents}</style>
</head>
<body${bodyAttrs}>
<div id="root" data-page-key="${pageKey.replace(/"/g, "&quot;")}"></div>
<script type="module" src="/src/main.tsx"></script>
</body></html>
`;

    fs.writeFileSync(outPath, doc, "utf8");
  }

  console.log("Wrote", htmlFiles.length, "files under vite-shells/");
}

main();
