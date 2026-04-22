# External dependencies and offline behavior (pilot: `index`, `contact`)

This rebuild consolidates mirrored third-party trees under `public/` and rewrites `../Host/…` references to root-relative `/Host/…`. Some behaviors still reach the live web or HubSpot APIs.

## Analytics and tags (tracking)

- **Google Analytics 4 / gtag**: Inline `gtag` config plus mirrored script under `www.googletagmanager.com/`. Inline GTM loader may still inject `https://www.googletagmanager.com/gtm.js?id=GTM-T5L96GD` when consent allows.
- **Tealium**: `tags.tiqcdn.com/utag/…` mirrored for `utag.sync.js`; inline bootstrap still loads `https://tags.tiqcdn.com/utag/ups/roadie/prod/utag.js` asynchronously.
- **HubSpot analytics / scriptloader**: `hs/scriptloader/46302491.js` and related `js.hs-*` hosts may request live HubSpot endpoints depending on page configuration.

**Policy**: Scripts were preserved as in the mirror. To remove tracking, edit the pilot HTML in the project root (`index.html`, `contact.html`) before running `npm run sync:pilot`, or post-process `public/*.html`—only after explicit product/legal approval.

## HubSpot forms (`contact.html`)

- **`_hcms/forms/v2.js`**: Copied to `public/_hcms/forms/v2.js`. HubSpot form embeds typically POST to HubSpot’s form endpoints (portal `46302491`). Submissions may succeed against production HubSpot, fail offline, or CORS-block depending on environment—**UI and validation** are still largely client-side from mirrored assets.
- **`formsBaseUrl: '/_hcms/forms/'`**: Expects the dev server docroot to be `public/` (satisfied by `serve public` and `serve dist`).

## Zip code hero module (`index.html`)

- **CSV**: `data-csv-url` points at `/46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/roadie_served_zips_202506%20(1).csv` after rewrite. Verified **HTTP 200** from static server when file is present in the HubSpot mirror tree.
- **Logic**: `module_u4m-hero-zip-code.min.js` runs in the browser; parity depends on that bundle plus jQuery/counterUp as in the original.

## HubSpot web interactives (`index.html`)

- **`/js.hubspot.com/web-interactives-embed.js`**: Mirrored; may load additional remote configuration in a live browser session.

## Adobe Fonts (Typekit)

- **`use.typekit.net/hph6sac.css`**: After sync, the **empty** nested `@import` from `p.typekit.net` (mirrored file contained only `/**/`) is **removed** so static tooling and Vite do not choke on `?`-style characters in on-disk filenames. **Font faces** remain in `hph6sac.css` with `url("af/…")` paths; mirrored font payload files live under `public/use.typekit.net/af/…`.
- **Risk**: If Adobe ever relied on rules only present in the removed import, typography could drift. In this mirror the import body was empty, so removal is low risk.

## Social / template CSS references

- Minified HubSpot CSS may reference `static.hsappstatic.net`, `302335.fs1.hubspotusercontent-na1.net`, etc. Those URLs are **not** bundled into this pilot `public/` tree unless added later. Icons or images loaded only via those URLs may **404** until the corresponding mirrors are copied and paths rewritten.

## Optional stub policy

- Do **not** strip analytics or third-party loaders in this repo without documenting the change and confirming approval.
- For a fully offline demo, consider a separate branch or env-specific HTML that comments out Tealium/GTM script tags (accepting behavioral diff).
