# Runtime parity report

Generated: 2026-04-21T20:39:57.978Z

Source: `src/generated/manifests/**/*.manifest.json` (112 manifests).

## Summary counts

| Category | Count | Meaning |
|----------|-------|---------|
| safe as-is | 5 | No DCL in inline, no jQuery `$()` ready-style guard heuristics, and no doc.write / readystate / mid-body-combo flags from rules below. |
| needs compatibility shim (DCL) | 65 | Inline `addEventListener('DOMContentLoaded', …)` — **handled** by `withDomContentLoadedReplayCompat`. |
| jQuery / watch | 0 | jQuery `$()` / `jQuery()` function wrapper in inlines; typically runs after jQuery external loads; verify in browser. |
| needs page-specific runtime handling | 42 | `document.write` and/or (mid-body + readystate) / similar — likely needs review or static-only. |
| mid-body watch only | 0 | `midBodyScriptRisk` only; no DCL / doc.write / readystate in inlines by heuristic. |
| should remain static-only for now | 0 | `audit/runtime-static-only-denylist.json` `pageKeys`. |

## Changelog (runtime hardening)

- **2026-04-21:** DCL compat: synthetic event target/currentTarget; dev canonical routes map /index.html and /<path>.html to vite-shells/ (vite.react.config.ts).

## Pages improved by DOMContentLoaded shim

107 page(s) register `DOMContentLoaded` in inline manifest sources (see `improvedByDomContentLoadedShim` in `runtime-parity-report.json`).

**jQuery-style** inline wrappers: `jQueryReadyStylePages` in JSON (`0` page(s)).

**`midBodyScriptRisk` flag (footer heuristic):** `99` manifest(s) — list `midBodyScriptRiskPageKeys` in JSON. Many of those are also in `needsCompatShim` because the early cookie / nav inline uses `DOMContentLoaded` (DCL takes precedence in categorization).

## Recommended final production serving strategy

1. **Deploy** `dist-react/` with **flattened** HTML: `dist-react/index.html`, `dist-react/solutions/same-day.html`, etc. (`build:react` runs `flatten:react-dist`). Root-absolute asset URLs are unchanged.
2. **Reverse proxy** map pretty URLs to `.html` files (or serve `.html` directly) — same as static Sitecore/Hubspot paths.
3. **Dev** uses `mpa-dev-canonical-shell-routes`: `http://localhost:5174/index.html` and `/solutions/same-day.html` resolve to the same shells as `/vite-shells/...`.

Full machine-readable output: [`audit/runtime-parity-report.json`](runtime-parity-report.json).

## Bucket lists (pageKey)

### safe as-is

- `resources/white-papers/4-ways-to-optimize-returns-with-crowdsourcing`
- `resources/white-papers/a-greener-last-mile-starts-now-your-guide-to-reducing-delivery-emissions-ent`
- `resources/white-papers/how-crowdsourced-delivery-can-help-businesses-win-and-keep-customers-in-the-last-mile`
- `resources/white-papers/why-crowdsourcing-is-the-secret-to-winning-with-bodfs`
- `resources/white-papers/your-guide-to-using-crowdsourcing-for-better-faster-always-on-returns`

### needs compatibility shim (DCL in inline; shim applied at replay)

- `about/security`
- `blog`
- `careers`
- `contact`
- `ecommerce-shipping`
- `home-decor-delivery`
- `home-improvement-delivery`
- `hot-shot-delivery`
- `index`
- `industries/auto-parts-delivery`
- `industries/construction-supplies-delivery`
- `industries/grocery-delivery`
- `industries/industrial-suppliers`
- `industries/lost-luggage-delivery`
- `industries/prescription-delivery`
- `industries/retail-delivery`
- `last-mile-delivery`
- `pet-supply-delivery`
- `press-releases`
- `press-releases/author/admin`
- `press-releases/author/admin/page/1`
- `press-releases/author/admin/page/2`
- `press-releases/author/admin/page/3`
- `press-releases/author/admin/page/4`
- `press-releases/author/admin/page/5`
- `press-releases/author/heather-hughes`
- `press-releases/page/1`
- `press-releases/page/2`
- `press-releases/page/3`
- `press-releases/page/4`
- `press-releases/page/5`
- `press-releases/tag/about-roadie`
- `press-releases/tag/press-release`
- `privacy`
- `rental-equipment-delivery`
- `resources`
- `resources/case-studies`
- `resources/case-studies/author/roadie`
- `resources/case-studies/nothing-bundt-cakes-increases-sales-by-expanding-delivery-nationwide`
- `resources/case-studies/pinch-grow-reach-sales-local-healthcare-roadie`
- `resources/case-studies/roadie-enables-scriptdrop-to-increase-delivery-volume-in-hard-to-reach-areas`
- `resources/case-studies/roadie-helps-top-u-s-airline-scale-delivery-capacity-by-600-in-real-time`
- `resources/case-studies/tag/case-study`
- `resources/case-studies/the-home-depot-rapidly-scales-same-day-delivery`
- `resources/case-studies/tractor-supply-company-delivers-same-day-from-100-of-stores`
- `resources/white-papers/2022-last-mile-outlook-the-future-of-crowdsourced-delivery`
- `resources/white-papers/22003`
- `resources/white-papers/building-a-solid-financial-case-for-same-day-delivery-ent`
- `resources/white-papers/closing-warehouse-fulfillment-gaps-with-crowdsourced-delivery`
- `resources/white-papers/consumers-on-same-day-delivery-what-they-want-and-what-they-will-pay-for`
- `resources/white-papers/deliver-oversized-items-same-day-with-ease`
- `resources/white-papers/expectations-vs-reality-the-surprising-performance-gap-of-non-traditional-last-mile-delivery`
- `resources/white-papers/research-report-is-same-day-delivery-worth-the-hype`
- `resources/white-papers/why-warehouses-are-the-key-to-your-same-day-fulfillment-strategy`
- `same-day-delivery-roi-calculator-roadie`
- `sign-up-log-in`
- `solutions/big-bulky-delivery`
- `solutions/next-day-delivery`
- `solutions/reverse-logistics-management`
- `solutions/roadie-for-ups`
- `solutions/roadie-same-day`
- `solutions/roadiexd`
- `solutions/same-day`
- `solutions/ship-from-store`
- `terms`

### jQuery / watch (heuristic: `$()` / jQuery`()` in inlines)

_None._

### needs page-specific runtime handling

- `press-releases/benjamin-moore-expands-partnership-with-roadie-to-accelerate-paint-delivery-for-diyers-and-professionals`
- `press-releases/blains-farm-fleet-improves-customer-experience-and-sales-with-roadie-same-day-delivery`
- `press-releases/delta-cargo-dash-door-to-door`
- `press-releases/delta-delivery-expansion`
- `press-releases/delta-roadie-partnership`
- `press-releases/doorstep-delivery-with-zero-contact`
- `press-releases/ey-announces-marc-gorlin-of-roadie-as-an-entrepreneur-of-the-year-2021-national-award-winner`
- `press-releases/ey-announces-marc-gorlin-of-roadie-as-an-entrepreneur-of-the-year-2021-southeast-award-winner`
- `press-releases/fresh-air-on-demand-roadie-partners-with-filterbuy-to-deliver-high-quality-air-filters-same-day-nationwide`
- `press-releases/goodr-delivery`
- `press-releases/goodwill-roadie-partnership`
- `press-releases/home-depot-delivery`
- `press-releases/home-depot-names-roadie-carrier-of-the-year`
- `press-releases/its-scary-fast-spirit-halloween-teams-up-with-roadie-for-same-day-delivery-launch`
- `press-releases/maven-gig-roadie`
- `press-releases/neighborliness-goes-national`
- `press-releases/revolutionizing-logistics-roadie-unveils-roadiexd-solution-to-supercharge-efficiency-speed-and-simplicity-for-big-bulky-deliveries`
- `press-releases/roadie-and-fanatics-team-up-on-local-next-day-delivery-to-sports-fans`
- `press-releases/roadie-enables-bouqs-to-flex-same-day-delivery-capacity-for-44-holiday-order-increase`
- `press-releases/roadie-helping-roadies-crowdsourced-delivery-platform-teams-up-with-crew-nation-to-help-live-music-crews`
- `press-releases/roadie-investment-home-depot`
- `press-releases/roadie-launches-web`
- `press-releases/roadie-ludacris-shipping-community`
- `press-releases/roadie-named-ajc-top-workplace-for-third-year-in-a-row`
- `press-releases/roadie-nccf-partnership`
- `press-releases/roadie-provides-free-shipping-on-items-to-and-from-baton-rouge-to-aid-flood-victims`
- `press-releases/roadie-ranks-no-203-on-2021-inc-5000-list-of-americas-fastest-growing-private-companies`
- `press-releases/roadie-red-herring-short-list`
- `press-releases/roadie-red-herring-winner`
- `press-releases/roadie-rentus-partnership`
- `press-releases/roadie-reports-demand-for-same-day-delivery-surges-amid-covid-19-pandemic`
- `press-releases/roadie-reports-retail-and-supply-chain-leaders-say-ultrafast-delivery-is-the-future-of-last-mile`
- `press-releases/roadie-series-a`
- `press-releases/roadie-series-b`
- `press-releases/roadie-survey-finds-36-7-of-retailers-restrict-oversized-item-delivery-even-as-demand-grows`
- `press-releases/roadie-survey-finds-80-of-companies-increase-revenue-with-same-day-delivery`
- `press-releases/roadie-survey-finds-flexibility-reigns-supreme-for-gig-workers-choosing-side-hustles`
- `press-releases/roadie-unlocks-faster-than-ever-home-delivery-for-retailers-with-roadie-direct-warehouse-delivery-just-in-time-for-peak-season`
- `press-releases/stride-and-roadie-partner-to-empower-drivers-with-financial-tool`
- `press-releases/tractor-supply-becomes-first-general-merchandise-retailer-to-launch-same-day-delivery-from-100-of-stores`
- `press-releases/ups-capital-insurance-solution-roadie-shipments`
- `press-releases/walmart-grocery-delivery`

### mid-body watch only

_None._

### should remain static-only for now

_None._
