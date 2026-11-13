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
import { smartContent } from "./smart.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../../../data");

function readJson(rel) {
  return JSON.parse(readFileSync(join(DATA, rel), "utf8"));
}

export function displayDate(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}
// A counter showing "0 lượt xem" under a headline reads as "nobody cares about
// this page" (audit G7), so the label is only shown from 100 views up.
function viewsLabel(n) {
  const v = Number(n) || 0;
  return v >= 100 ? `${v.toLocaleString("vi-VN")} lượt xem` : "";
}

// updated_at → YYYY-MM-DD, or "" when it is not a real edit date. A timestamp
// shared by 3+ records was written by a bulk import/migration, not by someone
// editing that record, so it says nothing about when the content changed.
let bulkStamps = new Set();
function markBulkStamps(records) {
  const n = new Map();
  for (const r of records) if (r.updated_at) n.set(r.updated_at, (n.get(r.updated_at) || 0) + 1);
  for (const [k, c] of n) if (c >= 3) bulkStamps.add(k);
}
export function editDate(updatedAt) {
  if (!updatedAt || bulkStamps.has(updatedAt)) return "";
  const m = String(updatedAt).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

// Tag names are partly stored as slugs or without accents ("den bat muoi");
// scripts/data/tag-labels.json maps them to the proper display name (audit T2).
const TAG_LABELS = (() => {
  try {
    return JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../data/tag-labels.json"), "utf8"));
  } catch {
    return {};
  }
})();
function tagLabel(t) {
  if (TAG_LABELS[t.slug]) return TAG_LABELS[t.slug];
  const name = String(t.name || t.slug).replace(/-/g, " ").trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
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
  markBulkStamps(productIndex);
  markBulkStamps(readJson("news.json"));
  const PRODUCTS = productIndex.map((p) => {
    const rec = readJson(`products/${p.slug}.json`);
    // Sizes are optional. When a product has them, the FIRST size is its
    // canonical price everywhere except the product page's own size picker —
    // cards, sorting, search, JSON-LD. Deriving it here (rather than in each
    // generator) keeps that rule in one place.
    const sizes = (rec.sizes || [])
      .filter((s) => s && String(s.name).trim())
      .map((s) => ({
        name: escText(String(s.name).trim()),
        price: String(s.price || "0"),
        regular_price: String(s.regular_price || s.price || "0"),
      }));
    const prices = sizes.length
      ? { ...rec.prices, price: sizes[0].price, regular_price: sizes[0].regular_price, sale_price: sizes[0].price }
      : rec.prices;
    const smart = smartContent(rec);
    return {
      ...rec,
      // Smart content replaces the description on the page; smartCss != null marks the page as needing its assets.
      description: smart ? smart.html : rec.description,
      smartCss: smart ? smart.css : null,
      name: escText(rec.name),
      sku: escText(rec.sku),
      brand_names: (rec.brand_names || []).map(escText),
      categories: (rec.categories || []).map((c) => ({ ...c, name: escText(c.name) })),
      images: (rec.images || []).map((img) => ({ ...img, alt: escText(img.alt) })),
      sizes: sizes,
      prices: prices,
      on_sale: sizes.length ? Number(prices.price) < Number(prices.regular_price) : !!rec.on_sale,
      // Absent on records saved before stock existed — those are in stock.
      in_stock: rec.in_stock !== false,
      modified: editDate(rec.updated_at),
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
      const smart = smartContent(full);
      return {
        ...full,
        body: smart ? smart.html : full.body,
        smartCss: smart ? smart.css : null,
        title: escText(full.title),
        excerpt: escText(full.excerpt),
        date: displayDate(full.date),
        dateIso: full.date,
        // Only when it differs from the publish date: "updated" on the same day adds nothing.
        modifiedIso: editDate(full.updated_at) > String(full.date || "") ? editDate(full.updated_at) : "",
        views: viewsLabel(full.views),
      };
    });

  const BLOG_CATEGORIES_WIDGET = readJson("news-categories.json").map((c) => ({
    name: escText(c.name),
    slug: c.slug,
    count: BLOG_POSTS.filter((p) => (p.categories || []).includes(c.slug)).length,
  }));
  const BLOG_TAGS_WIDGET = readJson("news-tags.json").map((t) => ({
    name: escText(tagLabel(t)),
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
