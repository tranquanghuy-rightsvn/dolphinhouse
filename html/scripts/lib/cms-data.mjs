// Single entry point for all CMS-managed content (../data/**.json, written by the
// admin app) — returns exactly the shapes the builders already expected from the
// old js/data/*.data.js files, so the generators stay unchanged.
//
// Derived-at-build (never stored, so the CMS can't get them out of sync):
//   - category/tag `count`
//   - display date `dd/mm/yyyy` (stored ISO `YYYY-MM-DD`)
//   - `views` label (stored as a number)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../data");

function readJson(rel) {
  return JSON.parse(readFileSync(join(DATA, rel), "utf8"));
}

export function displayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}
function viewsLabel(n) {
  return `${Number(n) || 0} lượt xem`;
}
// Newest first; Array#sort is stable, so same-date records keep their stored order.
function byDateDesc(a, b) {
  return String(b.date || "").localeCompare(String(a.date || ""));
}

/**
 * CMS text fields are stored as plain text (that is what an editor typed), while
 * the generators inline them straight into HTML. Escaping them here, in the one
 * place every generator loads its data from, means no template has to remember
 * to do it — and a product named `Bộ nồi "A & B"` cannot break a page.
 */
function escText(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let cache = null;

export function loadCms() {
  if (cache) return cache;

  const productIndex = readJson("products.json");
  const PRODUCTS = productIndex.map((p) => {
    const rec = readJson(`products/${p.slug}.json`);
    return {
      ...rec,
      name: escText(rec.name),
      sku: escText(rec.sku),
      brand_names: (rec.brand_names || []).map(escText),
      categories: (rec.categories || []).map((c) => ({ ...c, name: escText(c.name) })),
      images: (rec.images || []).map((img) => ({ ...img, alt: escText(img.alt) })),
    };
  });

  const catRecords = readJson("product-categories.json");
  const CATEGORIES = catRecords.map((c) => ({
    id: c.id,
    name: escText(c.name),
    slug: c.slug,
    parent: c.parent || 0,
    count: PRODUCTS.filter((p) => (p.categories || []).some((pc) => pc.slug === c.slug)).length,
  }));
  const CATEGORY_META = {};
  for (const c of catRecords) {
    if (c.banner || c.description) CATEGORY_META[c.slug] = { banner: c.banner || undefined, description: c.description || undefined };
  }

  const BLOG_POSTS = readJson("news.json")
    .slice()
    .sort(byDateDesc)
    .map((p) => {
      const full = readJson(`news/${p.slug}.json`);
      return {
        ...full,
        title: escText(full.title),
        excerpt: escText(full.excerpt),
        date: displayDate(full.date),
        views: viewsLabel(full.views),
      };
    });

  const BLOG_CATEGORIES_WIDGET = readJson("news-categories.json").map((c) => ({
    name: escText(c.name),
    slug: c.slug,
    count: BLOG_POSTS.filter((p) => (p.categories || []).includes(c.slug)).length,
  }));
  const BLOG_TAGS_WIDGET = readJson("news-tags.json").map((t) => ({
    name: escText(t.name),
    slug: t.slug,
    count: BLOG_POSTS.filter((p) => (p.tags || []).includes(t.slug)).length,
  }));

  const VIDEOS = readJson("videos.json")
    .slice()
    .sort(byDateDesc)
    .map((v) => ({
      ...v,
      title: escText(v.title),
      description: escText(v.description),
      date: displayDate(v.date),
      views: viewsLabel(v.views),
    }));

  cache = { PRODUCTS, CATEGORIES, CATEGORY_META, BLOG_POSTS, BLOG_CATEGORIES_WIDGET, BLOG_TAGS_WIDGET, VIDEOS };
  return cache;
}
