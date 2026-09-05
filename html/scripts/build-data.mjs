import fs from "node:fs";
import path from "node:path";

const products = JSON.parse(fs.readFileSync("/tmp/all_products.json", "utf8"));
const categories = JSON.parse(fs.readFileSync("/tmp/categories.json", "utf8"));

function localImg(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!u.hostname.includes("dolphinhouse.vn")) return url;
    return "/assets/images/products/" + path.basename(u.pathname);
  } catch {
    return url;
  }
}

function rewriteHtmlImages(html) {
  if (!html) return "";
  return html.replace(/src="([^"]+)"/g, (m, src) => `src="${localImg(src)}"`);
}

const cleanProducts = products.map((p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  permalink: `/san-pham/${p.slug}/`,
  short_description: rewriteHtmlImages(p.short_description),
  description: rewriteHtmlImages(p.description),
  on_sale: p.on_sale,
  prices: p.prices,
  price_html: p.price_html,
  average_rating: p.average_rating,
  review_count: p.review_count,
  categories: (p.categories || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  images: (p.images || []).map((im) => ({
    src: localImg(im.src),
    thumbnail: localImg(im.src),
    alt: im.alt || p.name,
  })),
  brand_names: (p.brands || []).map((b) => b.name),
}));

const cleanCategories = categories
  .map((c) => ({
    id: c.id,
    name: c.name.replace(/&amp;/g, "&"),
    slug: c.slug,
    parent: c.parent,
    count: c.count,
  }))
  .filter((c) => c.count > 0);

fs.mkdirSync("js/data", { recursive: true });
fs.writeFileSync(
  "js/data/products.data.js",
  "// Auto-generated from dolphinhouse.vn WooCommerce Store API\nconst PRODUCTS = " +
    JSON.stringify(cleanProducts, null, 0) +
    ";\n"
);
fs.writeFileSync(
  "js/data/categories.data.js",
  "// Auto-generated from dolphinhouse.vn WooCommerce Store API\nconst CATEGORIES = " +
    JSON.stringify(cleanCategories, null, 0) +
    ";\n"
);

console.log("Wrote", cleanProducts.length, "products and", cleanCategories.length, "categories.");
