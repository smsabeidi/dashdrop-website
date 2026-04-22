import type { LegacyManifest } from "../legacy/loadLegacyManifest";

const fragmentGlob = import.meta.glob<string>("./fragments/**/*.fragment.html", {
  query: "?raw",
  import: "default",
  eager: false,
});

const manifestGlob = import.meta.glob<LegacyManifest>("./manifests/**/*.manifest.json", {
  import: "default",
  eager: false,
});

export async function loadPageEntry(
  pageKey: string,
): Promise<{ fragment: string; manifest: LegacyManifest } | null> {
  const fragKey = `./fragments/${pageKey}.fragment.html`;
  const manKey = `./manifests/${pageKey}.manifest.json`;
  const fragLoader = fragmentGlob[fragKey];
  const manLoader = manifestGlob[manKey];
  if (!fragLoader || !manLoader) return null;
  const [fragment, manifest] = await Promise.all([
    fragLoader() as Promise<string>,
    manLoader() as Promise<LegacyManifest>,
  ]);
  return { fragment, manifest };
}
