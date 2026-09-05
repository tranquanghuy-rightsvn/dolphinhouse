// Static-site generator for the Dolphin House clone.
// Replaces runtime JS templating (js/common.js, js/shop.js, js/product.js) with
// real static HTML written at build time, using clean (extensionless, trailing-slash)
// URLs that mirror dolphinhouse.vn's actual permalink structure.
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataFile } from "./lib/load-data.mjs";
import {
  page,
  productCardHtml,
  formatVnd,
  categoryUrl,
  brandSlug,
  brandUrl,
  SITE_URL,
  absUrl,
  stripHtml,
  truncate,
  breadcrumbLd,
  faqLd,
  faqSectionHtml,
} from "./lib/partials.mjs";
import { buildBlogListing, buildBlogPosts, buildBlogTaxonomies, buildGioiThieu, buildLienHe, buildVideos, buildSimplePage } from "./lib/blog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIRS = [
  "cua-hang",
  "danh-muc",
  "san-pham",
  "thuong-hieu",
  "tin-tuc",
  "danh-muc-tin-tuc",
  "tag",
  "videos",
  "gioi-thieu",
  "lien-he",
  "ho-tro-khach-hang",
  "hinh-thuc-thanh-toan",
  "hinh-thuc-van-chuyen",
  "he-thong-dai-ly",
  "chinh-sach-bao-mat",
  "dieu-khoan-su-dung",
  "cam-ket-chat-luong",
  "chinh-sach-bao-hanh-doi-tra",
  "gio-hang",
  "thanh-toan",
]; // regenerated fresh every build
const { BLOG_POSTS } = loadDataFile(join(ROOT, "js/data/blog.data.js"));

const { PRODUCTS } = loadDataFile(join(ROOT, "js/data/products.data.js"));
const { CATEGORIES } = loadDataFile(join(ROOT, "js/data/categories.data.js"));
const { HOME_HERO_MENU, HOME_BRANDS, HOME_BLOCKS } = loadDataFile(join(ROOT, "js/data/home-new.data.js"));
const { CATEGORY_META } = loadDataFile(join(ROOT, "js/data/category-meta.data.js"));

const PER_PAGE = 16;

// Every `index.html` written through here is a real crawlable route — its
// URL path is recorded for sitemap.xml generation at the end of the build.
const generatedPaths = [];
function write(relPath, html) {
  const full = join(ROOT, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  if (relPath.endsWith("index.html")) {
    generatedPaths.push("/" + relPath.slice(0, -"index.html".length));
  }
}

function legacyHref(href) {
  if (href === "index.html") return "/";
  if (href === "cua-hang.html") return "/cua-hang/";
  let m = href.match(/^danh-muc\.html\?slug=(.+)$/);
  if (m) {
    const cat = CATEGORIES.find((c) => c.slug === m[1]);
    return cat ? categoryUrl(cat, CATEGORIES) : `/danh-muc/${m[1]}/`;
  }
  m = href.match(/^san-pham\.html\?slug=(.+)$/);
  if (m) return `/san-pham/${m[1]}/`;
  return href;
}

function getCategoryDescendantSlugs(slug) {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return [slug];
  const children = CATEGORIES.filter((c) => c.parent === cat.id).map((c) => c.slug);
  return [slug, ...children];
}

function productsForCategory(slug) {
  const slugs = getCategoryDescendantSlugs(slug);
  return PRODUCTS.filter((p) => p.categories.some((c) => slugs.includes(c.slug)));
}

// dolphinhouse.vn has no separate WooCommerce brand-term export locally, so
// the brand list (matching the live product_brand-sitemap.xml exactly, one
// entry per brand actually used by a product) is derived straight from
// PRODUCTS.brand_names rather than a hand-maintained data file.
function getBrands() {
  const names = new Map();
  for (const p of PRODUCTS) {
    for (const name of p.brand_names || []) {
      if (!names.has(brandSlug(name))) names.set(brandSlug(name), name);
    }
  }
  return [...names.entries()]
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

function productsForBrand(name) {
  return PRODUCTS.filter((p) => (p.brand_names || []).includes(name));
}

// ---------- Home page ----------
const HOME_FAQ = [
  {
    question: "Dolphin House có những sản phẩm gia dụng nào?",
    answer:
      "Dolphin House chọn lọc đồ gia dụng thông minh, thiết bị nhà bếp, điện gia dụng, ghế ô tô trẻ em và tiện ích không gian sống — phù hợp cho căn bếp, phòng ngủ và các khu vực sinh hoạt trong gia đình hiện đại.",
  },
  {
    question: "Đặt hàng tại Dolphin House như thế nào?",
    answer:
      'Chọn sản phẩm, bấm "Thêm vào giỏ hàng" rồi vào giỏ hàng để tiến hành thanh toán, hoặc gọi trực tiếp hotline 086 639 3892 để được tư vấn và đặt hàng nhanh.',
  },
  {
    question: "Dolphin House giao hàng khu vực nào, mất bao lâu?",
    answer:
      'Dolphin House giao hàng toàn quốc, thời gian giao phụ thuộc khu vực và sản phẩm. Chi tiết tại trang <a href="/hinh-thuc-van-chuyen/">Hình thức vận chuyển</a>.',
  },
  {
    question: "Dolphin House hỗ trợ những hình thức thanh toán nào?",
    answer:
      'Hỗ trợ thanh toán khi nhận hàng (COD) và chuyển khoản ngân hàng. Xem đầy đủ tại trang <a href="/hinh-thuc-thanh-toan/">Hình thức thanh toán</a>.',
  },
  {
    question: "Sản phẩm mua tại Dolphin House có được bảo hành, đổi trả không?",
    answer:
      'Có. Mỗi sản phẩm có thời hạn bảo hành theo nhà sản xuất và được đổi trả nếu lỗi kỹ thuật. Chi tiết tại trang <a href="/chinh-sach-bao-hanh-doi-tra/">Chính sách bảo hành - đổi trả</a>.',
  },
];

function buildHome() {
  const retailMenu = HOME_HERO_MENU.map(
    (m) => `
    <a class="dh-home-retail-menu-item" href="/danh-muc/${m.slug}/">
      <span class="dh-home-retail-menu-index">${m.n}</span>
      <span class="dh-home-retail-menu-copy"><strong>${m.t}</strong><small>${m.s}</small></span>
      <span class="dh-home-retail-menu-arrow">→</span>
    </a>`
  ).join("");

  const brandsGrid = HOME_BRANDS.map(
    (b) => `<a class="dh-home-brand-link" href="${brandUrl(b.t)}"><strong>${b.t}</strong><small>${b.s}</small></a>`
  ).join("");

  // Capped at 8 (design target) — only 5 real posts exist today, so the
  // slider just plays those 5; it fills up automatically as more posts are
  // added later, no code change needed.
  const latestPosts = BLOG_POSTS.slice(0, 8);
  const newsCardHtml = (p) => `
    <article class="dh-home-news-card">
      <a class="blog-card-thumb" href="/${p.slug}/"><img src="${p.heroImg}" alt="${p.title}" loading="lazy"></a>
      <div class="blog-card-body">
        <a class="blog-card-title" href="/${p.slug}/">${p.title}</a>
        <div class="blog-card-date">Ngày cập nhật <strong>${p.date}</strong></div>
        ${p.excerpt ? `<p class="blog-card-excerpt">${p.excerpt}</p>` : ""}
      </div>
    </article>`;
  // Track is the card list duplicated once — js/news-slider.js steps through
  // it one card per click and silently rewinds by one set's width whenever
  // it crosses into the duplicate, so next/prev both loop forever.
  const newsTrackHtml = latestPosts.map(newsCardHtml).join("") + latestPosts.map(newsCardHtml).join("");

  // Blocks with real subcategories keep the "Danh mục con" sidebar + 4
  // curated products. The rest previously showed a "Gợi ý trong nhóm" sidebar
  // duplicating info already visible in the product cards — removed, and the
  // freed-up column becomes a 5th product pulled live from the category
  // (real inventory, not the static hand-picked list) instead of empty space.
  const blocks = HOME_BLOCKS.map((blk) => {
    const hasSidebar = blk.sideTitle === "Danh mục con";
    const slugMatch = blk.more.match(/slug=([^&]+)/);
    const catSlug = slugMatch ? slugMatch[1] : null;
    const displayItems = hasSidebar
      ? blk.items
      : (catSlug ? productsForCategory(catSlug) : []).slice(0, 5).map((p) => ({
          slug: p.slug,
          title: p.name,
          img: p.images[0] ? p.images[0].src : "",
          price: formatVnd(p.prices.price),
          rawPrice: p.prices.price,
          del: p.on_sale && p.prices.regular_price !== p.prices.price ? formatVnd(p.prices.regular_price) : null,
        }));
    return `
    <section class="dh-home-category-block">
      <div class="dh-home-shelf-heading">
        <h2>${blk.title}</h2>
        <a href="${legacyHref(blk.more)}">Xem thêm →</a>
      </div>
      <div class="dh-home-shelf-body${hasSidebar ? "" : " dh-home-shelf-body--full"}">
        ${hasSidebar ? `
        <aside class="dh-home-shelf-subcategories">
          <span class="dh-home-shelf-subcategories-title">${blk.sideTitle}</span>
          <div class="dh-home-shelf-subcategories-list">
            ${blk.links.map((l) => `<a href="${legacyHref(l.href)}">${l.t}</a>`).join("")}
          </div>
        </aside>` : ""}
        <div class="dh-home-shelf-products${hasSidebar ? "" : " dh-home-shelf-products--five"}">
          ${displayItems.map((p) => {
            const safeName = p.title.replace(/"/g, "&quot;");
            const rawPrice = p.rawPrice != null ? p.rawPrice : (p.price || "").replace(/[^\d]/g, "");
            return `
          <div class="dh-home-category-product">
            <a class="dh-home-category-product-link" href="/san-pham/${p.slug}/">
              <img src="${p.img}" alt="${safeName}" loading="lazy">
              <span class="dh-home-category-product-body">
                <strong>${p.title}</strong>
                ${p.del ? `<del>${p.del}</del>` : ""}
                <span class="dh-home-category-product-price">${p.price}</span>
              </span>
            </a>
            <button type="button" class="dh-cart-add-btn" data-slug="${p.slug}" data-name="${safeName}" data-price="${rawPrice}" data-image="${p.img}" aria-label="Thêm ${safeName} vào giỏ hàng">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            </button>
          </div>`;
          }).join("")}
        </div>
      </div>
    </section>`;
  }).join("");

  const bodyMain = `
<main>
  <div class="container">
    <div class="dh-home-head">
      <div>
        <h1>Dolphin House – Gia dụng thông minh cho gia đình hiện đại</h1>
        <p>Khám phá các nhóm sản phẩm được chọn lọc cho căn bếp, việc nhà và không gian sống — mỗi danh mục có lối đi riêng để bạn tìm nhanh hơn.</p>
      </div>
      <a class="link-arrow" href="/cua-hang/">Xem toàn bộ cửa hàng →</a>
    </div>

    <section class="dh-home-retail-top">
      <div class="dh-home-retail-menu">
        <div class="dh-home-retail-menu-head">
          <small>Khám phá Dolphin House</small>
          <strong>Chọn theo nhu cầu của gia đình</strong>
        </div>
        <div class="dh-home-retail-menu-list">${retailMenu}</div>
      </div>
      <div class="dh-home-retail-hero">
        <div class="dh-home-retail-hero-media">
          <img src="https://dolphinhouse.vn/wp-content/uploads/2026/09/joseph-rack-851690-grounded.webp" alt="Góc bếp gọn gàng với đồ gia dụng Dolphin House" loading="eager">
        </div>
        <div class="dh-home-retail-hero-copy">
          <small>Góc chọn đồ của Dolphin House</small>
          <h2>Nhà gọn hơn, mỗi ngày nhẹ hơn</h2>
          <p>Từ căn bếp đến góc phòng khách, những món đồ được chọn vì công dụng thật và cảm giác dùng dễ chịu.</p>
          <a href="/cua-hang/">Xem toàn bộ sản phẩm →</a>
        </div>
      </div>
    </section>

    <section class="dh-home-brands">
      <div class="dh-home-brands-head">
        <div>
          <strong>Thương hiệu được chọn lọc</strong>
          <span>Những cái tên quen thuộc trong căn bếp và không gian sống của gia đình.</span>
        </div>
        <a class="link-arrow" href="/cua-hang/">Xem tất cả sản phẩm →</a>
      </div>
      <div class="dh-home-brands-grid">${brandsGrid}</div>
    </section>

    <div id="home-blocks">${blocks}</div>

    <section class="dh-home-brands">
      <div class="dh-home-brands-head">
        <div>
          <strong>Tin tức Dolphin House</strong>
          <span>Kinh nghiệm chọn đồ gia dụng và mẹo chăm sóc không gian sống mới nhất.</span>
        </div>
        <a class="link-arrow" href="/tin-tuc/">Xem tất cả bài viết →</a>
      </div>
      <div class="dh-home-news-slider">
        <button type="button" class="dh-news-nav dh-news-prev" aria-label="Bài trước"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
        <div class="dh-home-news-viewport">
          <div class="dh-home-news-track">${newsTrackHtml}</div>
        </div>
        <button type="button" class="dh-news-nav dh-news-next" aria-label="Bài tiếp"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
      </div>
    </section>

    ${faqSectionHtml(HOME_FAQ)}
  </div>
</main>`;

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dolphin House",
    url: `${SITE_URL}/`,
    logo: absUrl("/assets/images/site/dolphin-house-logo-320x100-1.webp"),
    address: {
      "@type": "PostalAddress",
      streetAddress: "S219 Đại Dương 8, Vinhomes Ocean Park",
      addressLocality: "Gia Lâm",
      addressRegion: "Hà Nội",
      addressCountry: "VN",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+84-86-639-3892",
      contactType: "customer service",
      areaServed: "VN",
    },
  };
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Dolphin House",
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/cua-hang/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  write(
    "index.html",
    page({
      title: "Dolphin House | Gia Dụng Thông Minh Cao Cấp Cho Gia Đình Hiện Đại",
      description: "Dolphin House chọn lọc đồ gia dụng thông minh, thiết bị bếp, điện gia dụng và tiện ích nhà cửa cho gia đình hiện đại.",
      path: "/",
      categories: CATEGORIES,
      activePath: "/",
      bodyMain,
      extraScripts: ["/js/site.js", "/js/news-slider.js"],
      jsonLd: [orgLd, websiteLd, faqLd(HOME_FAQ)],
    })
  );
}

// ---------- Listing (shop + category), with static pagination ----------
function paginationHtml(basePath, totalPages, currentPage) {
  if (totalPages <= 1) return "";
  const pageHref = (p) => (p === 1 ? basePath : `${basePath}page/${p}/`);
  let html = "";
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
      html += p === currentPage ? `<span class="current">${p}</span>` : `<a href="${pageHref(p)}">${p}</a>`;
    } else if (html.slice(-10).indexOf("…") === -1) {
      html += `<span>…</span>`;
    }
  }
  if (currentPage < totalPages) html += `<a href="${pageHref(currentPage + 1)}">→</a>`;
  return html;
}

// basePath must end with "/". Emits one static page per pagination page.
// `banner`/`description` are real per-category content — most categories have
// neither on the live site (only heading + product grid), which is faithfully
// reproduced here rather than filled in with invented copy.
function buildListing({ basePath, title, description, banner, activePath, products, breadcrumbCurrent, breadcrumbHref, breadcrumbHrefLabel, embedJsonId }) {
  // Every listing page gets a real meta description: the term description
  // when there is one, otherwise a generated one from the title — never
  // left blank, unlike the visible on-page description block above it.
  const metaDescriptionBase = description
    ? truncate(stripHtml(description), 160)
    : `${title} chính hãng tại Dolphin House — giao hàng toàn quốc, tư vấn tận tâm, đổi trả theo chính sách.`;
  const listingImage = banner || (products[0] && products[0].images[0] && products[0].images[0].src) || undefined;
  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = products.slice(start, start + PER_PAGE);
    const from = products.length === 0 ? 0 : start + 1;
    const to = Math.min(start + PER_PAGE, products.length);

    const grid = pageItems.length
      ? `<div class="product-grid" id="product-listing">${pageItems.map(productCardHtml).join("")}</div>`
      : `<p class="empty-state" id="empty-msg">Không tìm thấy sản phẩm phù hợp. <a class="link-arrow" href="/cua-hang/">Xem tất cả sản phẩm →</a></p>`;

    const breadcrumb = breadcrumbHref
      ? `<a href="/">Trang chủ</a> / <a href="${breadcrumbHref}">${breadcrumbHrefLabel}</a> / <span>${breadcrumbCurrent}</span>`
      : `<a href="/">Trang chủ</a> / ${breadcrumbCurrent}`;

    const bodyMain = `
<main class="container listing-page">
  <nav class="breadcrumb">${breadcrumb}</nav>
  ${banner ? `<div class="listing-banner"><img src="${banner}" alt="Banner danh mục ${title}" loading="eager"></div>` : ""}
  <div class="listing-main">
    <h1 class="listing-title">${title}</h1>
    ${description ? `<div class="listing-description">${description}</div>` : ""}
    <div class="shop-toolbar">
      <p id="result-count">Hiển thị ${from}–${to} của ${products.length} sản phẩm</p>
      <select id="sort-select">
        <option value="default">Sắp xếp mặc định</option>
        <option value="latest">Sắp xếp theo mới nhất</option>
        <option value="price-asc">Sắp xếp theo giá: thấp đến cao</option>
        <option value="price-desc">Sắp xếp theo giá: cao đến thấp</option>
      </select>
    </div>
    <div id="listing-dynamic" data-base="${basePath}" data-page="${currentPage}">
    ${grid}
    <nav class="pagination" id="pagination">${paginationHtml(basePath, totalPages, currentPage)}</nav>
    </div>
  </div>
</main>
<script type="application/json" id="${embedJsonId}">${JSON.stringify(products.map(compactProduct))}</script>`;

    const outPath = currentPage === 1 ? `${basePath}index.html` : `${basePath}page/${currentPage}/index.html`;
    const pageTitle = currentPage === 1 ? `${title} | Dolphin House` : `${title} – Trang ${currentPage} | Dolphin House`;
    const breadcrumbItems = [
      { name: "Trang chủ", url: "/" },
      ...(breadcrumbHref ? [{ name: breadcrumbHrefLabel, url: breadcrumbHref }] : []),
      { name: breadcrumbCurrent, url: outPath.replace(/index\.html$/, "") },
    ];
    write(
      outPath.replace(/^\//, ""),
      page({
        title: pageTitle,
        description: metaDescriptionBase,
        path: outPath.replace(/index\.html$/, ""),
        image: listingImage,
        categories: CATEGORIES,
        activePath,
        bodyMain,
        extraScripts: ["/js/site.js", "/js/listing.js"],
        jsonLd: [breadcrumbLd(breadcrumbItems)],
      })
    );
  }
}

// Trimmed fields the client-side sort re-render actually needs (keeps the
// embedded JSON small instead of shipping full WooCommerce payloads).
function compactProduct(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    img: p.images[0] ? p.images[0].src : "",
    price: p.prices.price,
    regular_price: p.prices.regular_price,
    on_sale: p.on_sale,
  };
}

function buildShop() {
  buildListing({
    basePath: "/cua-hang/",
    title: "Cửa hàng gia dụng thông minh",
    description: "Khám phá đồ gia dụng thông minh, thiết bị bếp, điện gia dụng và tiện ích nhà cửa được Dolphin House chọn lọc cho gia đình hiện đại.",
    activePath: "/cua-hang/",
    products: PRODUCTS,
    breadcrumbCurrent: "Cửa hàng gia dụng thông minh",
    embedJsonId: "listing-data",
  });
}

function buildCategories() {
  for (const cat of CATEGORIES) {
    const products = productsForCategory(cat.slug);
    const meta = CATEGORY_META[cat.slug] || {};
    const parent = cat.parent !== 0 ? CATEGORIES.find((c) => c.id === cat.parent) : null;
    buildListing({
      basePath: categoryUrl(cat, CATEGORIES),
      title: cat.name,
      description: meta.description || null,
      banner: meta.banner || null,
      activePath: "/danh-muc/",
      products,
      breadcrumbCurrent: cat.name,
      breadcrumbHref: parent ? categoryUrl(parent, CATEGORIES) : undefined,
      breadcrumbHrefLabel: parent ? parent.name : undefined,
      embedJsonId: "listing-data",
    });
  }
}

// dolphinhouse.vn's /thuong-hieu/<slug>/ archives have no banner/description
// of their own (verified live) — just a heading + product grid, same as the
// bare category pages, so this reuses buildListing() unchanged. Breadcrumb
// nests under a new /thuong-hieu/ directory page (see buildBrandsIndex) so
// all 54 brand pages are reachable from a real internal link, not just the
// homepage's 10 featured cards + sitemap.xml.
function buildBrands() {
  for (const brand of getBrands()) {
    buildListing({
      basePath: `/thuong-hieu/${brand.slug}/`,
      title: brand.name,
      activePath: "/thuong-hieu/",
      products: productsForBrand(brand.name),
      breadcrumbCurrent: brand.name,
      breadcrumbHref: "/thuong-hieu/",
      breadcrumbHrefLabel: "Thương hiệu",
      embedJsonId: "listing-data",
    });
  }
}

// Directory/hub page listing every brand — without this, 44 of the 54 brand
// pages had zero inbound internal links (only reachable via sitemap.xml).
function buildBrandsIndex() {
  const brands = getBrands();
  const cards = brands
    .map((b) => {
      const count = productsForBrand(b.name).length;
      return `<a class="dh-home-brand-link" href="/thuong-hieu/${b.slug}/"><strong>${b.name}</strong><small>${count} sản phẩm</small></a>`;
    })
    .join("");
  const bodyMain = `
<main class="container listing-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <span>Thương hiệu</span></nav>
  <h1 class="listing-title">Thương hiệu</h1>
  <div class="listing-description"><p>Toàn bộ ${brands.length} thương hiệu chính hãng đang được Dolphin House phân phối, từ đồ bếp châu Âu đến thiết bị gia dụng thông minh.</p></div>
  <div class="dh-home-brands-grid">${cards}</div>
</main>`;
  write(
    "thuong-hieu/index.html",
    page({
      title: "Thương hiệu | Dolphin House",
      description: `Danh sách ${brands.length} thương hiệu chính hãng tại Dolphin House: đồ bếp, điện gia dụng và tiện ích nhà cửa từ các thương hiệu uy tín trong và ngoài nước.`,
      path: "/thuong-hieu/",
      categories: CATEGORIES,
      activePath: "/thuong-hieu/",
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Thương hiệu", url: "/thuong-hieu/" }])],
    })
  );
}

// ---------- Product detail ----------
const TRUST_LIST_ITEMS = [
  { icon: 1, html: "Giao hàng trên toàn quốc" },
  { icon: 2, html: "Đổi trả trong 15 ngày nếu lỗi kỹ thuật" },
  { icon: 3, html: "Thanh toán tại nhà hoặc qua thẻ" },
  { icon: 4, html: "Tổng CSKH 8h30 - 18h00<br><strong>086 639 3892</strong>" },
  { icon: 4, html: "Kinh doanh<br><strong>086 639 3892<br>0378 840 450</strong>" },
  { icon: 4, html: "Kỹ thuật<br><strong>086 639 3892</strong>" },
  { icon: 5, html: "Lắp đặt tại các thành phố lớn" },
];

function trustListHtml() {
  return `
  <aside class="chinh-sach-cua-shop">
    <ul>
      ${TRUST_LIST_ITEMS.map(
        (it) => `<li class="has-icon"><div class="chinhsach-icon"><img src="/assets/images/site/policy-icons/icon-policy-${it.icon}.png" alt="" width="42" height="42"></div><div class="chinhsach-content">${it.html}</div></li>`
      ).join("")}
    </ul>
  </aside>`;
}

function buildProducts() {
  for (const product of PRODUCTS) {
    const cat = product.categories[0];
    const catFull = cat ? CATEGORIES.find((c) => c.slug === cat.slug) : null;
    const catHref = catFull ? categoryUrl(catFull, CATEGORIES) : null;
    const isSale = product.on_sale && product.prices.regular_price !== product.prices.price;
    const priceHtml = isSale
      ? `<span class="price-old">${formatVnd(product.prices.regular_price)}</span> ${formatVnd(product.prices.price)}`
      : formatVnd(product.prices.price);
    const images = product.images.length ? product.images : [{ src: "", alt: product.name }];
    const safeName = product.name.replace(/"/g, "&quot;");

    const related = PRODUCTS.filter(
      (p) => p.slug !== product.slug && p.categories.some((c) => cat && c.slug === cat.slug)
    ).slice(0, 4);
    const fallback = related.length ? related : PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 4);

    const bodyMain = `
<main class="container">
  <nav class="breadcrumb">
    <a href="/">Trang chủ</a>${catHref ? ` / <a href="${catHref}">${cat.name}</a>` : ""} / <span>${product.name}</span>
  </nav>
  <div id="product-root">
    <div class="product-detail">
      <div>
        <div class="gallery-main"><img id="gallery-main-img" src="${images[0].src}" alt="${images[0].alt}"></div>
        <div class="gallery-thumbs" id="gallery-thumbs">
          ${images.map((im, i) => `<img src="${im.thumbnail || im.src}" data-full="${im.src}" alt="${im.alt}" class="${i === 0 ? "active" : ""}">`).join("")}
        </div>
      </div>

      <div class="summary">
        <h1>${product.name}</h1>
        <button class="copy-name-btn" id="copy-name-btn" data-name="${product.name.replace(/"/g, "&quot;")}">Sao chép tên</button>
        <div class="price-block">${priceHtml}</div>
        <div class="short-desc">${product.short_description || ""}</div>
        <div class="qty-row">
          <div class="qty-input">
            <button type="button" id="qty-minus">-</button>
            <input type="text" id="qty-value" value="1">
            <button type="button" id="qty-plus">+</button>
          </div>
          <button class="btn-purple" id="add-to-cart-btn" data-slug="${product.slug}" data-name="${product.name.replace(/"/g, "&quot;")}" data-price="${product.prices.price}" data-image="${images[0].src}">Thêm vào giỏ hàng</button>
          <button type="button" class="btn-gray" id="contact-modal-trigger">Liên hệ</button>
        </div>
        <a class="btn-orange" href="tel:0866393892">
          MUA NGAY
          <small>Gọi điện xác nhận và giao hàng tận nơi</small>
        </a>
        <div class="summary-meta">
          ${product.sku ? `<div>SKU: <strong>${product.sku}</strong></div>` : ""}
          ${catHref ? `<div>Danh mục: <a href="${catHref}">${cat.name}</a></div>` : ""}
          ${product.brand_names.length ? `<div>Thương hiệu: ${product.brand_names.map((b) => `<a href="${brandUrl(b)}">${b}</a>`).join(", ")}</div>` : ""}
        </div>
        <button class="chat-fb-btn" type="button">💬 Chat Facebook tư vấn — phản hồi nhanh</button>
      </div>

      ${trustListHtml()}
    </div>

    <section class="description-section">
      <span class="description-tab-head">MÔ TẢ SẢN PHẨM</span>
      <div class="description-body" id="description-body">
        ${product.description || "<p>Đang cập nhật mô tả sản phẩm.</p>"}
        <div class="description-fade"></div>
      </div>
      <button class="expand-toggle" id="expand-toggle">Xem thêm ▼</button>
    </section>

    <section class="section related-section">
      <h2>Sản phẩm tương tự</h2>
      <div class="product-grid" id="related-grid">${fallback.map(productCardHtml).join("")}</div>
    </section>
  </div>

  <div class="dh-modal-overlay" id="contact-modal-overlay" hidden>
    <div class="dh-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title">
      <button type="button" class="dh-modal-close" id="contact-modal-close" aria-label="Đóng">✕</button>
      <h2 id="contact-modal-title" class="dh-modal-title">Liên hệ mua hàng</h2>
      <p class="dh-modal-hotline">Hotline: <strong>086 6393 892</strong></p>

      <div class="dh-modal-product">
        <img src="${images[0].src}" alt="${safeName}">
        <div class="dh-modal-product-body">
          <strong>${product.name}</strong>
          <span>${formatVnd(product.prices.price)}</span>
        </div>
      </div>

      <!-- Gửi thông tin: chưa nối backend thật (làm sau) — hiện chỉ demo ở UI. -->
      <form id="contact-modal-form">
        <input type="hidden" name="product_slug" value="${product.slug}">
        <input type="hidden" name="product_name" value="${safeName}">
        <div class="form-row form-row--split">
          <div><input type="text" name="name" placeholder="Họ và tên" required></div>
          <div><input type="tel" name="phone" placeholder="Số điện thoại" required></div>
        </div>
        <div class="form-row"><input type="email" name="email" placeholder="Email"></div>
        <div class="form-row"><textarea name="message" rows="4" placeholder="Tin nhắn"></textarea></div>
        <button type="submit" class="btn-purple dh-modal-submit">Gửi thông tin</button>
      </form>
    </div>
  </div>
</main>`;

    const path = `/san-pham/${product.slug}/`;
    const metaDescription = truncate(
      stripHtml(product.short_description) || stripHtml(product.description) || `${product.name} chính hãng tại Dolphin House.`,
      160
    );
    const breadcrumbItems = [
      { name: "Trang chủ", url: "/" },
      ...(catHref ? [{ name: cat.name, url: catHref }] : []),
      { name: product.name, url: path },
    ];
    const productLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: images.filter((im) => im.src).map((im) => absUrl(im.src)),
      description: metaDescription,
      sku: product.sku || undefined,
      brand: product.brand_names.length ? { "@type": "Brand", name: product.brand_names[0] } : undefined,
      offers: {
        "@type": "Offer",
        url: absUrl(path),
        priceCurrency: "VND",
        price: product.prices.price,
        availability: "https://schema.org/InStock",
      },
    };

    write(
      `san-pham/${product.slug}/index.html`,
      page({
        title: `${product.name} | Dolphin House`,
        description: metaDescription,
        path,
        image: images[0] && images[0].src,
        type: "product",
        categories: CATEGORIES,
        bodyMain,
        extraScripts: ["/js/site.js", "/js/product-interactive.js"],
        jsonLd: [productLd, breadcrumbLd(breadcrumbItems)],
      })
    );
  }
}

// Cart contents are client-only (localStorage, no real backend) — this page
// is just a shell; js/site.js fills #cart-page-root in from the cart data
// the same way the header dropdown does.
function buildCartPage() {
  const bodyMain = `
<main class="container listing-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <span>Giỏ hàng</span></nav>
  <h1 class="listing-title">Giỏ hàng của bạn</h1>
  <div id="cart-page-root">
    <div id="cart-page-items" class="cart-page-items"></div>
    <div id="cart-page-empty" class="cart-page-empty">
      <p>Giỏ hàng của bạn đang trống.</p>
      <a class="link-arrow" href="/cua-hang/">Xem cửa hàng →</a>
    </div>
    <div id="cart-page-summary" class="cart-page-summary">
      <div class="cart-page-total">Tổng cộng: <strong id="cart-page-total-amount">0 ₫</strong></div>
      <a href="/thanh-toan/" class="btn-purple checkout-place-order">Tiến hành thanh toán</a>
    </div>
  </div>
</main>`;
  write(
    "gio-hang/index.html",
    page({
      title: "Giỏ hàng của bạn | Dolphin House",
      description: "Xem lại sản phẩm trong giỏ hàng và tiến hành đặt mua tại Dolphin House.",
      path: "/gio-hang/",
      categories: CATEGORIES,
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Giỏ hàng", url: "/gio-hang/" }])],
    })
  );
}

// Deterministic mock QR code (no real payload, no external QR-gen API/image —
// just a seeded checkerboard with the 3 classic QR finder squares so it
// *reads* as a QR code visually). "seed" keeps it stable across rebuilds.
function mockQrSvg(seed) {
  const n = 17;
  const cell = 8;
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const isFinder = (x, y) => {
    const corners = [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ];
    return corners.some(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7);
  };
  const finderCell = (x, y, cx, cy) => {
    const lx = x - cx;
    const ly = y - cy;
    if (lx === 0 || lx === 6 || ly === 0 || ly === 6) return true;
    if (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4) return true;
    return false;
  };
  let rects = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let on;
      const corners = [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ];
      const inFinder = corners.find(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7);
      if (inFinder) on = finderCell(x, y, inFinder[0], inFinder[1]);
      else on = rand() > 0.55;
      if (on) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
    }
  }
  const size = n * cell;
  return `<svg viewBox="0 0 ${size} ${size}" width="128" height="128" role="img" aria-label="Mã QR chuyển khoản minh hoạ"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#173e40">${rects}</g></svg>`;
}

// /thanh-toan/ — content cloned from the live WooCommerce checkout
// (dolphinhouse.vn/thanh-toan/): coupon toggle, billing form with tỉnh/phường
// cascading select (js/vn-address.js + assets/area/), order summary + payment
// method, "Đặt hàng". The "Giao hàng đến một địa chỉ khác?" toggle from the
// original is intentionally omitted. The bank-transfer description was
// replaced (per request) with mock account-holder info + a simulated QR
// (no real bank/payment integration — this is a static demo). Header/footer
// are unchanged (page()).
function buildCheckoutPage() {
  const bodyMain = `
<main class="container listing-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <span>Thanh toán</span></nav>
  <h1 class="listing-title">Thanh toán</h1>

  <div id="checkout-success" class="checkout-success" hidden>
    <p class="checkout-success-title">✓ Đặt hàng thành công!</p>
    <p>Cảm ơn bạn đã đặt hàng tại Dolphin House. Chúng tôi sẽ gọi điện xác nhận đơn hàng trong thời gian sớm nhất.</p>
    <a class="link-arrow" href="/cua-hang/">Tiếp tục mua sắm →</a>
  </div>

  <div class="checkout-coupon">
    <a href="#" id="coupon-toggle-link">Bạn có mã ưu đãi? <span>Ấn vào đây để nhập mã</span></a>
    <div id="coupon-form" class="checkout-coupon-form" hidden>
      <input type="text" placeholder="Mã ưu đãi">
      <button type="button" class="btn-outline">Áp dụng</button>
    </div>
  </div>

  <form id="checkout-form" class="checkout-grid">
    <div id="checkout-form-section" class="checkout-billing">
      <h3>Thông tin thanh toán</h3>
      <div class="form-row">
        <label>Họ và tên <span class="required">*</span></label>
        <input type="text" required>
      </div>
      <div class="form-row form-row--split">
        <div>
          <label>Số điện thoại <span class="required">*</span></label>
          <input type="tel" required>
        </div>
        <div>
          <label>Địa chỉ email <span class="required">*</span></label>
          <input type="email" required>
        </div>
      </div>
      <div class="form-row form-row--split">
        <div>
          <label>Tỉnh/Thành phố <span class="required">*</span></label>
          <select id="billing-province" required></select>
        </div>
        <div>
          <label>Phường/Xã <span class="required">*</span></label>
          <select id="billing-ward" required disabled></select>
        </div>
      </div>
      <div class="form-row">
        <label>Địa chỉ <span class="required">*</span></label>
        <input type="text" required>
      </div>
      <div class="form-row">
        <label>Ghi chú đơn hàng (tuỳ chọn)</label>
        <textarea rows="4" placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."></textarea>
      </div>
    </div>

    <div id="checkout-order-section" class="checkout-order">
      <h3>Đơn hàng của bạn</h3>
      <table class="checkout-order-table">
        <thead><tr><th>Sản phẩm</th><th>Tạm tính</th></tr></thead>
        <tbody id="checkout-order-items"></tbody>
        <tfoot>
          <tr><th>Tạm tính</th><td id="checkout-order-subtotal">0 ₫</td></tr>
          <tr><th>Vận chuyển</th><td>Miễn phí giao hàng</td></tr>
          <tr class="checkout-order-total-row"><th>Tổng</th><td id="checkout-order-total">0 ₫</td></tr>
        </tfoot>
      </table>

      <div class="checkout-payment">
        <label class="checkout-payment-option">
          <input type="radio" name="payment_method" value="bank" checked>
          <span>Chuyển khoản ngân hàng</span>
        </label>
        <div class="checkout-payment-desc checkout-bank">
          <div class="checkout-bank-info">
            <div><span>Ngân hàng</span><strong>Vietcombank – CN Hà Nội</strong></div>
            <div><span>Chủ tài khoản</span><strong>CONG TY TNHH DOLPHIN HOUSE</strong></div>
            <div><span>Số tài khoản</span><strong>0866 393 892</strong></div>
            <div><span>Nội dung CK</span><strong>Thanh toan don hang Dolphin House</strong></div>
            <p class="checkout-bank-note">Vui lòng chuyển đúng số tiền và ghi rõ nội dung để đơn hàng được xác nhận nhanh nhất. Đơn hàng sẽ được giao sau khi tiền đã chuyển.</p>
          </div>
          <div class="checkout-bank-qr">
            ${mockQrSvg(866393892)}
            <small>Mã QR minh hoạ</small>
          </div>
        </div>
        <label class="checkout-payment-option">
          <input type="radio" name="payment_method" value="cod">
          <span>Trả tiền mặt khi nhận hàng</span>
        </label>
      </div>

      <button type="submit" id="place-order-btn" class="btn-purple checkout-place-order">Đặt hàng</button>
    </div>
  </form>
</main>`;
  write(
    "thanh-toan/index.html",
    page({
      title: "Thanh toán | Dolphin House",
      description: "Hoàn tất thông tin giao hàng và đặt mua sản phẩm tại Dolphin House.",
      path: "/thanh-toan/",
      categories: CATEGORIES,
      bodyMain,
      extraScripts: ["/js/site.js", "/js/vn-address.js", "/js/checkout.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Thanh toán", url: "/thanh-toan/" }])],
    })
  );
}

function clean() {
  for (const d of [...OUT_DIRS, ...BLOG_POSTS.map((p) => p.slug)]) {
    const full = join(ROOT, d);
    if (existsSync(full)) rmSync(full, { recursive: true, force: true });
  }
}

// robots.txt + sitemap.xml, generated from every route actually written this
// build (see `write()`) — pagination pages beyond page 1 are excluded (Google
// treats them as fine to crawl via in-page links; keeping them out of the
// sitemap avoids diluting it with near-duplicate listing pages).
function buildRobotsAndSitemap() {
  const urls = generatedPaths
    .filter((p) => !p.includes("/page/"))
    .sort()
    .map((p) => `  <url><loc>${absUrl(p)}</loc></url>`)
    .join("\n");
  writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
}

// Static hosts (Cloudflare Pages/Netlify/Vercel) serve this file automatically
// for any unmatched route. Not part of generatedPaths/sitemap.xml — it's a
// fallback, not an indexable canonical page.
function build404() {
  const bodyMain = `
<main class="container blog-page">
  <div class="page-article" style="text-align:center;padding:60px 0;">
    <h1 class="page-title">404 — Không tìm thấy trang</h1>
    <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển.</p>
    <p><a class="link-arrow" href="/">Về trang chủ →</a> &nbsp; <a class="link-arrow" href="/cua-hang/">Xem cửa hàng →</a></p>
  </div>
</main>`;
  writeFileSync(
    join(ROOT, "404.html"),
    page({
      title: "Không tìm thấy trang | Dolphin House",
      description: "Trang bạn tìm không tồn tại hoặc đã được di chuyển. Quay lại trang chủ Dolphin House để tiếp tục mua sắm.",
      categories: CATEGORIES,
      bodyMain,
      extraScripts: ["/js/site.js"],
    })
  );
}

clean();
buildHome();
buildShop();
buildCategories();
buildBrandsIndex();
buildBrands();
buildProducts();
buildBlogListing(write, CATEGORIES);
buildBlogPosts(write, CATEGORIES);
buildBlogTaxonomies(write, CATEGORIES);
buildGioiThieu(write, CATEGORIES);
buildLienHe(write, CATEGORIES);
buildVideos(write, CATEGORIES);

// FAQ per policy/help page — grounded in that page's own body content (see
// scripts/data/*.body.html), not invented, so the FAQPage JSON-LD stays accurate.
const POLICY_FAQ = {
  hoTroKhachHang: [
    {
      question: "Dolphin House hỗ trợ khách hàng vào những thời điểm nào?",
      answer: "Dolphin House hỗ trợ khách hàng cả trước và sau khi mua: tư vấn chọn sản phẩm phù hợp nhu cầu, hỗ trợ trong quá trình đặt hàng, và đồng hành sau khi nhận hàng.",
    },
    {
      question: "Tôi có thể nhờ tư vấn chọn sản phẩm phù hợp không?",
      answer: "Có. Bạn gửi nhu cầu sử dụng, diện tích không gian, ngân sách dự kiến hoặc sản phẩm đang phân vân, đội ngũ Dolphin House sẽ gợi ý phương án phù hợp thay vì chỉ đẩy sản phẩm có sẵn.",
    },
    {
      question: "Sau khi mua hàng, Dolphin House hỗ trợ những gì?",
      answer: "Xác nhận tình trạng hàng trước khi giao, hướng dẫn thanh toán - giao nhận - kiểm tra hàng, hỗ trợ đổi trả theo chính sách từng sản phẩm, và hỗ trợ thông tin bảo hành, phụ kiện, cách sử dụng.",
    },
  ],
  hinhThucThanhToan: [
    {
      question: "Dolphin House hỗ trợ những hình thức thanh toán nào?",
      answer: "Thanh toán khi nhận hàng (COD) nếu sản phẩm và khu vực giao hàng hỗ trợ, chuyển khoản ngân hàng theo thông tin được Dolphin House xác nhận, hoặc thanh toán trực tuyến qua các cổng thanh toán khả dụng trên website.",
    },
    {
      question: "Có hỗ trợ thanh toán khi nhận hàng (COD) không?",
      answer: "Có, với những sản phẩm và khu vực giao hàng hỗ trợ hình thức này.",
    },
    {
      question: "Đơn hàng giá trị cao cần lưu ý gì khi thanh toán?",
      answer: "Khách hàng nên liên hệ trước để được xác nhận tồn kho, chính sách vận chuyển và điều kiện bảo hành trước khi thanh toán.",
    },
  ],
  hinhThucVanChuyen: [
    {
      question: "Dolphin House có giao hàng toàn quốc không?",
      answer: "Có, Dolphin House hỗ trợ giao hàng toàn quốc. Thời gian và phí vận chuyển phụ thuộc kích thước sản phẩm, địa chỉ nhận hàng và đối tác vận chuyển tại từng thời điểm.",
    },
    {
      question: "Quy trình giao nhận hàng diễn ra như thế nào?",
      answer: "Xác nhận đơn hàng và thông tin nhận hàng trước khi gửi, đóng gói phù hợp với từng nhóm sản phẩm (đặc biệt đồ điện và hàng dễ trầy xước), gửi mã vận đơn khi bàn giao cho đơn vị vận chuyển, và khuyến khích khách kiểm tra ngoại quan khi nhận hàng.",
    },
    {
      question: "Sản phẩm cồng kềnh hoặc giá trị cao được vận chuyển ra sao?",
      answer: "Dolphin House sẽ tư vấn phương án giao phù hợp để hạn chế rủi ro trong quá trình vận chuyển.",
    },
  ],
  heThongDaiLy: [
    {
      question: "Dolphin House hợp tác với những nhóm đối tác nào?",
      answer: "Showroom nội thất/thiết bị bếp/đồ gia dụng, đơn vị thiết kế thi công căn hộ - homestay - nhà phố, tư vấn viên sản phẩm gia dụng cao cấp, và doanh nghiệp cần quà tặng tiện ích cho khách hàng, nhân viên, đối tác.",
    },
    {
      question: "Làm sao để đăng ký hợp tác làm đại lý với Dolphin House?",
      answer: 'Gửi thông tin qua trang <a href="/lien-he/">Liên hệ</a> để Dolphin House trao đổi chính sách hợp tác phù hợp.',
    },
    {
      question: "Thông tin liên hệ hợp tác đại lý của Dolphin House là gì?",
      answer: "Địa chỉ S219 Đại Dương 8, Vinhomes Ocean Park, Gia Lâm, Hà Nội; hotline 086 639 3892; email dolphinhouse.vn@gmail.com.",
    },
  ],
  camKetChatLuong: [
    {
      question: "Sản phẩm tại Dolphin House có phải hàng chính hãng không?",
      answer: "Có. Mọi sản phẩm đều là hàng chính hãng, có nguồn gốc rõ ràng từ nhà phân phối hoặc nhập khẩu trực tiếp — không kinh doanh hàng trôi nổi, hàng nhái.",
    },
    {
      question: "Dolphin House cam kết những gì về chất lượng sản phẩm?",
      answer: "100% sản phẩm chính hãng, đầy đủ tem nhãn và giấy tờ liên quan (nếu có); kiểm tra kỹ tình trạng sản phẩm trước khi giao; tư vấn đúng nhu cầu sử dụng; và hỗ trợ đổi trả nếu sản phẩm lỗi kỹ thuật từ nhà sản xuất.",
    },
    {
      question: "Nếu phát hiện sản phẩm không đúng cam kết thì làm sao?",
      answer: 'Liên hệ ngay hotline <strong>086 639 3892</strong> hoặc email <strong>dolphinhouse.vn@gmail.com</strong> kèm hình ảnh/video thực tế để được hỗ trợ nhanh nhất.',
    },
  ],
  chinhSachBaoHanhDoiTra: [
    {
      question: "Thời gian đổi trả sản phẩm tại Dolphin House là bao lâu?",
      answer: "Trong vòng 15 ngày nếu sản phẩm lỗi kỹ thuật do nhà sản xuất, với điều kiện sản phẩm còn nguyên tem nhãn, phụ kiện đi kèm, chưa qua sử dụng làm hư hỏng, và có hoá đơn hoặc xác nhận đơn hàng từ Dolphin House.",
    },
    {
      question: "Trường hợp nào không được áp dụng đổi trả?",
      answer: "Sản phẩm hư hỏng do lỗi sử dụng sai hướng dẫn của khách hàng, hoặc sản phẩm đã hết thời hạn đổi trả theo chính sách.",
    },
    {
      question: "Sản phẩm được bảo hành trong bao lâu?",
      answer: "Thời gian và điều kiện bảo hành áp dụng theo chính sách riêng của từng hãng, thường 12–24 tháng tuỳ sản phẩm, được tư vấn cụ thể khi đặt hàng hoặc ghi trên phiếu/tem bảo hành đi kèm.",
    },
    {
      question: "Cần làm gì để yêu cầu bảo hành hoặc đổi trả?",
      answer: "Liên hệ hotline 086 639 3892 hoặc email dolphinhouse.vn@gmail.com, cung cấp mã đơn hàng và mô tả tình trạng sản phẩm để được hướng dẫn gửi trả hoặc lịch hẹn kiểm tra.",
    },
  ],
  chinhSachBaoMat: [
    {
      question: "Dolphin House thu thập những thông tin gì của khách hàng?",
      answer: "Họ tên, số điện thoại, địa chỉ giao hàng và email — chỉ thu thập khi khách hàng chủ động cung cấp qua form liên hệ, đặt hàng hoặc tổng đài tư vấn.",
    },
    {
      question: "Thông tin khách hàng được sử dụng vào mục đích gì?",
      answer: "Xác nhận và giao đơn hàng đúng địa chỉ, tư vấn sản phẩm phù hợp nhu cầu, hỗ trợ đổi trả/bảo hành khi cần, và thông báo chương trình ưu đãi nếu khách hàng đồng ý nhận.",
    },
    {
      question: "Thông tin của tôi có được chia sẻ cho bên thứ ba không?",
      answer: "Không, ngoại trừ mục đích vận chuyển đơn hàng. Dolphin House áp dụng các biện pháp hợp lý để ngăn chặn truy cập trái phép, mất mát hoặc rò rỉ thông tin.",
    },
    {
      question: "Tôi có thể yêu cầu chỉnh sửa hoặc xoá thông tin cá nhân không?",
      answer: "Có. Liên hệ hotline 086 639 3892 hoặc email dolphinhouse.vn@gmail.com để yêu cầu chỉnh sửa hoặc xoá thông tin cá nhân đã cung cấp.",
    },
  ],
  dieuKhoanSuDung: [
    {
      question: "Nội dung trên website Dolphin House có được sao chép lại không?",
      answer: "Không. Toàn bộ hình ảnh, mô tả sản phẩm, bài viết và thương hiệu hiển thị trên website thuộc quyền sở hữu của Dolphin House hoặc được cấp phép sử dụng hợp pháp, không được sao chép, phân phối lại khi chưa được đồng ý.",
    },
    {
      question: "Giá sản phẩm hiển thị trên website có phải là giá cuối cùng không?",
      answer: "Giá có thể thay đổi theo chương trình khuyến mãi hoặc biến động thị trường mà không cần báo trước; giá áp dụng cuối cùng là giá được xác nhận khi đặt hàng.",
    },
    {
      question: "Điều khoản sử dụng của Dolphin House có thể thay đổi không?",
      answer: "Có. Dolphin House có thể cập nhật điều khoản sử dụng theo thời gian, phiên bản mới nhất luôn được đăng tải công khai trên website.",
    },
  ],
};

buildSimplePage(write, CATEGORIES, {
  slug: "ho-tro-khach-hang",
  title: "Hỗ trợ khách hàng | Dolphin House",
  bodyFile: "ho-tro-khach-hang.body.html",
  faq: POLICY_FAQ.hoTroKhachHang,
});
buildSimplePage(write, CATEGORIES, {
  slug: "hinh-thuc-thanh-toan",
  title: "Hình thức thanh toán | Dolphin House",
  bodyFile: "hinh-thuc-thanh-toan.body.html",
  faq: POLICY_FAQ.hinhThucThanhToan,
});
buildSimplePage(write, CATEGORIES, {
  slug: "hinh-thuc-van-chuyen",
  title: "Chính sách vận chuyển | Dolphin House",
  bodyFile: "hinh-thuc-van-chuyen.body.html",
  faq: POLICY_FAQ.hinhThucVanChuyen,
});
buildSimplePage(write, CATEGORIES, {
  slug: "he-thong-dai-ly",
  title: "Hệ thống đại lý | Dolphin House",
  bodyFile: "he-thong-dai-ly.body.html",
  faq: POLICY_FAQ.heThongDaiLy,
});
buildSimplePage(write, CATEGORIES, {
  slug: "cam-ket-chat-luong",
  title: "Cam kết chất lượng sản phẩm | Dolphin House",
  bodyFile: "cam-ket-chat-luong.body.html",
  faq: POLICY_FAQ.camKetChatLuong,
});
buildSimplePage(write, CATEGORIES, {
  slug: "chinh-sach-bao-hanh-doi-tra",
  title: "Chính sách bảo hành & đổi trả | Dolphin House",
  bodyFile: "chinh-sach-bao-hanh-doi-tra.body.html",
  faq: POLICY_FAQ.chinhSachBaoHanhDoiTra,
});
buildSimplePage(write, CATEGORIES, {
  slug: "chinh-sach-bao-mat",
  title: "Chính sách bảo mật | Dolphin House",
  bodyFile: "chinh-sach-bao-mat.body.html",
  faq: POLICY_FAQ.chinhSachBaoMat,
});
buildSimplePage(write, CATEGORIES, {
  slug: "dieu-khoan-su-dung",
  title: "Điều khoản sử dụng | Dolphin House",
  bodyFile: "dieu-khoan-su-dung.body.html",
  faq: POLICY_FAQ.dieuKhoanSuDung,
});
buildCartPage();
buildCheckoutPage();
buildRobotsAndSitemap();
build404();

const BRAND_COUNT = getBrands().length;
console.log(
  `Built: 1 home + shop (+pagination) + ${CATEGORIES.length} categories (+pagination) + 1 brand-index + ${BRAND_COUNT} brands (+pagination) + ${PRODUCTS.length} products + tin-tuc (+${BLOG_POSTS.length} posts + 4 danh-muc-tin-tuc + 3 tag) + gioi-thieu + lien-he + videos (+2) + 8 policy pages + sitemap.xml + robots.txt + 404.html`
);
console.log(`Sitemap: ${generatedPaths.filter((p) => !p.includes("/page/")).length} URLs`);
