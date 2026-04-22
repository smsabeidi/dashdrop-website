import { appendExternalScript, appendInlineScript } from "./appendScript";
import { withDomContentLoadedReplayCompat } from "./domContentLoadedCompat";

export type LegacyManifestEntry =
  | {
      kind: "external";
      src: string;
      async: boolean;
      defer: boolean;
      type: string | null;
      id: string | null;
      charset: string | null;
      attribs: Record<string, string>;
    }
  | { kind: "inline"; source: string };

export type LegacyManifest = {
  pageKey: string;
  sitePath: string;
  bodyAttrs?: string;
  midBodyScriptRisk?: boolean;
  executableScriptsBeforeFooter?: number;
  executableScriptCountInBody?: number;
  entries: LegacyManifestEntry[];
};

/**
 * Replays body-end legacy scripts from the mirror manifest in order.
 * No global singleton — safe to call per page load (MPA).
 */
export async function loadLegacyManifest(
  manifest: LegacyManifest,
): Promise<() => void> {
  return withDomContentLoadedReplayCompat(async () => {
    const appended: HTMLScriptElement[] = [];

    for (const entry of manifest.entries) {
      if (entry.kind === "inline") {
        appendInlineScript(entry.source);
        continue;
      }

      const { src, async, defer, type, id, charset, attribs } = entry;
      if (!src) continue;

      const mergedAttribs: Record<string, string> = { ...attribs };
      if (charset) mergedAttribs.charset = charset;

      try {
        await appendExternalScript(src, {
          async,
          defer,
          type: type ?? undefined,
          id: id ?? undefined,
          attribs: mergedAttribs,
        });
        const el = document.body.lastElementChild;
        if (el instanceof HTMLScriptElement) appended.push(el);
      } catch (e) {
        console.warn("Legacy script failed:", src, e);
      }
    }

    return () => {
      for (const el of appended) {
        try {
          el.remove();
        } catch {
          /* ignore */
        }
      }
    };
  });
}
