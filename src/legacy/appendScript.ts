/** Root-relative URL (mirrors static `href` / `src` from site root). */
export function toAbsSrc(src: string): string {
  if (src.startsWith("//")) return `https:${src}`;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return src;
  return `/${src.replace(/^\.\//, "")}`;
}

export function appendExternalScript(
  src: string,
  opts?: {
    async?: boolean;
    defer?: boolean;
    type?: string;
    id?: string;
    attribs?: Record<string, string>;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = toAbsSrc(src);
    if (opts?.type) s.type = opts.type;
    if (opts?.id) s.id = opts.id;
    if (opts?.attribs) {
      for (const [k, v] of Object.entries(opts.attribs)) {
        s.setAttribute(k, v);
      }
    }
    const defer = opts?.defer ?? false;
    const async = opts?.async ?? false;
    s.defer = defer;
    s.async = async;
    if (!defer && !async) s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.body.appendChild(s);
  });
}

/** Classic ordered execution (matches parser-inserted non-async scripts). */
export function loadOrderedScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = toAbsSrc(src);
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.body.appendChild(s);
  });
}

export function appendInlineScript(source: string): void {
  const s = document.createElement("script");
  s.textContent = source;
  document.body.appendChild(s);
}
