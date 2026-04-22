# Analytics and tracking: decision for this mirror

## Decision (recommended default)

For a **local archive, migration source, or non-production preview**, **strip or disable** third-party tracking and ad pixels. For a **new production site** on a new domain, **rewire** to a fresh container (new GTM workspace / new GA4 property) with a single consent model.

## What is embedded today

| System | Purpose | Typical load |
|--------|---------|----------------|
| **Google Analytics 4** | Property `G-BBY915Q453` | Inline `gtag` + `googletagmanager.com/gtag/js` |
| **Google Tag Manager** | Container `GTM-T5L96GD` | Injected after HubSpot consent listener |
| **HubSpot** (portal `46302491`) | Analytics, cookies, ads pixel, web interactives, banners | [`hs/scriptloader/46302491.js`](../hs/scriptloader/46302491.js) loads `js.hs-analytics.net`, `js.hs-banner.com`, `js.hsadspixel.net`, `js.hubspot.com/web-interactives-embed.js` |
| **Tealium** | UPS/Roadie prod tag layer | `tags.tiqcdn.com/utag/ups/roadie/prod/utag.sync.js` + async `utag.js` |

Additional vendors may be injected **only at runtime** via GTM/Tealium (parent mirror includes TikTok, Bing, Demandbase, Salesloft, etc.).

## Option A — Static archive / engineering handoff (recommended here)

**Actions**

1. Remove or comment out: GA4 bootstrap, GTM bootstrap, Tealium `utag` scripts, and the HubSpot script loader include (or replace loader with empty stub).
2. Keep **Splide** and HubSpot **theme** JS that is required for layout (carousels, mega-menu) if you still want interactive parity offline; those are loaded from mirrored `../46302491…` and `../cdn.jsdelivr.net` paths, not from `js.hs-analytics.net`.

**Pros:** No stray events to production GA/Tealium; simpler GDPR posture for a zip you share internally.  
**Cons:** Loses marketing attribution on the mirror (acceptable for non-prod).

## Option B — Rewire for new production

**Actions**

1. Create **new** GA4 property + GTM container (or Tealium profile) for the new hostname.
2. Replace measurement IDs in HTML (or inject via one small config script at build time).
3. Implement **Consent Mode v2** (or CMP) before firing tags; align with legal on HubSpot vs non-HubSpot form tracking.

**Pros:** Clean attribution on go-live.  
**Cons:** Requires ongoing tag governance; HubSpot forms still tie to portal `46302491` unless forms are migrated.

## Option C — Leave as-is (not recommended)

Mirrored pages will continue to fire **production** Roadie/UPS tags when opened with network access, polluting analytics and raising consent issues if the viewer is not “real” traffic.

## Chosen path for this project

**Option A** for any static copy used for migration or QA; **Option B** only when deliberately standing up a new public host with legal + marketing sign-off.

No HTML in the mirror was modified in this pass; this document records the decision and implementation options only.
