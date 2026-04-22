# Pilot parity QA (index + contact)

## Automated checks (2026-04-14)

Run after `npm run sync:pilot` and `npm run build`:

- Static server (`serve dist`) returns **200** for:
  - `/` (homepage)
  - `/use.typekit.net/hph6sac.css`
  - `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/hub_generated/template_assets/1/186573512553/1774535261102/template_styles.min.css`
  - `/hs/scriptloader/46302491.js`
  - `/_hcms/forms/v2.js`
  - `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/roadie_served_zips_202506%20(1).csv`
- `serve` may **301** `/index.html` and `/contact.html` to slash-terminated URLs; following redirects yields **200**.

## Manual visual / interaction checklist

Compare **original** workspace files opened from the historical mirror layout (with sibling `../` assets) against **`npm run dev`** (docroot `public/`) for:

| Check | index | contact |
|--------|-------|---------|
| Layout / spacing / typography | ☐ | ☐ |
| Header + mega menu open/close | ☐ | ☐ |
| Logo + nav links (`/index.html`, `/contact.html`) | ☐ | ☐ |
| Hero / forms / modules visible | ☐ | ☐ |
| Splide / sliders / counters (if present) | ☐ | ☐ |
| Footer + social icons | ☐ | ☐ |
| Responsive breakpoints (e.g. 991 / 767) | ☐ | ☐ |

## Known differences vs raw mirror

- **Asset URLs**: `../Host/…` → `/Host/…` (same origin, single docroot).
- **Typekit**: Removed no-op `@import` of empty `p.typekit.net` CSS (see `docs/EXTERNAL_DEPENDENCIES.md`).
- **Live network**: Tealium `utag.js`, GTM `gtm.js`, and other HTTPS URLs may still load in browser; offline behavior may differ.
- **Missing mirrors**: CSS that references `static.hsappstatic.net` (and similar) may still produce **404** for icons until those trees are added to `public/` and optionally rewritten.

## Commands

```bash
npm run sync:pilot   # copy mirrors + rewrite HTML + patch Typekit CSS
npm run dev          # http://localhost:5173
npm run build && npm run preview
```
