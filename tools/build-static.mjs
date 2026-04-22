#!/usr/bin/env node
/** Production output: copy public/ assets → dist/ and mirrored-pages/ HTML → dist/mirrored-pages/ */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const pub = path.join(PROJECT_ROOT, "public");
const mirrored = path.join(PROJECT_ROOT, "mirrored-pages");
const dist = path.join(PROJECT_ROOT, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(pub, dist, { recursive: true });
console.log("Copied public/ → dist/");
if (fs.existsSync(mirrored)) {
  fs.cpSync(mirrored, path.join(dist, "mirrored-pages"), { recursive: true });
  console.log("Copied mirrored-pages/ → dist/mirrored-pages/");
}
