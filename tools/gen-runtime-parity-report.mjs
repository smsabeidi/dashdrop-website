#!/usr/bin/env node
/**
 * Scans src/generated/manifests/ (recursive) for *.manifest.json and writes
 * audit/runtime-parity-report.json + audit/RUNTIME_PARITY_REPORT.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MANIFESTS = path.join(ROOT, "src", "generated", "manifests");
const AUDIT = path.join(ROOT, "audit");

function walkManifests(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkManifests(full, out);
    else if (name.isFile() && name.name.endsWith(".manifest.json")) out.push(full);
  }
}

function analyzeInlineSources(entries) {
  const parts = [];
  for (const e of entries || []) {
    if (e.kind === "inline" && e.source) parts.push(e.source);
  }
  const text = parts.join("\n");

  const hasDomContentLoadedListener =
    /(?:document|window)\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]/i.test(
      text,
    ) || /addEventListener\s*\(\s*['"]DOMContentLoaded['"]/i.test(text);

  const hasJQueryStyleReady =
    /(?:\$\s*\(\s*function|jQuery\s*\(\s*function|jQuery\s*\(\s*document\s*\))/.test(
      text,
    ) || /(?:\$\(|\bjQuery\()\s*\(\s*function/m.test(text);

  const hasDocumentWrite = /document\.write\s*\(/i.test(text);
  const hasReadystateGuard =
    /\bdocument\.readyState\s*[=!]/.test(text) ||
    /addEventListener\s*\(\s*['"]readystatechange['"]/i.test(text);

  return {
    hasDomContentLoadedListener,
    hasJQueryStyleReady,
    hasDocumentWrite,
    hasReadystateGuard,
  };
}

function loadStaticOnlyKeys() {
  const p = path.join(AUDIT, "runtime-static-only-denylist.json");
  if (!fs.existsSync(p)) return new Set();
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const keys = j.pageKeys;
    return Array.isArray(keys) ? new Set(keys) : new Set();
  } catch {
    return new Set();
  }
}

function categorize(row, staticOnly) {
  const {
    pageKey,
    midBodyScriptRisk,
    hasDomContentLoadedListener,
    hasJQueryStyleReady,
    hasDocumentWrite,
    hasReadystateGuard,
  } = row;

  if (staticOnly.has(pageKey)) return "staticOnly";
  if (hasDocumentWrite) {
    return "needsPageSpecific";
  }
  if (midBodyScriptRisk && (hasReadystateGuard || hasJQueryStyleReady)) {
    return "needsPageSpecific";
  }
  if (
    midBodyScriptRisk &&
    !hasDomContentLoadedListener &&
    !hasJQueryStyleReady &&
    !hasReadystateGuard
  ) {
    return "midBodyWatchOnly";
  }
  if (hasDomContentLoadedListener) return "needsCompatShim";
  if (hasJQueryStyleReady) return "needsJQueryOrWatch";
  return "safeAsIs";
}

function main() {
  if (!fs.existsSync(MANIFESTS)) {
    console.error("Missing src/generated/manifests/ — run extract-page-artifacts first");
    process.exit(1);
  }

  const staticOnly = loadStaticOnlyKeys();
  const paths = [];
  walkManifests(MANIFESTS, paths);
  paths.sort();

  const pages = [];
  const buckets = {
    safeAsIs: [],
    needsCompatShim: [],
    needsJQueryOrWatch: [],
    needsPageSpecific: [],
    midBodyWatchOnly: [],
    staticOnly: [],
  };

  for (const abs of paths) {
    const manifest = JSON.parse(fs.readFileSync(abs, "utf8"));
    const pageKey = manifest.pageKey;
    const sitePath = manifest.sitePath ?? "";
    const midBodyScriptRisk = Boolean(manifest.midBodyScriptRisk);
    const executableScriptCountInBody = manifest.executableScriptCountInBody ?? 0;
    const executableScriptsBeforeFooter =
      manifest.executableScriptsBeforeFooter ??
      (midBodyScriptRisk ? executableScriptCountInBody : 0);

    const flags = analyzeInlineSources(manifest.entries);
    const row = {
      pageKey,
      sitePath,
      midBodyScriptRisk,
      executableScriptCountInBody,
      executableScriptsBeforeFooter,
      ...flags,
    };
    row.category = categorize(row, staticOnly);
    pages.push(row);
    if (buckets[row.category]) buckets[row.category].push(pageKey);
  }

  for (const k of Object.keys(buckets)) buckets[k].sort();

  const improvedByDomContentLoadedShim = pages
    .filter((p) => p.hasDomContentLoadedListener)
    .map((p) => p.pageKey)
    .sort();

  const generatedAt = new Date().toISOString();
  const manifestCount = pages.length;

  const counts = {
    safeAsIs: buckets.safeAsIs.length,
    needsCompatShim: buckets.needsCompatShim.length,
    needsJQueryOrWatch: buckets.needsJQueryOrWatch.length,
    needsPageSpecific: buckets.needsPageSpecific.length,
    midBodyWatchOnly: buckets.midBodyWatchOnly.length,
    staticOnly: buckets.staticOnly.length,
  };

  const midBodyScriptRiskPageKeys = pages
    .filter((p) => p.midBodyScriptRisk)
    .map((p) => p.pageKey)
    .sort();

  const reportJson = {
    generatedAt,
    manifestCount,
    counts,
    midBodyScriptRiskCount: midBodyScriptRiskPageKeys.length,
    midBodyScriptRiskPageKeys,
    buckets,
    pages,
    improvedByDomContentLoadedShim,
    jQueryReadyStylePages: pages
      .filter((p) => p.hasJQueryStyleReady)
      .map((p) => p.pageKey)
      .sort(),
    changelog: [
      {
        date: generatedAt.slice(0, 10),
        note: "DCL compat: synthetic event target/currentTarget; dev canonical routes map /index.html and /<path>.html to vite-shells/ (vite.react.config.ts).",
      },
    ],
    notes: {
      domContentLoadedShim:
        "Scoped in loadLegacyManifest via withDomContentLoadedReplayCompat (src/legacy/domContentLoadedCompat.ts). Queued DOMContentLoaded listeners run in a microtask after the manifest `run` promise settles.",
      jQueryReady:
        "jQuery `$(function(){...})` usually defers to `jQuery.ready`; when `document.readyState` is `complete` jQuery may run the callback immediately after jQuery loads. Heuristic `hasJQueryStyleReady` flags pages to watch — not a second shim in this pass.",
      midBodyWatchOnly:
        "midBodyScriptRisk true (executable script before last </footer>) but no DCL / doc.write / readystate heuristics in inlines; still possible ordering differences vs static first-pass parse.",
      needsPageSpecificNoise:
        "`needsPageSpecific` includes any `midBodyScriptRisk` plus `document.readyState` assignment/comparison or `readystatechange` in **concatenated inline** sources. HubSpot / Tealium minified blocks often reference `readyState` for idle gating — not always a replay-order bug. Treat as manual review, not automatic static-only.",
    },
    productionServing: {
      recommendedPrimary:
        "Deploy `dist-react` so marketing URLs map to the **flattened** HTML path: e.g. `/solutions/same-day` or `/solutions/same-day.html` → `dist-react/solutions/same-day.html` (after `flatten:react-dist`). All mirrored assets stay root-absolute from `public/`.",
      devVsProd:
        "Dev: Vite plugin rewrites `GET /` and `GET /path/...html` to `vite-shells/` entries so URLs match the static site shape. Prod: `npm run build:react` runs flatten so `dist-react/index.html` exists at repo root of dist.",
      optionalFlatten:
        "Handled by `npm run build:react` (see package.json) via tools/flatten-react-dist-html.mjs.",
    },
  };

  fs.mkdirSync(AUDIT, { recursive: true });
  fs.writeFileSync(
    path.join(AUDIT, "runtime-parity-report.json"),
    JSON.stringify(reportJson, null, 2),
    "utf8",
  );

  const md = `# Runtime parity report

Generated: ${generatedAt}

Source: \`src/generated/manifests/**/*.manifest.json\` (${manifestCount} manifests).

## Summary counts

| Category | Count | Meaning |
|----------|-------|---------|
| safe as-is | ${counts.safeAsIs} | No DCL in inline, no jQuery \`$()\` ready-style guard heuristics, and no doc.write / readystate / mid-body-combo flags from rules below. |
| needs compatibility shim (DCL) | ${counts.needsCompatShim} | Inline \`addEventListener('DOMContentLoaded', …)\` — **handled** by \`withDomContentLoadedReplayCompat\`. |
| jQuery / watch | ${counts.needsJQueryOrWatch} | jQuery \`$()\` / \`jQuery()\` function wrapper in inlines; typically runs after jQuery external loads; verify in browser. |
| needs page-specific runtime handling | ${counts.needsPageSpecific} | \`document.write\` and/or (mid-body + readystate) / similar — likely needs review or static-only. |
| mid-body watch only | ${counts.midBodyWatchOnly} | \`midBodyScriptRisk\` only; no DCL / doc.write / readystate in inlines by heuristic. |
| should remain static-only for now | ${counts.staticOnly} | \`audit/runtime-static-only-denylist.json\` \`pageKeys\`. |

## Changelog (runtime hardening)

${reportJson.changelog.map((c) => `- **${c.date}:** ${c.note}`).join("\n")}

## Pages improved by DOMContentLoaded shim

${improvedByDomContentLoadedShim.length} page(s) register \`DOMContentLoaded\` in inline manifest sources (see \`improvedByDomContentLoadedShim\` in \`runtime-parity-report.json\`).

**jQuery-style** inline wrappers: \`jQueryReadyStylePages\` in JSON (\`${(reportJson.jQueryReadyStylePages || []).length}\` page(s)).

**\`midBodyScriptRisk\` flag (footer heuristic):** \`${midBodyScriptRiskPageKeys.length}\` manifest(s) — list \`midBodyScriptRiskPageKeys\` in JSON. Many of those are also in \`needsCompatShim\` because the early cookie / nav inline uses \`DOMContentLoaded\` (DCL takes precedence in categorization).

## Recommended final production serving strategy

1. **Deploy** \`dist-react/\` with **flattened** HTML: \`dist-react/index.html\`, \`dist-react/solutions/same-day.html\`, etc. (\`build:react\` runs \`flatten:react-dist\`). Root-absolute asset URLs are unchanged.
2. **Reverse proxy** map pretty URLs to \`.html\` files (or serve \`.html\` directly) — same as static Sitecore/Hubspot paths.
3. **Dev** uses \`mpa-dev-canonical-shell-routes\`: \`http://localhost:5174/index.html\` and \`/solutions/same-day.html\` resolve to the same shells as \`/vite-shells/...\`.

Full machine-readable output: [\`audit/runtime-parity-report.json\`](runtime-parity-report.json).

## Bucket lists (pageKey)

### safe as-is

${buckets.safeAsIs.map((k) => `- \`${k}\``).join("\n") || "_None._"}

### needs compatibility shim (DCL in inline; shim applied at replay)

${buckets.needsCompatShim.map((k) => `- \`${k}\``).join("\n") || "_None._"}

### jQuery / watch (heuristic: \`$()\` / jQuery\`()\` in inlines)

${(buckets.needsJQueryOrWatch || []).map((k) => `- \`${k}\``).join("\n") || "_None._"}

### needs page-specific runtime handling

${buckets.needsPageSpecific.map((k) => `- \`${k}\``).join("\n") || "_None._"}

### mid-body watch only

${buckets.midBodyWatchOnly.map((k) => `- \`${k}\``).join("\n") || "_None._"}

### should remain static-only for now

${buckets.staticOnly.map((k) => `- \`${k}\``).join("\n") || "_None._"}
`;

  fs.writeFileSync(path.join(AUDIT, "RUNTIME_PARITY_REPORT.md"), md, "utf8");
  console.log(
    "Wrote audit/runtime-parity-report.json and audit/RUNTIME_PARITY_REPORT.md",
    `(${manifestCount} manifests)`,
  );
}

main();
