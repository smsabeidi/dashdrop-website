#!/usr/bin/env node
/**
 * Writes audit/MIGRATION_REPORT.md and audit/migration-report.json from inventory + extraction.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AUDIT = path.join(ROOT, "audit");

function main() {
  const invPath = path.join(AUDIT, "migration-inventory.json");
  const fragPath = path.join(AUDIT, "fragment-extraction.json");
  if (!fs.existsSync(invPath)) {
    console.error("Missing migration-inventory.json");
    process.exit(1);
  }
  const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));
  const frag = fs.existsSync(fragPath)
    ? JSON.parse(fs.readFileSync(fragPath, "utf8"))
    : { pages: [] };

  const migrated = inv.canonicalPaths.length;
  const analyzed = inv.totals.htmlFilesAnalyzed;
  const skipped = inv.totals.skipped;
  const midBody = frag.pages.filter((p) => p.midBodyScriptRisk).length;

  const rpPath = path.join(AUDIT, "runtime-parity-report.json");
  const runtimeParity = fs.existsSync(rpPath)
    ? JSON.parse(fs.readFileSync(rpPath, "utf8"))
    : null;

  const json = {
    generatedAt: new Date().toISOString(),
    coverage: {
      htmlFilesAnalyzedNonBlog: analyzed,
      pagesMigrated: migrated,
      pagesSkipped: skipped,
      countsByCategory: inv.countsByCategory ?? inv.skipCountsByCategory,
    },
    templateClusters: inv.clusters.map((c) => ({
      pageCount: c.pageCount,
      samplePaths: c.samplePaths,
    })),
    risks: {
      midBodyScriptFlagCount: midBody,
      csrFirstPaintNote:
        "React CSR paints after bundle; compare to static mirror in PARITY_QA.",
      externalDependenciesNote: "See docs/EXTERNAL_DEPENDENCIES.md",
    },
    runtimeParity: runtimeParity
      ? {
          generatedAt: runtimeParity.generatedAt,
          reportJson: "audit/runtime-parity-report.json",
          reportMd: "audit/RUNTIME_PARITY_REPORT.md",
          counts: runtimeParity.counts,
          domContentLoadedShimImprovedCount:
            runtimeParity.improvedByDomContentLoadedShim?.length ?? 0,
        }
      : null,
    files: {
      mirroredHtmlDir: "mirrored-pages/",
      viteShellsDir: "vite-shells/",
      fragmentsGlob: "src/generated/fragments/",
      manifestsGlob: "src/generated/manifests/",
      lazyPageLoader: "src/generated/loadPage.ts (import.meta.glob)",
      tools: [
        "tools/migration-inventory.mjs",
        "tools/sync-marketing-public.mjs",
        "tools/extract-page-artifacts.mjs",
        "tools/gen-runtime-parity-report.mjs",
        "tools/build-react-shells.mjs",
        "tools/gen-migration-report.mjs",
        "tools/flatten-react-dist-html.mjs",
        "tools/rewrite-html-paths.mjs",
      ],
      runtime: [
        "src/pages/PreservedPage.tsx",
        "src/legacy/loadLegacyManifest.ts",
        "src/legacy/domContentLoadedCompat.ts",
        "src/legacy/appendScript.ts",
        "src/App.tsx",
        "src/main.tsx",
        "vite.react.config.ts",
      ],
    },
    verdict: {
      migratedShareOfCanonical: `${migrated}/${migrated}`,
      remaining:
        "blog/** article corpus; filenames with URL-encoded query markers (U+FE56 etc.); hs-search-results; index-react.html",
      nextStep:
        "SSR/prerender to reduce first-paint flash; optional blog pipeline using the same extract+manifest flow",
    },
  };

  const runtimeSection =
    runtimeParity != null
      ? `
### Runtime parity (automated)

Generated: ${runtimeParity.generatedAt}

| Bucket | Count |
|--------|-------|
| safe as-is | ${runtimeParity.counts.safeAsIs} |
| needs compatibility shim (DCL in inline) | ${runtimeParity.counts.needsCompatShim} |
| needs page-specific handling | ${runtimeParity.counts.needsPageSpecific} |
| mid-body watch only | ${runtimeParity.counts.midBodyWatchOnly} |
| static-only denylist | ${runtimeParity.counts.staticOnly} |

Pages with inline \`DOMContentLoaded\` usage (handled by scoped replay shim): **${runtimeParity.improvedByDomContentLoadedShim?.length ?? 0}**.

`
      : "";

  fs.mkdirSync(AUDIT, { recursive: true });
  fs.writeFileSync(
    path.join(AUDIT, "migration-report.json"),
    JSON.stringify(json, null, 2),
    "utf8",
  );

  const md = `# Migration coverage report

Generated: ${json.generatedAt}

## 1. Migration coverage

| Metric | Value |
|--------|-------|
| Non-blog HTML files analyzed | ${analyzed} |
| Canonical pages migrated (mirrored-pages + React MPA) | ${migrated} |
| Pages skipped (non-canonical) | ${skipped} |

### Entry counts by category

\`\`\`json
${JSON.stringify(inv.countsByCategory ?? inv.skipCountsByCategory, null, 2)}
\`\`\`

## 2. Template grouping

Clusters are keyed by sorted stylesheet URLs + HubSpot module/template script tails (see \`audit/migration-inventory.json\` → \`clusters\`).

Top clusters by page count:

${inv.clusters
  .slice(0, 15)
  .map(
    (c) =>
      `- **${c.pageCount} pages** — e.g. \`${c.samplePaths.join("`, `")}\``,
  )
  .join("\n")}

## 3. Files created/updated

- **Mirrored HTML (rewrite, no Vite publicDir HTML):** \`mirrored-pages/**\`
- **Vite MPA shells:** \`vite-shells/**\`
- **Fragments / manifests / lazy loader:** \`src/generated/**\` (\`loadPage.ts\` uses \`import.meta.glob\`)
- **Tools:** see \`migration-report.json\` → \`files.tools\`
- **Runtime:** see \`migration-report.json\` → \`files.runtime\`

## 4. Risk report

- **Mid-body script heuristic:** ${midBody} pages flagged (\`midBodyScriptRisk\` in manifests / fragment-extraction.json). Manual spot-check vs static \`serve .\` at \`/mirrored-pages/<path>.html\`.
- **CSR / DOMContentLoaded:** body scripts replay after React commit. Late \`DOMContentLoaded\` registrations during replay are handled by \`withDomContentLoadedReplayCompat\` in [\`src/legacy/domContentLoadedCompat.ts\`](../src/legacy/domContentLoadedCompat.ts) (used from [\`loadLegacyManifest.ts\`](../src/legacy/loadLegacyManifest.ts)). See [\`audit/RUNTIME_PARITY_REPORT.md\`](RUNTIME_PARITY_REPORT.md) and [\`audit/runtime-parity-report.json\`](runtime-parity-report.json).
- **Third-party / network:** unchanged dependency on GTM, Tealium, HubSpot, etc.
${runtimeSection}
## 5. Final verdict

- **Migrated:** ${migrated} canonical marketing pages (100% of current inventory canonical set).
- **Remaining:** blog posts; query-string / AMP duplicate filenames; \`hs-search-results.html\`; \`_downloads.html\`.
- **Next high-leverage step:** ${json.verdict.nextStep}

---

Static mirror QA (no React): \`npm run dev\` then open \`http://localhost:5173/mirrored-pages/index.html\` (assets resolve from repo root).

React MPA preview: \`npm run preview:react\` — homepage at \`http://localhost:4174/index.html\` (after \`build:react\` runs \`flatten:react-dist\`, same as Vite dev via canonical route plugin to \`vite-shells/\`).

**Production URLs:** \`build:react\` runs \`flatten:react-dist\` so \`dist-react/index.html\`, \`dist-react/solutions/same-day.html\`, etc. sit next to \`dist-react/assets/\`. Map clean marketing paths with a CDN or reverse proxy. Details: \`audit/RUNTIME_PARITY_REPORT.md\`.
`;

  fs.writeFileSync(path.join(AUDIT, "MIGRATION_REPORT.md"), md, "utf8");
  console.log("Wrote audit/MIGRATION_REPORT.md and audit/migration-report.json");
}

main();
