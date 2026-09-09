// Shared HTML partials: header/footer/nav (previously built at runtime by js/common.js
// renderHeader()/renderFooter()) and the product-card markup, now emitted at build time.
import { CATEGORY_ICONS, hexToRgba } from "./mega-menu-icons.mjs";

// Real production domain (confirmed by the site owner) — used to emit
// absolute canonical/OG URLs and the sitemap.xml, since this static build
// replaces the live dolphinhouse.vn WordPress site on the same domain.
export const SITE_URL = "https://dolphinhouse.vn";
const DEFAULT_DESCRIPTION =
  "Dolphin House – gia dụng thông minh, thiết bị bếp và tiện ích cao cấp cho gia đình hiện đại. Giao hàng toàn quốc, tư vấn tận tâm.";
const DEFAULT_OG_IMAGE = "/assets/images/site/dolphin-house-logo-320x100-1.webp";

export function absUrl(path) {
  if (!path) return `${SITE_URL}/`;
  return path.startsWith("http") ? path : SITE_URL + path;
}

export function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(str, max = 160) {
  if (!str) return "";
  if (str.length <= max) return str;
  const cut = str.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut) + "…";
}

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

export function jsonLdScripts(items) {
  return (items || [])
    .filter(Boolean)
    .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
    .join("\n");
}

// items: [{name, url}] in breadcrumb order (url relative or absolute).
export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.url),
    })),
  };
}

// items: [{question, answer}] — answer may contain simple HTML (kept as plain
// text for the JSON-LD acceptedAnswer per schema.org convention).
export function faqLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: stripHtml(it.answer) },
    })),
  };
}

// Renders an accordion-style FAQ section (question rows, answers hidden until
// expanded via .faq-item[open] in js/site.js) — used on both the homepage and
// /gioi-thieu/ for SEO (paired with faqLd for the FAQPage JSON-LD).
export function faqSectionHtml(items, { heading = "Câu hỏi thường gặp" } = {}) {
  const rows = items
    .map(
      (it, i) => `
      <div class="faq-item" id="faq-${i + 1}">
        <button type="button" class="faq-question" aria-expanded="false">
          <span>${it.question}</span>
          <svg class="faq-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="faq-answer"><div class="faq-answer-inner">${it.answer}</div></div>
      </div>`
    )
    .join("");
  return `
  <section class="faq-section">
    <h2 class="faq-heading">${heading}</h2>
    <div class="faq-list">${rows}</div>
  </section>`;
}

export function formatVnd(n) {
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

// Mirrors the WooCommerce/Yoast product_brand term slug (accent-stripped,
// lowercased, non-alnum runs collapsed to a single dash) so derived brand
// slugs match dolphinhouse.vn's real /thuong-hieu/<slug>/ URLs exactly.
export function brandSlug(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function brandUrl(name) {
  return `/thuong-hieu/${brandSlug(name)}/`;
}

// `match` is the path prefix that marks this item active (see renderHeader).
// Grouped: shopping (Cửa hàng/Thương hiệu — "Danh mục sản phẩm" dropped, it
// duplicated Cửa hàng's own URL) → company (Giới thiệu) → content (Tin Tức) →
// company (Liên hệ) → media (Videos) last.
const NAV_LINKS = [
  { label: "Trang chủ", href: "/", match: "/", exact: true },
  { label: "Cửa hàng", href: "/cua-hang/", match: "/cua-hang/" },
  { label: "Thương hiệu", href: "/thuong-hieu/", match: "/thuong-hieu/" },
  { label: "Giới thiệu", href: "/gioi-thieu/", match: "/gioi-thieu/" },
  { label: "Tin Tức", href: "/tin-tuc/", match: "/tin-tuc/" },
  { label: "Liên hệ", href: "/lien-he/", match: "/lien-he/" },
  { label: "Videos", href: "/videos/", match: "/videos/" },
];

export function categoryTree(categories) {
  const roots = categories.filter((c) => c.parent === 0);
  return roots.map((r) => ({
    ...r,
    children: categories.filter((c) => c.parent === r.id),
  }));
}

// Subcategories live nested under their parent's slug on the real site
// (e.g. /danh-muc/do-dung-nha-bep/xong-noi/), top-level categories don't.
export function categoryUrl(cat, categories) {
  if (cat.parent === 0) return `/danh-muc/${cat.slug}/`;
  const parent = categories.find((c) => c.id === cat.parent);
  return `/danh-muc/${parent.slug}/${cat.slug}/`;
}

function megaMenuIcon(slug) {
  const ic = CATEGORY_ICONS[slug] || CATEGORY_ICONS["tat-ca"];
  return `<span class="dh-cat-ic" style="background:${hexToRgba(ic.color, 0.12)};color:${ic.color}">${ic.svg}</span>`;
}

// `activePath` is the current page's pathname, used to highlight the matching
// nav item (mirrors the old client-side `location.pathname` match, now
// resolved at build time) and to render the mega menu's flyout submenus.
export function renderHeader(categories, activePath = "") {
  const tree = categoryTree(categories);

  const megaMenuHtml = tree
    .map((c) => {
      const hasChildren = c.children.length > 0;
      const sub = hasChildren
        ? `<ul class="dh-cat-sub">${c.children
            .map((s) => `<li><a href="${categoryUrl(s, categories)}"><span class="dh-cat-name">${s.name}</span></a></li>`)
            .join("")}</ul>`
        : "";
      return `
      <li class="dh-cat-item${hasChildren ? " has-children" : ""}">
        <a href="${categoryUrl(c, categories)}">${megaMenuIcon(c.slug)}<span class="dh-cat-name">${c.name}</span>${hasChildren ? '<span class="dh-cat-arrow">›</span>' : ""}</a>
        ${sub}
      </li>`;
    })
    .join("");

  const navHtml = NAV_LINKS.map((l) => {
    const active = l.exact ? activePath === l.match : activePath.startsWith(l.match);
    return `<li><a href="${l.href}"${active ? ' class="active"' : ""}>${l.label}</a></li>`;
  }).join("");

  return `
    <div class="topbar">
      <div class="container">
        <div class="topbar-left">Chào mừng bạn đến với Dolphin House</div>
        <div class="topbar-center"><span class="topbar-hotline">☎ HOTLINE 086 6393 892</span></div>
        <div class="topbar-right">Thứ 2-CN : 8h-17h30</div>
      </div>
    </div>
    <header class="site-header">
      <div class="container">
        <a class="logo" href="/"><img src="/assets/images/site/dolphin-house-logo-320x100-1.webp" alt="Dolphin House"></a>
        <form class="search-form" action="/cua-hang/" method="get">
          <input type="search" name="q" id="search-input" placeholder="Tìm kiếm sản phẩm">
          <button type="submit">Tìm kiếm</button>
        </form>
        <div class="cart-link">
          <a class="cart-link-trigger" href="/gio-hang/">
            <span class="cart-icon">\u{1F6D2}<span class="cart-badge">0</span></span>
            <span class="cart-text"><strong>Giỏ hàng của bạn</strong><span>Chưa có sản phẩm</span></span>
          </a>
          <div class="cart-dropdown is-empty" id="cart-dropdown">
            <div class="cart-dropdown-items" id="cart-dropdown-items"></div>
            <div class="cart-dropdown-empty" id="cart-dropdown-empty">Giỏ hàng của bạn đang trống.</div>
            <div class="cart-dropdown-footer" id="cart-dropdown-footer">
              <div class="cart-dropdown-subtotal">Tổng số phụ: <strong id="cart-dropdown-total">0 ₫</strong></div>
              <div class="cart-dropdown-actions">
                <a href="/gio-hang/" class="cart-dropdown-btn cart-dropdown-btn--view">Xem giỏ hàng</a>
                <a href="/thanh-toan/" class="cart-dropdown-btn cart-dropdown-btn--checkout">Thanh toán</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <nav class="main-nav">
      <div class="container">
        <div class="danhmuc-menu" id="danhmuc-menu">
          <div class="cat-toggle" id="cat-toggle-btn" role="button" aria-label="Mở hoặc đóng danh mục sản phẩm">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            <span>Danh mục sản phẩm</span>
          </div>
          <div class="cat-drawer" id="cat-drawer">
            <ul class="dh-cat-list">
              ${megaMenuHtml}
              <li class="dh-cat-item">
                <a href="/cua-hang/">${megaMenuIcon("tat-ca")}<span class="dh-cat-name">Tất cả sản phẩm</span></a>
              </li>
            </ul>
          </div>
        </div>
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line class="mmb-line mmb-line-1" x1="3" y1="6" x2="21" y2="6"></line>
            <line class="mmb-line mmb-line-2" x1="3" y1="12" x2="21" y2="12"></line>
            <line class="mmb-line mmb-line-3" x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <ul class="nav-links" id="nav-links">${navHtml}</ul>
      </div>
    </nav>
  `;
}

export function renderFooter() {
  return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h5>Thông tin liên hệ</h5>
            <p>Địa chỉ: S219 Đại Dương 8, Vinhomes Ocean Park, Gia Lâm, Hà Nội<br>
            Hotline: 086 639 3892<br>
            Email: dolphinhouse.vn@gmail.com<br>
            Tư vấn: Đồ gia dụng thông minh, điện gia dụng và tiện ích cao cấp cho gia đình hiện đại</p>
            <div class="footer-social">
              <a href="#" aria-label="Facebook">f</a>
              <a href="#" aria-label="YouTube">▶</a>
            </div>
          </div>
          <div>
            <h5>Về Dolphin House</h5>
            <ul>
              <li><a href="/cua-hang/">Cửa hàng</a></li>
              <li><a href="/thuong-hieu/">Thương hiệu</a></li>
              <li><a href="/gioi-thieu/">Giới thiệu</a></li>
              <li><a href="/tin-tuc/">Tin tức</a></li>
              <li><a href="/he-thong-dai-ly/">Hệ thống đại lý</a></li>
              <li><a href="/lien-he/">Liên hệ</a></li>
            </ul>
          </div>
          <div>
            <h5>Chính sách</h5>
            <ul>
              <li><a href="/ho-tro-khach-hang/">Hỗ trợ khách hàng</a></li>
              <li><a href="/hinh-thuc-thanh-toan/">Hình thức thanh toán</a></li>
              <li><a href="/hinh-thuc-van-chuyen/">Chính sách vận chuyển</a></li>
              <li><a href="/chinh-sach-bao-hanh-doi-tra/">Bảo hành &amp; đổi trả</a></li>
              <li><a href="/cam-ket-chat-luong/">Cam kết chất lượng</a></li>
              <li><a href="/chinh-sach-bao-mat/">Chính sách bảo mật</a></li>
              <li><a href="/dieu-khoan-su-dung/">Điều khoản sử dụng</a></li>
            </ul>
          </div>
          <div class="footer-map">
            <h5>Bản đồ</h5>
            <img src="/assets/images/site/maps.png" alt="Bản đồ Dolphin House">
            <button type="button">Xem bản đồ</button>
          </div>
        </div>
      </div>
      <div class="footer-bottom">Copyright © 2026 dolphinhouse.vn - All Rights Reserved.</div>
    </footer>
    <div class="fab-stack">
      <button class="back-to-top fab-btn" id="back-to-top" aria-label="Lên đầu trang">
        <span class="fab-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg></span>
      </button>
      <a class="fab-btn fab-phone" href="tel:0866393892" aria-label="Gọi ngay 0866 393 892">
        <span class="fab-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </span>
        <span class="fab-label">Gọi ngay<br><strong>0866 393 892</strong></span>
      </a>
      <a class="fab-btn fab-zalo" href="https://zalo.me/0866393892" target="_blank" rel="noopener" aria-label="Chat Zalo 0866 393 892">
        <span class="fab-icon"><img src="/assets/images/site/icon-zalo.png" alt="Zalo" width="36" height="36"></span>
        <span class="fab-label">Chat Zalo<br><strong>0866 393 892</strong></span>
      </a>
    </div>
  `;
}

export function productCardHtml(p) {
  const price = p.prices;
  const isSale = p.on_sale && price.regular_price !== price.price;
  const img = p.images[0] ? p.images[0].src : "";
  const safeName = p.name.replace(/"/g, "&quot;");
  const priceHtml = isSale
    ? `<span class="price-old">${formatVnd(price.regular_price)}</span><span class="price-current sale">${formatVnd(price.price)}</span>`
    : `<span class="price-current">${formatVnd(price.price)}</span>`;
  return `
    <div class="product-card">
      ${isSale ? '<span class="onsale">Giảm giá!</span>' : ""}
      <a class="thumb" href="/san-pham/${p.slug}/"><img src="${img}" alt="${p.name}" loading="lazy"></a>
      <h3><a href="/san-pham/${p.slug}/">${p.name}</a></h3>
      <div class="price-row">${priceHtml}</div>
      <button type="button" class="dh-cart-add-btn" data-slug="${p.slug}" data-name="${safeName}" data-price="${price.price}" data-image="${img}" aria-label="Thêm ${safeName} vào giỏ hàng">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      </button>
    </div>
  `;
}

// Wraps a page's <main> content with the shared <head>/header/footer shell.
// header/footer are fully-rendered markup (real static HTML, not a JS mount point).
// `path` is the page's own canonical route (e.g. "/san-pham/slug/") — every
// builder must pass it so canonical/og:url are correct; omitted only for
// non-canonical utility pages (404). `jsonLd` is an array of schema.org
// objects (BreadcrumbList, Product, Article, Organization...) rendered as
// separate <script type="application/ld+json"> blocks.
export function page({
  title,
  description,
  path,
  image,
  type = "website",
  categories,
  activePath = "",
  bodyMain,
  extraScripts = [],
  jsonLd = [],
  robots = "index, follow",
}) {
  // The search box lives in the shared header, so its script belongs on every
  // page rather than in each caller's extraScripts.
  const scripts = [...extraScripts, "/js/search-suggest.js"]
    .map((s) => `<script src="${s}"></script>`)
    .join("\n");
  const metaDescription = description || DEFAULT_DESCRIPTION;
  const canonical = path ? absUrl(path) : null;
  const ogImage = absUrl(image || DEFAULT_OG_IMAGE);
  const ld = jsonLdScripts(jsonLd);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-2TZD0YNXKK"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-2TZD0YNXKK');
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${escapeAttr(metaDescription)}">
<meta name="robots" content="${robots}">
${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
<link rel="icon" href="/assets/favicon/favicon-32x32.png" sizes="32x32">
<link rel="icon" href="/assets/favicon/favicon-192x192.png" sizes="192x192">
<link rel="apple-touch-icon" href="/assets/favicon/apple-touch-icon.png">
<meta name="theme-color" content="#123f40">
<meta property="og:site_name" content="Dolphin House">
<meta property="og:locale" content="vi_VN">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(metaDescription)}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ""}
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(title)}">
<meta name="twitter:description" content="${escapeAttr(metaDescription)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="stylesheet" href="/css/styles.css">
${ld}
</head>
<body>
${renderHeader(categories, activePath)}
${bodyMain}
${renderFooter()}
${scripts}
</body>
</html>
`;
}
