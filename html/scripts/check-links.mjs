// Crawls every generated index.html and verifies every internal <a href>
// resolves to a real file on disk. Run after `node scripts/build.mjs`.
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const entry of readdirSyncSafe(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git") continue;
      walk(full, out);
    } else if (entry === "index.html") {
      out.push(full);
    }
  }
  return out;
}

function readdirSyncSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function resolveHref(href) {
  const path = href.split("#")[0].split("?")[0];
  if (!path.startsWith("/")) return null; // external/relative, skip
  const rel = path.endsWith("/") ? path + "index.html" : path;
  return join(ROOT, rel);
}

const files = walk(ROOT);
let brokenCount = 0;
const brokenByFile = new Map();

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href === "#" || href.startsWith("javascript:")) continue;
    const target = resolveHref(href);
    if (!target) continue;
    if (!existsSync(target)) {
      brokenCount++;
      const rel = file.replace(ROOT, "");
      if (!brokenByFile.has(rel)) brokenByFile.set(rel, new Set());
      brokenByFile.get(rel).add(href);
    }
  }
}

console.log(`Checked ${files.length} pages.`);
if (brokenCount === 0) {
  console.log("No broken internal links found.");
} else {
  console.log(`Found ${brokenCount} broken internal link references:`);
  for (const [file, hrefs] of brokenByFile) {
    console.log(`  ${file}:`);
    for (const h of hrefs) console.log(`    -> ${h}`);
  }
  process.exitCode = 1;
}
