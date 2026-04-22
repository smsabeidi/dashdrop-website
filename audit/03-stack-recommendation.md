# Rebuild target stack and form/search strategy

## Chosen direction (summary)

| Goal | Recommended stack | Forms | Site search |
|------|---------------------|-------|-------------|
| Stay closest to current ops | **HubSpot CMS** (existing portal + `Roadie-u4m` theme) | Native HubSpot forms & CTAs | HubSpot search |
| Leave HubSpot; marketing-only, fast static | **Astro** + content collections (MD/MDX) | HubSpot **embed** forms (still portal 46302491) **or** Marketo/Pardot/Formspark | **Pagefind** or Algolia on built output |
| Leave HubSpot; React team, complex personalization | **Next.js** (App Router) SSG/ISR + headless CMS | Same as Astro + server actions or API routes to your CRM | Algolia / Meilisearch |

## Recommendation for a clean production codebase

1. **Primary:** **Astro** (or Next.js if the org standard is React-only) for the marketing site.  
   - Rationale: This mirror is **954** flat HTML files with duplicated header/footer; a static site generator turns that into **components + content**, with sensible performance defaults.

2. **Keep HubSpot only where it pays rent:** If marketing still owns the portal, use **HubSpot form embeds** or the Forms API from the new site until forms are migrated.

3. **Do not** “clean” the raw HTML as the long-term source of truth. Use this mirror for **content extraction** (see [`04-content-migration.md`](04-content-migration.md)) and rebuild layout from a small set of layout components.

## Zip / interactive modules

The zip-code / coverage module loads HubSpot-generated `module_u4m-hero-zip-code.min.js`. On rebuild, treat it as a **black box to replace**: implement a small API against your own eligibility service (or keep a thin proxy to the existing backend if legally/contractually allowed).

## Search

`hs-search-results.html` is not a drop-in without HubSpot’s hosted search API. Rebuild options:

- **Pagefind** (zero-config static search after build).
- **Algolia / Meilisearch** if you need relevance tuning and synonyms at scale.

## Verdict

**Pick Astro + Pagefind + HubSpot embed forms** for the fastest path from this mirror to a maintainable site without locking in HubSpot rendering. **Pick stay-on-HubSpot** if the team will continue to own all pages in the portal and the scrape was only for backup.
