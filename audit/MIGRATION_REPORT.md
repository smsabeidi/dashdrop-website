# Migration coverage report

Generated: 2026-04-21T20:39:46.954Z

## 1. Migration coverage

| Metric | Value |
|--------|-------|
| Non-blog HTML files analyzed | 174 |
| Canonical pages migrated (mirrored-pages + React MPA) | 112 |
| Pages skipped (non-canonical) | 62 |

### Entry counts by category

```json
{
  "risk_excluded": 2,
  "canonical": 112,
  "query_or_amp_duplicate": 59,
  "generated_shell": 1
}
```

## 2. Template grouping

Clusters are keyed by sorted stylesheet URLs + HubSpot module/template script tails (see `audit/migration-inventory.json` → `clusters`).

Top clusters by page count:

- **42 pages** — e.g. `press-releases/benjamin-moore-expands-partnership-with-roadie-to-accelerate-paint-delivery-for-diyers-and-professionals.html`, `press-releases/blains-farm-fleet-improves-customer-experience-and-sales-with-roadie-same-day-delivery.html`, `press-releases/delta-cargo-dash-door-to-door.html`
- **9 pages** — e.g. `press-releases/author/admin.html`, `press-releases/author/heather-hughes.html`, `press-releases/page/1.html`
- **8 pages** — e.g. `resources/white-papers/2022-last-mile-outlook-the-future-of-crowdsourced-delivery.html`, `resources/white-papers/building-a-solid-financial-case-for-same-day-delivery-ent.html`, `resources/white-papers/closing-warehouse-fulfillment-gaps-with-crowdsourced-delivery.html`
- **5 pages** — e.g. `press-releases/author/admin/page/1.html`, `press-releases/author/admin/page/2.html`, `press-releases/author/admin/page/3.html`
- **5 pages** — e.g. `resources/case-studies/nothing-bundt-cakes-increases-sales-by-expanding-delivery-nationwide.html`, `resources/case-studies/roadie-enables-scriptdrop-to-increase-delivery-volume-in-hard-to-reach-areas.html`, `resources/case-studies/roadie-helps-top-u-s-airline-scale-delivery-capacity-by-600-in-real-time.html`
- **5 pages** — e.g. `resources/white-papers/4-ways-to-optimize-returns-with-crowdsourcing.html`, `resources/white-papers/a-greener-last-mile-starts-now-your-guide-to-reducing-delivery-emissions-ent.html`, `resources/white-papers/how-crowdsourced-delivery-can-help-businesses-win-and-keep-customers-in-the-last-mile.html`
- **4 pages** — e.g. `industries/auto-parts-delivery.html`, `industries/construction-supplies-delivery.html`, `industries/grocery-delivery.html`
- **4 pages** — e.g. `solutions/big-bulky-delivery.html`, `solutions/roadie-same-day.html`, `solutions/same-day.html`
- **3 pages** — e.g. `ecommerce-shipping.html`, `home-decor-delivery.html`, `rental-equipment-delivery.html`
- **3 pages** — e.g. `solutions/reverse-logistics-management.html`, `solutions/roadie-for-ups.html`, `solutions/roadiexd.html`
- **2 pages** — e.g. `home-improvement-delivery.html`, `pet-supply-delivery.html`
- **2 pages** — e.g. `resources/case-studies/author/roadie.html`, `resources/case-studies/tag/case-study.html`
- **1 pages** — e.g. `about/security.html`
- **1 pages** — e.g. `blog.html`
- **1 pages** — e.g. `careers.html`

## 3. Files created/updated

- **Mirrored HTML (rewrite, no Vite publicDir HTML):** `mirrored-pages/**`
- **Vite MPA shells:** `vite-shells/**`
- **Fragments / manifests / lazy loader:** `src/generated/**` (`loadPage.ts` uses `import.meta.glob`)
- **Tools:** see `migration-report.json` → `files.tools`
- **Runtime:** see `migration-report.json` → `files.runtime`

## 4. Risk report

- **Mid-body script heuristic:** 99 pages flagged (`midBodyScriptRisk` in manifests / fragment-extraction.json). Manual spot-check vs static `serve .` at `/mirrored-pages/<path>.html`.
- **CSR / DOMContentLoaded:** body scripts replay after React commit. Late `DOMContentLoaded` registrations during replay are handled by `withDomContentLoadedReplayCompat` in [`src/legacy/domContentLoadedCompat.ts`](../src/legacy/domContentLoadedCompat.ts) (used from [`loadLegacyManifest.ts`](../src/legacy/loadLegacyManifest.ts)). See [`audit/RUNTIME_PARITY_REPORT.md`](RUNTIME_PARITY_REPORT.md) and [`audit/runtime-parity-report.json`](runtime-parity-report.json).
- **Third-party / network:** unchanged dependency on GTM, Tealium, HubSpot, etc.

### Runtime parity (automated)

Generated: 2026-04-21T20:39:46.832Z

| Bucket | Count |
|--------|-------|
| safe as-is | 5 |
| needs compatibility shim (DCL in inline) | 65 |
| needs page-specific handling | 42 |
| mid-body watch only | 0 |
| static-only denylist | 0 |

Pages with inline `DOMContentLoaded` usage (handled by scoped replay shim): **107**.


## 5. Final verdict

- **Migrated:** 112 canonical marketing pages (100% of current inventory canonical set).
- **Remaining:** blog posts; query-string / AMP duplicate filenames; `hs-search-results.html`; `_downloads.html`.
- **Next high-leverage step:** SSR/prerender to reduce first-paint flash; optional blog pipeline using the same extract+manifest flow

---

Static mirror QA (no React): `npm run dev` then open `http://localhost:5173/mirrored-pages/index.html` (assets resolve from repo root).

React MPA preview: `npm run preview:react` — homepage at `http://localhost:4174/index.html` (after `build:react` runs `flatten:react-dist`, same as Vite dev via canonical route plugin to `vite-shells/`).

**Production URLs:** `build:react` runs `flatten:react-dist` so `dist-react/index.html`, `dist-react/solutions/same-day.html`, etc. sit next to `dist-react/assets/`. Map clean marketing paths with a CDN or reverse proxy. Details: `audit/RUNTIME_PARITY_REPORT.md`.
