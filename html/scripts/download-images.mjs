import fs from "node:fs";
import path from "node:path";

const urls = JSON.parse(fs.readFileSync("/tmp/all_image_urls.json", "utf8"));
const outDir = path.resolve("assets/images/products");
fs.mkdirSync(outDir, { recursive: true });

function localName(url) {
  const u = new URL(url);
  return path.basename(u.pathname);
}

async function download(url) {
  const name = localName(url);
  const dest = path.join(outDir, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return { url, ok: true, skipped: true };
  try {
    const res = await fetch(url);
    if (!res.ok) return { url, ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return { url, ok: true };
  } catch (e) {
    return { url, ok: false, error: String(e) };
  }
}

const CONCURRENCY = 12;
let idx = 0;
let done = 0;
const failures = [];

async function worker() {
  while (idx < urls.length) {
    const i = idx++;
    const r = await download(urls[i]);
    done++;
    if (!r.ok) failures.push(r);
    if (done % 50 === 0) console.log(`progress: ${done}/${urls.length}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Done. ${urls.length - failures.length}/${urls.length} succeeded.`);
if (failures.length) {
  console.log("Failures:", JSON.stringify(failures, null, 2));
  fs.writeFileSync("/tmp/image_download_failures.json", JSON.stringify(failures, null, 2));
}
