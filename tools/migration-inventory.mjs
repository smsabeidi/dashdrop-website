#!/usr/bin/env node
/**
 * Scans mirrored HTML (excluding blog/, build dirs) and classifies pages for migration.
 * Writes audit/migration-inventory.json with fingerprints for template grouping.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/** Sitesucker encodes URL query `?` in filenames (often U+FE56, sometimes U+FF1F / U+FE16). */
const QUERYISH_RE = /[\uFE56\uFF1F\uFE16]/;

const EXCLUDE_DIRS = new Set([
  "node_modules",
  "dist",
  "dist-react",
  "public",
  "src",
  "blog",
  "react-shells",
  "vite-shells",
  "mirrored-pages",
  ".git",
  ".cursor",
]);

const RISK_EXCLUDED = new Set(["hs-search-results.html", "_downloads.html"]);

/**
 * @param {string} absPath
 * @returns {{ category: string, reason?: string }}
 */
function classify(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  const base = path.basename(rel);

  if (base === "index-react.html") {
    return { category: "generated_shell", reason: "index-react.html" };
  }
  if (
    QUERYISH_RE.test(rel) ||
    rel.includes("hs_amp=true") ||
    rel.includes("hsCtaAttrib=")
  ) {
    return {
      category: "query_or_amp_duplicate",
      reason: "filename contains query/amp/tracking mirror marker",
    };
  }
  if (RISK_EXCLUDED.has(rel)) {
    return { category: "risk_excluded", reason: rel };
  }

  return { category: "canonical", reason: undefined };
}

/**
 * @param {string} html
 * @returns {{ stylesheets: string[], moduleScripts: string[] }}
 */
function fingerprint(html) {
  const stylesheets = [];
  const reLink = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
  let m;
  while ((m = reLink.exec(html)) !== null) {
    stylesheets.push(m[1]);
  }
  const moduleScripts = [];
  const reMod =
    /\/hub_generated\/module_assets\/[^"']*\/(module_u4m-[^"']+\.js)/gi;
  const reTpl =
    /\/hub_generated\/template_assets\/[^"']*\/(template_[^"']+\.js)/gi;
  let m2;
  while ((m2 = reMod.exec(html)) !== null) moduleScripts.push(m2[1]);
  while ((m2 = reTpl.exec(html)) !== null) moduleScripts.push(m2[1]);
  return {
    stylesheets: [...new Set(stylesheets)].sort(),
    moduleScripts: [...new Set(moduleScripts)].sort(),
  };
}

/**
 * @param {{ stylesheets: string[], moduleScripts: string[] }} fp
 */
function fingerprintKey(fp) {
  return JSON.stringify({ s: fp.stylesheets, m: fp.moduleScripts });
}

function walkHtmlFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (EXCLUDE_DIRS.has(name.name)) continue;
      walkHtmlFiles(full, out);
    } else if (name.isFile() && name.name.endsWith(".html")) {
      out.push(full);
    }
  }
}

function main() {
  const allFiles = [];
  walkHtmlFiles(ROOT, allFiles);

  const entries = [];
  const countsByCategory = {};

  for (const abs of allFiles) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    const { category, reason } = classify(abs);
    countsByCategory[category] = (countsByCategory[category] || 0) + 1;

    let fp = { stylesheets: [], moduleScripts: [] };
    if (category === "canonical") {
      try {
        const html = fs.readFileSync(abs, "utf8");
        fp = fingerprint(html);
      } catch {
        /* ignore */
      }
    }

    entries.push({
      relativePath: rel,
      category,
      skipReason: reason,
      fingerprint: category === "canonical" ? fp : null,
      fingerprintKey:
        category === "canonical" ? fingerprintKey(fp) : null,
    });
  }

  const canonical = entries.filter((e) => e.category === "canonical");
  const skipped = entries.filter((e) => e.category !== "canonical");

  /** @type {Map<string, string[]>} */
  const clusters = new Map();
  for (const e of canonical) {
    const key = e.fingerprintKey ?? "none";
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(e.relativePath);
  }

  const clusterList = [...clusters.entries()].map(([key, paths]) => ({
    fingerprintKey: key,
    pageCount: paths.length,
    samplePaths: paths.slice(0, 3),
    allPaths: paths.sort(),
  }));
  clusterList.sort((a, b) => b.pageCount - a.pageCount);

  const auditDir = path.join(ROOT, "audit");
  fs.mkdirSync(auditDir, { recursive: true });

  const inventory = {
    generatedAt: new Date().toISOString(),
    totals: {
      htmlFilesAnalyzed: entries.length,
      canonical: canonical.length,
      skipped: skipped.length,
    },
    countsByCategory,
    canonicalPaths: canonical.map((e) => e.relativePath).sort(),
    clusters: clusterList,
    entries,
  };

  fs.writeFileSync(
    path.join(auditDir, "migration-inventory.json"),
    JSON.stringify(inventory, null, 2),
    "utf8",
  );

  console.log(
    "Wrote audit/migration-inventory.json",
    `(canonical=${canonical.length}, skipped=${skipped.length})`,
  );
}

main();
