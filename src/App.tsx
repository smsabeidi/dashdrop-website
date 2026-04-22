import { useLayoutEffect, useState } from "react";
import type { LegacyManifest } from "./legacy/loadLegacyManifest";
import { loadPageEntry } from "./generated/loadPage";
import { PreservedPage } from "./pages/PreservedPage";

function readPageKey(): string | undefined {
  const el = document.getElementById("root");
  const key = el?.dataset.pageKey;
  return key && key.length > 0 ? key : undefined;
}

export default function App() {
  const pageKey = readPageKey();
  const [entry, setEntry] = useState<{
    fragment: string;
    manifest: LegacyManifest;
  } | null>(null);

  useLayoutEffect(() => {
    if (!pageKey) return;
    let cancelled = false;
    void (async () => {
      const loaded = await loadPageEntry(pageKey);
      if (!cancelled && loaded) setEntry(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  if (!pageKey) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Missing data-page-key on #root</p>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  return <PreservedPage bodyHtml={entry.fragment} manifest={entry.manifest} />;
}
