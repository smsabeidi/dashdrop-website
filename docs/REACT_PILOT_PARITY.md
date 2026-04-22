# React pilot homepage — parity report

This document describes the React/Vite preservation pilot (`npm run dev:react` / `npm run build:react`) relative to the static mirror (`mirrored-pages/*.html`, `npm run dev`). Full-site migration notes: [`audit/MIGRATION_REPORT.md`](../audit/MIGRATION_REPORT.md).

## Regeneration

After `npm run sync:pilot` / `npm run sync:marketing` or edits to mirrored HTML, refresh artifacts:

```bash
npm run gen:pages
```

This also runs [`tools/gen-runtime-parity-report.mjs`](../tools/gen-runtime-parity-report.mjs) (writes [`audit/runtime-parity-report.json`](../audit/runtime-parity-report.json) and [`audit/RUNTIME_PARITY_REPORT.md`](../audit/RUNTIME_PARITY_REPORT.md)).

Optional legacy homepage-only helper:

```bash
npm run gen:homepage
```

(`gen:homepage` still writes [`src/pages/homepage-body.fragment.html`](../src/pages/homepage-body.fragment.html) and [`index-react.html`](../index-react.html) from `mirrored-pages/index.html` for reference; the live React MPA uses `npm run gen:pages` + `vite-shells/`.)

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Static mirror, docroot **project root** (HTML under `mirrored-pages/`), port **5173** |
| `npm run dev:react` | React MPA, Vite + `public/` assets only, port **5174** (open `/vite-shells/index.html`) |
| `npm run build:react` | Output to `dist-react/` (shells at `dist-react/<pageKey>.html`, e.g. `dist-react/solutions/same-day.html`, beside `dist-react/assets/`) |
| `npm run preview:react` | `serve dist-react` on **4174** (dev-style homepage `/vite-shells/index.html`) |
| `npm run flatten:react-dist` | Optional post-build: copy `dist-react/vite-shells/**/*.html` into canonical `dist-react/<pageKey>.html` paths when missing (see [`tools/flatten-react-dist-html.mjs`](../tools/flatten-react-dist-html.mjs)) |

## What was reused unchanged (URLs)

### Stylesheets (`<link rel="stylesheet">` in `<head>`)

Same list as static homepage (from `mirrored-pages/index.html`):

- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/template_assets/1/186573512553/1774535261102/template_styles.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186574315053/1748023808410/module_u4m-mega-menu.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186575003801/1745817237649/module_u4m-hero.min.css`
- `/cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/css/splide.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186575003805/1745817080513/module_u4m-logo-trust-marks.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186571972238/1762879628065/module_u4m-alternating-content.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186571554115/1745857159180/module_u4m-cards.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/199505374495/1771616902138/module_u4m-hero-zip-code.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186574315062/1762893309048/module_u4m-top-tab.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186574315037/1745514165281/module_u4m-card-slider.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186574315042/1747148413685/module_u4m-cta-row.min.css`
- `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/module_assets/1/186573375904/1740888548460/module_u4m-social-share.min.css`
- `/use.typekit.net/hph6sac.css`

Plus all inline `<style>` blocks from the static `<head>` and body (preserved in `index-react.html` head or in the body fragment parsed into React).

### External scripts

**Left in `<head>`** (tracking / consent / tag managers — same as static; see [EXTERNAL_DEPENDENCIES.md](./EXTERNAL_DEPENDENCIES.md)):

- Inline GA4 / consent / `gtag` bootstrap + `/www.googletagmanager.com/gtag/js…id=G-BBY915Q453.js`
- GTM bootstrap (loads live `gtm.js`)
- Tealium `utag.sync.js` + async `utag.js`

**Loaded after React mount** — body executable scripts are replayed in mirror order via [`src/legacy/loadLegacyManifest.ts`](../src/legacy/loadLegacyManifest.ts) from per-page JSON manifests (`src/generated/manifests/*.manifest.json`) produced by [`tools/extract-page-artifacts.mjs`](../tools/extract-page-artifacts.mjs). Replay is wrapped in [`withDomContentLoadedReplayCompat`](../src/legacy/domContentLoadedCompat.ts) so inline snippets that register `DOMContentLoaded` listeners still run after `document.readyState` has left `"loading"`. Head tracking scripts remain in each `vite-shells/*.html` shell unchanged.

HubSpot and third-party paths under `hs/` are root-relative (`/hs/...`) when present in manifests so they match the static server layout.

## Intentional rewrites (not a redesign)

| Topic | Detail |
|-------|--------|
| Markup carrier | Per-page body HTML lives in [`src/generated/fragments/`](../src/generated/fragments/) and is rendered with [`html-react-parser`](https://github.com/remarkablemark/html-react-parser) in [`PreservedPage.tsx`](../src/pages/PreservedPage.tsx) (lazy-loaded via [`loadPage.ts`](../src/generated/loadPage.ts)). Class names, nesting, and inline `<style>` are preserved from `mirrored-pages/`. |
| `#root` | Each [`vite-shells/*.html`](../vite-shells/index.html) shell injects `#root{display:contents}` so the extra React mount node does not participate in layout like a block wrapper. |
| Script execution | Body `<script>` removed from fragments; replayed sequentially from manifests via [`loadLegacyManifest.ts`](../src/legacy/loadLegacyManifest.ts) with a scoped [`domContentLoadedCompat.ts`](../src/legacy/domContentLoadedCompat.ts) shim for late `DOMContentLoaded` registrations. |
| `application/json` script | HubSpot zip `data-*` script re-created via parser `replace` + `attributesToProps` so attributes stay on a real DOM `<script>` node. |
| Paths | Relative `hs/...` script URLs normalized to `/hs/...` when appended for stable resolution from any route. |

## Visual / behavioral parity checklist

Compare **static** `npm run dev` (5173) vs **React** `npm run dev:react` (5174):

- [ ] Layout / spacing / typography
- [ ] Header + mega menu open/close
- [ ] Logo + primary nav
- [ ] Hero + zip checker (CSV fetch, map, messages)
- [ ] Splide carousels (trust logos auto-scroll, card slider)
- [ ] Zip section animated counters
- [ ] Card slider row padding vs header width (`rowAlignment`)
- [ ] Footer + cookie settings link (requires OneTrust when loaded from web)
- [ ] Responsive breakpoints (991 / 767 / 480)

## Known deltas / risks

1. **First paint (CSR)** — Static HTML paints immediately; React must download and execute the bundle before `html-react-parser` runs. Expect a short blank or partial flash vs static unless a prerender/SSR step is added later.
2. **Vite build warning** — `index-react.html` contains a non-module `<script src="…gtag…">` in `<head>`; Vite logs that it cannot bundle that tag (expected; browser loads it at runtime).
3. **Network** — Same caveats as [EXTERNAL_DEPENDENCIES.md](./EXTERNAL_DEPENDENCIES.md): GTM, Tealium `utag.js`, HubSpot APIs, Google Fonts preconnect, etc., may still hit the live web.
4. **Duplicate `hsVars`** — Static assigns a minimal `hsVars` before `project.js`, then replaces with the full object after `hs-script-loader`; the pilot reproduces that pattern via inline `appendInlineScript` calls.
5. **Hot reload** — legacy script replay is per navigation / full reload; HMR may not re-run long chains predictably.

## Unresolved / watch-list dependencies

- **OneTrust** — Cookie settings handler calls `window.OneTrust` when present; otherwise logs to console (same as static inline behavior).
- **`window.splide.Extensions`** — Trust-logo Splide uses the auto-scroll extension object from the mirrored Splide extension bundle; if that global is missing, mount falls back to `mount()` without extensions (would change auto-scroll behavior — verify in browser).
- **HubSpot editor / preview scripts** — `HubspotToolsMenu` still loads in pilot builds; safe to keep for parity with mirror; remove only with product approval.

## Contact page

Migrated with the same preservation pipeline (`mirrored-pages/contact.html` → `vite-shells/contact.html`). Compare static `http://localhost:5173/mirrored-pages/contact.html` vs React `http://localhost:5174/vite-shells/contact.html`.
