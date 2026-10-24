// Smart content (GAS.md XX): a product description / post body redesigned as its
// own HTML + CSS, stored in the record's `smart` field. When present it replaces
// `description` / `body` on the page; the original stays in the record so the
// owner can always go back to it.
import { readFileSync } from "node:fs";

// The CSS scoper is shared with the admin preview: run the very file the browser loads.
const scopeSrc = readFileSync(new URL("../../js/smart-scope.js", import.meta.url), "utf8");
const { smcScopeCss, smcColorStyle } = new Function(`${scopeSrc}\nreturn { smcScopeCss, smcColorStyle };`)();

/** Record -> { html (wrapped in .smc-root), css (scoped) }, or null when it has no Smart content. */
export function smartContent(rec) {
  const s = rec && rec.smart;
  if (!s || !String(s.html || "").trim()) return null;
  const style = smcColorStyle(s.primary, s.accent);
  return {
    html: `<div class="smc-root smc-a"${style ? ` style="${style}"` : ""}>${s.html}</div>`,
    css: smcScopeCss(s.css),
  };
}

/** Extra <head> markup for a page that shows Smart content. */
export function smartHead(css) {
  return css == null ? "" : `<link rel="stylesheet" href="/css/smart.css">\n<style>${css}</style>`;
}
