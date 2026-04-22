#!/usr/bin/env node
/**
 * Post-build helper: if HTML shells were emitted under dist-react/vite-shells/**,
 * copy them to dist-react/<pageKey>.html (matching Rollup MPA layout) when the
 * destination is missing. Safe to run when dist-react already uses canonical paths
 * (no-op). Does not modify hashed assets under dist-react/assets/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist-react");
const NESTED = path.join(DIST, "vite-shells");

function walkHtml(dir, baseRel, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(baseRel, name.name).replace(/\\/g, "/");
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkHtml(full, rel, out);
    else if (name.isFile() && name.name.endsWith(".html")) out.push(rel);
  }
}

function main() {
  if (!fs.existsSync(NESTED)) {
    console.log("flatten-react-dist: no dist-react/vite-shells/ — nothing to do");
    return;
  }

  const nested = [];
  walkHtml(NESTED, "", nested);
  let copied = 0;
  let skipped = 0;

  for (const rel of nested) {
    const src = path.join(NESTED, rel);
    const dest = path.join(DIST, rel);
    if (fs.existsSync(dest)) {
      skipped++;
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }

  console.log(
    `flatten-react-dist: copied ${copied} HTML file(s) to canonical dist-react paths; skipped ${skipped} (target already exists)`,
  );
}

main();
