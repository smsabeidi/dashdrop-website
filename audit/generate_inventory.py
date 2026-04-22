#!/usr/bin/env python3
"""Generate page inventory and canonical URL list from mirrored HTML files."""
from __future__ import annotations

import csv
import json
import os
from collections import defaultdict

SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_URL = "https://www.roadie.com"
QUERY_CHAR = "\ufe56"  # SiteSucker replacement for "?" in filenames


def file_to_url_path(rel_path: str) -> str:
    """Relative path under site root -> URL path (leading slash, no .html)."""
    rel_path = rel_path.replace(os.sep, "/")
    if rel_path.endswith(".html"):
        rel_path = rel_path[:-5]
    if rel_path == "index":
        return "/"
    return "/" + rel_path


def canonical_file_rel(rel_path: str) -> str:
    """Map a mirrored .html path to canonical sibling path (still .html)."""
    rel_norm = rel_path.replace(os.sep, "/")
    if QUERY_CHAR not in rel_norm:
        return rel_norm
    left, _rest = rel_norm.split(QUERY_CHAR, 1)
    if left.endswith(".html"):
        return left
    return left + ".html"


def canonical_url(rel_path: str) -> str:
    c = canonical_file_rel(rel_path)
    path = file_to_url_path(c)
    return BASE_URL + (path if path.endswith("/") or path == "/" else path)


def main() -> None:
    all_html: list[str] = []
    for root, _dirs, files in os.walk(SITE_ROOT):
        # skip audit output dir for re-runs if we ever add html there
        if "audit" in root.replace(os.sep, "/").split("/"):
            continue
        for f in files:
            if f.endswith(".html"):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, SITE_ROOT)
                all_html.append(rel.replace(os.sep, "/"))

    all_html.sort()
    all_pages_path = os.path.join(AUDIT_DIR, "all-pages.txt")
    with open(all_pages_path, "w", encoding="utf-8") as fp:
        for p in all_html:
            fp.write(p + "\n")

    groups: dict[str, list[str]] = defaultdict(list)
    for p in all_html:
        key = canonical_file_rel(p)
        groups[key].append(p)

    canonical_rows: list[tuple[str, str, int]] = []
    for canon_file, variants in sorted(groups.items()):
        url = canonical_url(canon_file)
        canonical_rows.append((url, canon_file, len(variants)))

    canonical_path = os.path.join(AUDIT_DIR, "canonical-urls.txt")
    with open(canonical_path, "w", encoding="utf-8") as fp:
        for url, _cf, _n in canonical_rows:
            fp.write(url + "\n")

    dup_path = os.path.join(AUDIT_DIR, "canonical-dedupe-report.csv")
    with open(dup_path, "w", encoding="utf-8", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(["canonical_url", "canonical_file", "variant_count", "variants"])
        for url, cf, n in canonical_rows:
            vars_sorted = sorted(groups[cf])
            w.writerow([url, cf, n, " | ".join(vars_sorted)])

    summary = {
        "total_html_files": len(all_html),
        "canonical_unique_pages": len(groups),
        "duplicates_collapsed": len(all_html) - len(groups),
        "outputs": {
            "all_pages": os.path.basename(all_pages_path),
            "canonical_urls": os.path.basename(canonical_path),
            "dedupe_report": os.path.basename(dup_path),
        },
    }
    with open(os.path.join(AUDIT_DIR, "inventory-summary.json"), "w", encoding="utf-8") as fp:
        json.dump(summary, fp, indent=2)
        fp.write("\n")

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
