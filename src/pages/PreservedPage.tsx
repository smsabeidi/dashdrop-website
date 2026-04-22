import parse, {
  attributesToProps,
  type DOMNode,
  Element as HtmlElement,
} from "html-react-parser";
import type { JSX } from "react";
import { useLayoutEffect, useRef } from "react";
import type { LegacyManifest } from "../legacy/loadLegacyManifest";
import { loadLegacyManifest } from "../legacy/loadLegacyManifest";

function replaceJsonScript(domNode: DOMNode) {
  if (domNode.type !== "tag") return undefined;
  const el = domNode as HtmlElement;
  if (el.name !== "script" || el.attribs?.type !== "application/json") {
    return undefined;
  }
  const inner =
    el.children
      ?.map((c) =>
        c.type === "text" && "data" in c ? (c as { data: string }).data : "",
      )
      .join("") ?? "";
  const props = attributesToProps(el.attribs) as JSX.IntrinsicElements["script"];
  if (inner.length === 0) return <script {...props} />;
  return <script {...props} dangerouslySetInnerHTML={{ __html: inner }} />;
}

export function PreservedPage(props: {
  bodyHtml: string;
  manifest: LegacyManifest;
}) {
  const disposeRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dispose = await loadLegacyManifest(props.manifest);
        if (!cancelled) disposeRef.current = dispose;
      } catch (e) {
        console.error("loadLegacyManifest failed", props.manifest.pageKey, e);
      }
    })();
    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [props.manifest]);

  return <>{parse(props.bodyHtml, { replace: replaceJsonScript })}</>;
}
