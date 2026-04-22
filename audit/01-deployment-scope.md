# Deployment scope: `www.roadie.com` vs full SiteSucker tree

## Verdict

**A correct static deployment must include the parent SiteSucker directory** (or equivalent rewrites), not the `www.roadie.com` folder in isolation.

## Evidence

HTML uses **relative parent** asset URLs, for example from [`index.html`](../index.html):

- `../46302491.fs1.hubspotusercontent-na1.net/hubfs/46302491/...` (HubSpot design manager CSS, images, template JS)
- `../cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/...`
- `../use.typekit.net/hph6sac.css`
- `../tags.tiqcdn.com/...` (referenced from pages)
- `../www.googletagmanager.com/...` (mirrored GA loader filenames)

Those paths resolve only when the HTTP document root (or file base URL) is the **parent** of both `www.roadie.com` and each mirrored host folder.

## Verified on disk (2026-04-14)

Under `/Users/admin/Downloads/us.sitesucker.mac.sitesucker/` the following exist alongside `www.roadie.com/`:

| Folder | Role |
|--------|------|
| `46302491.fs1.hubspotusercontent-na1.net` | Primary HubSpot CDN mirror for portal 46302491 |
| `cdn.jsdelivr.net` | Splide and other npm CDN assets |
| `use.typekit.net` | Adobe fonts CSS |
| `tags.tiqcdn.com` | Tealium tag scripts |
| `js.hs-analytics.net`, `js.hs-banner.com`, `js.hubspot.com`, … | HubSpot / analytics scripts (mirrored; loaders may still fetch live URLs) |
| `cdn.roadie.com`, `static.hsstatic.net`, … | Additional mirrors |

Other portal mirrors (`302335.*`, `4604917.*`, `7052064.*`) may be referenced from some pages.

## Hosting options

1. **Recommended for local parity:** Serve static files from `us.sitesucker.mac.sitesucker/` with URL paths matching the mirror (e.g. `file:///…/www.roadie.com/index.html` is fragile; use a static server with cwd = parent folder).

2. **Single-folder deploy:** Copy or symlink required `../<host>/` trees into a combined artifact, **or** rewrite all `../host/...` references to absolute URLs on your CDN (high effort).

3. **Broken configuration:** Publishing only `www.roadie.com` to GitHub Pages / S3 prefix without rewrites will leave CSS/JS/images **broken** for most pages.

## Query-string filenames

SiteSucker encodes `?` as Unicode **U+FE56** in filenames (e.g. `contact﹖hsCtaAttrib=….html`). URLs in links use percent-encoding (`%EF%B9%96`). Deployment must preserve these filenames or implement redirects/rewrites to the canonical HTML files.
