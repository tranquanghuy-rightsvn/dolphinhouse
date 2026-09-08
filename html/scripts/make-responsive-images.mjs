// Generates the smaller WebP copies of the site's banner images.
//
// Run by hand after adding or replacing a banner; the output is committed, so the
// CI build needs no image tooling at all:
//
//     cd html && node scripts/make-responsive-images.mjs [--force]
//
// Needs `sharp` (already available in the workspace: `npm i sharp` if missing).
// Existing variants are kept unless --force is given.
import { existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BANNER_VARIANTS, variantPath } from "./lib/responsive-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORCE = process.argv.includes("--force");

// Every image rendered through `bannerPicture()` must be listed here.
const BANNERS = ["/assets/images/products/joseph-rack-851690-grounded.webp"];

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch (e) {
  console.error("Cần thư viện `sharp` để tạo ảnh thu nhỏ: npm i sharp");
  process.exit(1);
}

const kb = (p) => (statSync(p).size / 1024).toFixed(0).padStart(4) + " KB";

for (const src of BANNERS) {
  const full = join(ROOT, src.replace(/^\//, ""));
  if (!existsSync(full)) {
    console.error(`Không tìm thấy ảnh gốc: ${src}`);
    process.exitCode = 1;
    continue;
  }
  const meta = await sharp(full).metadata();
  console.log(`${src}  (${meta.width}x${meta.height}, ${kb(full)})`);

  for (const variant of BANNER_VARIANTS) {
    const outRel = variantPath(src, variant.suffix);
    const out = join(ROOT, outRel.replace(/^\//, ""));
    if (existsSync(out) && !FORCE) {
      console.log(`  ${variant.suffix.padEnd(8)} bỏ qua (đã có) ${kb(out)}`);
      continue;
    }
    if (meta.width <= variant.width) {
      console.log(`  ${variant.suffix.padEnd(8)} bỏ qua (ảnh gốc đã nhỏ hơn ${variant.width}px)`);
      continue;
    }
    await sharp(full)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(out);
    console.log(`  ${variant.suffix.padEnd(8)} ${variant.width}px  ${kb(out)}  -> ${outRel}`);
  }
}
