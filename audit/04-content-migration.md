# Blog and resources: migration from the mirror

## Image sources (fix order)

1. **Mirrored relative assets** — `../46302491.fs1.hubspotusercontent-na1.net/...` and similar: work when the full SiteSucker tree is present; for a single deploy bundle, either vendor those files into your CDN or rewrite URLs.

2. **Legacy WordPress CDN** — Many posts still reference `https://cdn.roadie.com/wp-content/uploads/...` in `data-lazy-src*` / `data-lazy-srcset*` while `src` points at a local or HubSpot placeholder. For migration:
   - Prefer downloading from `cdn.roadie.com` where still valid, or
   - Use the **mirrored** `cdn.roadie.com` folder under the parent SiteSucker root if the file was captured.

3. **HubSpot `missing-image.png`** — Indicates a failed import at some point; replace during migration with the correct asset from `data-lazy-*` or editorial review.

## Extraction approach

### Option 1 — Scripted HTML → Markdown (fast, messy)

- Parse each canonical blog HTML (see [`canonical-dedupe-report.csv`](canonical-dedupe-report.csv)): skip `﹖hs_amp=true` variants.
- Strip header/footer by selecting main content region (HubSpot: look for article body wrappers / `postBody` / similar stable class in a sample file).
- Convert to MD with `html2text` or `readability-lxml`; **human QA** every post for callouts and embeds.

### Option 2 — HubSpot export (best if you have portal access)

- Export blog posts and metadata from **HubSpot** directly (not from the scrape). Use the mirror only as a cross-check.

### Option 3 — CMS import

- **Contentful / Sanity / Strapi**: map fields (title, slug, date, hero image, body HTML, SEO meta).
- Store **cleaned HTML** or **MDX** in the body field; MDX if you need React shortcodes.

## Resources / white papers

Files under `resources/white-papers/` and case studies are long-form landing pages with gating (HubSpot CTAs). Migration steps:

1. Identify **gated** vs **ungated** assets (PDF links, thank-you behavior).
2. Rebuild gating with your form provider + file storage (S3, etc.).
3. Map each canonical URL from [`canonical-urls.txt`](canonical-urls.txt) to a slug in the new CMS.

## Practical checklist

- [ ] Use [`all-pages.txt`](all-pages.txt) as the master file list.
- [ ] Use [`canonical-urls.txt`](canonical-urls.txt) for redirects from old query/AMP filenames (U+FE56) to clean slugs.
- [ ] Build a spreadsheet: `canonical_url`, `content_type` (blog | resource | press), `author`, `published_at` (from meta if present).
- [ ] Batch-download missing images from `cdn.roadie.com` where `data-lazy-src` is authoritative.
- [ ] Remove duplicate AMP from the **new** site (301 from AMP URLs if they ever had external links).

## Helper script (future)

The repo includes [`generate_inventory.py`](generate_inventory.py) for URL inventory. A follow-up `extract_post.py` could take a single HTML path and emit Markdown for editorial pipeline automation.
