// Responsive banner images: one <picture> with smaller WebP copies for narrow
// screens, so a phone does not download the desktop-sized banner.
//
// The variant files are generated once by `node scripts/make-responsive-images.mjs`
// and committed; this module only decides whether to reference them. If a variant
// is missing (a banner uploaded through the admin, say) the markup degrades to a
// plain <img> — never to a broken source.
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

// Widths are ~1.5x the largest CSS size the banner is displayed at in that range,
// which keeps it sharp on phone screens without paying for a full 2x download.
export const BANNER_VARIANTS = [
  { suffix: "-mobile", width: 900, media: "(max-width: 640px)" },
  { suffix: "-tablet", width: 1100, media: "(max-width: 1024px)" },
];

export function variantPath(src, suffix) {
  return src.replace(/(\.[a-z0-9]+)$/i, `${suffix}.webp`);
}

function variantExists(src, suffix) {
  return existsSync(join(ROOT, variantPath(src, suffix).replace(/^\//, "")));
}

/**
 * Renders a banner as <picture> when its smaller copies exist, otherwise as the
 * plain <img> it was before.
 */
export function bannerPicture({ src, alt, loading = "eager", fetchpriority, width, height, className }) {
  const attrs = [
    `src="${src}"`,
    `alt="${alt || ""}"`,
    `loading="${loading}"`,
    fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
    width ? `width="${width}"` : "",
    height ? `height="${height}"` : "",
    className ? `class="${className}"` : "",
  ].filter(Boolean).join(" ");
  const img = `<img ${attrs}>`;

  const sources = BANNER_VARIANTS
    .filter((v) => variantExists(src, v.suffix))
    .map((v) => `<source media="${v.media}" type="image/webp" srcset="${variantPath(src, v.suffix)}">`)
    .join("");

  return sources ? `<picture>${sources}${img}</picture>` : img;
}
