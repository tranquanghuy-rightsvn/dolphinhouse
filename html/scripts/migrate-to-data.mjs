// ONE-SHOT migration: js/data/*.data.js (+ scripts/data/*.body.html) -> ../data/**.json
//
// After this ran once, `../data/` is the single source of truth the CMS writes to
// and `scripts/lib/cms-data.mjs` reads at build time. Kept in the repo only so the
// conversion is reproducible/auditable — it is NOT part of the normal build.
// Refuses to overwrite an existing ../data unless run with --force.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataFile } from "./lib/load-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "..", "data");
const FORCE = process.argv.includes("--force");

if (existsSync(DATA) && !FORCE) {
  console.error("data/ already exists — rerun with --force to overwrite (CMS content would be lost).");
  process.exit(1);
}
if (existsSync(DATA)) rmSync(DATA, { recursive: true });

const { PRODUCTS } = loadDataFile(join(ROOT, "js/data/products.data.js"));
const { CATEGORIES } = loadDataFile(join(ROOT, "js/data/categories.data.js"));
const { CATEGORY_META } = loadDataFile(join(ROOT, "js/data/category-meta.data.js"));
const { BLOG_POSTS, BLOG_CATEGORIES_WIDGET, BLOG_TAGS_WIDGET, VIDEOS } = loadDataFile(join(ROOT, "js/data/blog.data.js"));

const NOW = new Date().toISOString();

// The old WooCommerce export mixed plain text and HTML-escaped text in the same
// fields (product names plain, the category names embedded in a product escaped).
// Data is normalised to PLAIN text here; escaping happens once at build time
// (scripts/lib/cms-data.mjs), so whatever the CMS stores is what an editor typed.
function plain(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function write(rel, value) {
  const full = join(DATA, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(value, null, 2) + "\n");
}

// "26/08/2026" -> "2026-08-26"
function isoFromDisplay(d) {
  const m = String(d || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d || "");
}
// "6 lượt xem" -> 6
function viewsToNumber(v) {
  const m = String(v || "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

/* ---------------- products ---------------- */
const productIndex = PRODUCTS.map((p) => {
  const full = {
    ...p,
    name: plain(p.name),
    sku: plain(p.sku),
    brand_names: (p.brand_names || []).map(plain),
    categories: (p.categories || []).map((c) => ({ ...c, name: plain(c.name) })),
    images: (p.images || []).map((img) => ({ ...img, alt: plain(img.alt) })),
    updated_at: NOW,
  };
  write(`products/${p.slug}.json`, full);
  return {
    id: full.id,
    name: full.name,
    slug: full.slug,
    sku: full.sku,
    brand_names: full.brand_names,
    categories: full.categories,
    prices: { price: p.prices.price, regular_price: p.prices.regular_price },
    on_sale: !!p.on_sale,
    image: p.images && p.images[0] ? p.images[0].src : "",
    updated_at: NOW,
  };
});
write("products.json", productIndex);

/* ---------------- product categories (merged with the old CATEGORY_META) ---------------- */
write(
  "product-categories.json",
  CATEGORIES.map((c) => ({
    id: c.id,
    name: plain(c.name),
    slug: c.slug,
    parent: c.parent || 0,
    banner: (CATEGORY_META[c.slug] || {}).banner || "",
    description: (CATEGORY_META[c.slug] || {}).description || "",
    updated_at: NOW,
  }))
);

/* ---------------- news ---------------- */
const newsIndex = BLOG_POSTS.map((p) => {
  const body = readFileSync(join(ROOT, "scripts/data", p.bodyFile), "utf8");
  const meta = {
    slug: p.slug,
    title: plain(p.title),
    date: isoFromDisplay(p.date),
    views: viewsToNumber(p.views),
    excerpt: plain(p.excerpt || ""),
    heroImg: p.heroImg,
    categories: p.categories || [],
    tags: p.tags || [],
    updated_at: NOW,
  };
  write(`news/${p.slug}.json`, { ...meta, body });
  return meta;
});
write("news.json", newsIndex);

write("news-categories.json", BLOG_CATEGORIES_WIDGET.map((c) => ({ name: plain(c.name), slug: c.slug, updated_at: NOW })));
write("news-tags.json", BLOG_TAGS_WIDGET.map((t) => ({ name: plain(t.name), slug: t.slug })));

/* ---------------- videos ---------------- */
write(
  "videos.json",
  VIDEOS.map((v) => ({
    slug: v.slug,
    title: plain(v.title),
    date: isoFromDisplay(v.date),
    views: viewsToNumber(v.views),
    thumb: v.thumb,
    youtube: v.youtube,
    description: v.description || "",
    updated_at: NOW,
  }))
);

console.log(
  `Migrated -> data/: ${productIndex.length} products, ${CATEGORIES.length} product categories, ` +
    `${newsIndex.length} posts, ${BLOG_CATEGORIES_WIDGET.length} news categories, ${BLOG_TAGS_WIDGET.length} tags, ${VIDEOS.length} videos`
);
