#!/usr/bin/env node
/**
 * For each public HTML file: write body fragment (scripts stripped except application/json)
 * and legacy-manifest.json (ordered executable scripts from body).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_HTML = path.join(ROOT, "mirrored-pages");
const FRAGMENTS = path.join(ROOT, "src", "generated", "fragments");
const MANIFESTS = path.join(ROOT, "src", "generated", "manifests");

/**
 * @param {string} attrString
 * @returns {{ src: string | null, async: boolean, defer: boolean, type: string | null, id: string | null, charset: string | null, attribs: Record<string,string> }}
 */
function parseScriptAttributes(attrString) {
  const attribs = {};
  let src = null;
  let type = null;
  let id = null;
  let charset = null;
  let async = false;
  let defer = false;

  const re =
    /([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    const key = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? "";
    if (key === "async") {
      async = true;
      continue;
    }
    if (key === "defer") {
      defer = true;
      continue;
    }
    if (key === "src") src = val;
    else if (key === "type") type = val;
    else if (key === "id") id = val;
    else if (key === "charset") charset = val;
    else attribs[m[1]] = val;
  }

  return { src, async, defer, type, id, charset, attribs };
}

/**
 * @param {string} bodyInner
 */
function extractExecutableScripts(bodyInner) {
  const entries = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(bodyInner)) !== null) {
    const attrStr = m[1];
    const inner = m[2];
    const fullStart = m.index;
    if (/type\s*=\s*["']application\/json["']/i.test(attrStr)) continue;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrStr)) continue;
    const attrs = parseScriptAttributes(attrStr.trim());
    if (attrs.src) {
      entries.push({
        kind: "external",
        src: attrs.src,
        async: attrs.async,
        defer: attrs.defer,
        type: attrs.type,
        id: attrs.id,
        charset: attrs.charset,
        attribs: attrs.attribs,
      });
    } else {
      entries.push({ kind: "inline", source: inner });
    }
    entries[entries.length - 1].index = fullStart;
  }
  return entries;
}

/**
 * @param {string} bodyInner
 */
function stripExecutableScripts(bodyInner) {
  return bodyInner.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (full) => {
    if (/type\s*=\s*["']application\/json["']/i.test(full)) return full;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(full)) return full;
    return "";
  });
}

/**
 * @param {string} relPublic
 */
function publicPathToPageKey(relPublic) {
  return relPublic.replace(/\.html$/i, "").replace(/\\/g, "/");
}

function walkHtml(dir, baseRel, out) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    const rel = path.join(baseRel, name.name).replace(/\\/g, "/");
    if (name.isDirectory()) walkHtml(full, rel, out);
    else if (name.isFile() && name.name.endsWith(".html")) out.push(rel);
  }
}

function main() {
  if (!fs.existsSync(SOURCE_HTML)) {
    console.error("Missing mirrored-pages/ — run sync-marketing-public first");
    process.exit(1);
  }

  const htmlFiles = [];
  walkHtml(SOURCE_HTML, "", htmlFiles);
  htmlFiles.sort();

  fs.rmSync(FRAGMENTS, { recursive: true, force: true });
  fs.rmSync(MANIFESTS, { recursive: true, force: true });
  fs.mkdirSync(FRAGMENTS, { recursive: true });
  fs.mkdirSync(MANIFESTS, { recursive: true });

  const audit = { pages: [] };

  for (const rel of htmlFiles) {
    const abs = path.join(SOURCE_HTML, rel);
    const html = fs.readFileSync(abs, "utf8");
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!bodyMatch) {
      console.warn("No body:", rel);
      continue;
    }
    const bodyOpen = html.match(/<body([^>]*)>/i);
    const bodyAttrs = bodyOpen ? bodyOpen[1] : "";
    const bodyInner = bodyMatch[1];

    const pageKey = publicPathToPageKey(rel);
    const fragPath = path.join(FRAGMENTS, `${pageKey}.fragment.html`);
    const manPath = path.join(MANIFESTS, `${pageKey}.manifest.json`);

    fs.mkdirSync(path.dirname(fragPath), { recursive: true });
    fs.mkdirSync(path.dirname(manPath), { recursive: true });

    const rawScripts = extractExecutableScripts(bodyInner);
    const entries = rawScripts.map(({ index, ...rest }) => rest);

    const lastFooter = bodyInner.lastIndexOf("</footer>");
    let executableScriptsBeforeFooter = 0;
    if (lastFooter !== -1) {
      for (const s of rawScripts) {
        if (s.index < lastFooter) executableScriptsBeforeFooter++;
      }
    }
    const midBodyScriptRisk = lastFooter !== -1 && executableScriptsBeforeFooter > 0;

    const stripped = stripExecutableScripts(bodyInner);
    fs.writeFileSync(fragPath, stripped, "utf8");

    const manifest = {
      pageKey,
      sitePath: rel.replace(/\\/g, "/"),
      bodyAttrs,
      midBodyScriptRisk,
      executableScriptsBeforeFooter,
      executableScriptCountInBody: rawScripts.length,
      entries,
    };
    fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2), "utf8");

    audit.pages.push({
      pageKey,
      midBodyScriptRisk,
      executableScriptsBeforeFooter,
      executableScriptCount: entries.length,
    });
  }

  fs.mkdirSync(path.join(ROOT, "audit"), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, "audit", "fragment-extraction.json"),
    JSON.stringify(audit, null, 2),
    "utf8",
  );

  console.log("Wrote fragments + manifests for", htmlFiles.length, "pages");
}

main();
