// Generates /tin-tuc/, /gioi-thieu/, /lien-he/, /videos/(+2 posts), and the 5
// top-level blog post pages (dolphinhouse.vn uses flat slugs for posts, not
// nested under /tin-tuc/ — matched here exactly).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { page, absUrl, stripHtml, truncate, breadcrumbLd, formatVnd, faqLd, faqSectionHtml } from "./partials.mjs";
import { loadCms } from "./cms-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
// Hand-written page bodies (gioi thieu, policy pages) — not CMS content.
const DATA_DIR = join(ROOT, "scripts/data");

const { BLOG_POSTS, BLOG_CATEGORIES_WIDGET, BLOG_TAGS_WIDGET, VIDEOS, PRODUCTS } = loadCms();

// No real order/sales data exists in this static export, so "bán chạy" is a
// random 6-product sample — picked once per build, same set on every blog
// sidebar (listing, post detail, category/tag archives) within that build.
// Seeded (not Math.random) so two builds of the same data produce byte-identical
// HTML — the CI commits its output, and a per-build reshuffle would touch every
// blog page on every build.
function shuffled(arr, seed = 20260908) {
  const a = arr.slice();
  let s = seed;
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const BESTSELLERS = shuffled(PRODUCTS).slice(0, 6);

function readBody(file) {
  return readFileSync(join(DATA_DIR, file), "utf8");
}

function productListWidgetHtml(items, title) {
  const rows = items
    .map(
      (p) => `
    <li><a class="link_recent_thumb" href="/san-pham/${p.slug}/"><img src="${p.images[0] ? p.images[0].src : ""}" alt="${p.name}"></a>
      <div><a href="/san-pham/${p.slug}/">${p.name}</a><span class="bestseller-price">${formatVnd(p.prices.price)}</span></div>
    </li>`
    )
    .join("");
  return `
    <div class="widget">
      <div class="title-sidebar">${title}</div>
      <ul class="widget-list recent-posts bestseller-list">${rows}</ul>
    </div>`;
}
function bestSellerWidgetHtml() {
  return productListWidgetHtml(BESTSELLERS, "Sản phẩm bán chạy");
}
function featuredProductsWidgetHtml() {
  return productListWidgetHtml(BESTSELLERS, "Sản phẩm nổi bật");
}

function sidebarCategoriesTags() {
  return `
  <aside class="blog-sidebar">
    <form class="blog-search" action="/tin-tuc/" method="get"><input type="search" placeholder="Tìm kiếm tin tức"><button type="submit">Tìm kiếm</button></form>
    <div class="widget">
      <div class="title-sidebar">Danh mục tin tức</div>
      <ul class="widget-list">${BLOG_CATEGORIES_WIDGET.map((c) => `<li><a href="/danh-muc-tin-tuc/${c.slug}/">${c.name} (${c.count})</a></li>`).join("")}</ul>
    </div>
    <div class="widget">
      <div class="title-sidebar">Từ khóa</div>
      <div class="tagcloud">${BLOG_TAGS_WIDGET.map((t) => `<a href="/tag/${t.slug}/">${t.name}</a>`).join("")}</div>
    </div>
    ${bestSellerWidgetHtml()}
  </aside>`;
}

function sidebarRecentPosts({ withFeatured = false } = {}) {
  const items = BLOG_POSTS.map(
    (p) => `
    <li><a class="link_recent_thumb" href="/${p.slug}/"><img src="${p.heroImg}" alt="${p.title}"></a>
      <div><a href="/${p.slug}/">${p.title}</a><small>${p.date}</small></div>
    </li>`
  ).join("");
  return `
  <aside class="blog-sidebar">
    <div class="widget">
      <div class="title-sidebar">Tin tức mới</div>
      <ul class="widget-list recent-posts">${items}</ul>
    </div>
    ${withFeatured ? featuredProductsWidgetHtml() : ""}
  </aside>`;
}

function postCardHtml(p) {
  return `
  <article class="blog-card">
    <a class="blog-card-thumb" href="/${p.slug}/"><img src="${p.heroImg}" alt="${p.title}" loading="lazy"></a>
    <div class="blog-card-body">
      <a class="blog-card-title" href="/${p.slug}/">${p.title}</a>
      <div class="blog-card-date">Ngày cập nhật <strong>${p.date}</strong></div>
      ${p.excerpt ? `<p class="blog-card-excerpt">${p.excerpt}</p>` : ""}
    </div>
  </article>`;
}

// Inline "Danh mục: ... / Từ khóa: ..." badges on each post, linking to its
// own taxonomy archives — the sidebar widget lists ALL categories/tags site-
// wide, this highlights the ones that actually apply to the article being read.
function taxonomyBadgesHtml(post) {
  const cats = (post.categories || []).map((slug) => BLOG_CATEGORIES_WIDGET.find((c) => c.slug === slug)).filter(Boolean);
  const tags = (post.tags || []).map((slug) => BLOG_TAGS_WIDGET.find((t) => t.slug === slug)).filter(Boolean);
  if (!cats.length && !tags.length) return "";
  return `
      <div class="post-taxonomy">
        ${cats.length ? `<span>Danh mục: ${cats.map((c) => `<a href="/danh-muc-tin-tuc/${c.slug}/">${c.name}</a>`).join(", ")}</span>` : ""}
        ${tags.length ? `<span>Từ khóa: ${tags.map((t) => `<a href="/tag/${t.slug}/">${t.name}</a>`).join(", ")}</span>` : ""}
      </div>`;
}

function relatedPostsHtml(currentSlug) {
  const related = BLOG_POSTS.filter((p) => p.slug !== currentSlug).slice(0, 3);
  return `
  <div class="relatedcat">
    <div class="section-title"><span>Có thể bạn quan tâm</span></div>
    <div class="related-grid">
      ${related.map((p) => `
      <a class="related-item" href="/${p.slug}/">
        <img src="${p.heroImg}" alt="${p.title}" loading="lazy">
        <span>${p.title}</span>
        <small>${p.date}</small>
      </a>`).join("")}
    </div>
  </div>`;
}

export function buildBlogListing(write, categories) {
  const cards = BLOG_POSTS.map(postCardHtml).join("");
  const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / Tin tức &amp; Kinh nghiệm gia dụng</nav>
  <div class="blog-hero">
    <small>TIN TỨC DOLPHIN HOUSE</small>
    <h2>Kinh nghiệm chọn đồ gia dụng cho gia đình hiện đại</h2>
    <p>Tư vấn chọn mua &nbsp;•&nbsp; Mẹo sử dụng &nbsp;•&nbsp; Không gian sống tiện nghi</p>
  </div>
  <div class="blog-layout">
    <div class="blog-main">
      <div class="blog-section-title"><span>TIN TỨC DOLPHIN HOUSE</span><h1>Tin tức &amp; Kinh nghiệm gia dụng</h1></div>
      <div class="blog-grid">${cards}</div>
    </div>
    ${sidebarCategoriesTags()}
  </div>
</main>`;
  write(
    "tin-tuc/index.html",
    page({
      title: "Tin tức & Kinh nghiệm gia dụng | Dolphin House",
      description: "Tin tức Dolphin House: kinh nghiệm chọn đồ gia dụng, mẹo chăm sóc không gian sống và tư vấn nhà thông minh.",
      path: "/tin-tuc/",
      categories,
      activePath: "/tin-tuc/",
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Tin tức & Kinh nghiệm gia dụng", url: "/tin-tuc/" }])],
    })
  );
}

// dd/mm/yyyy (as stored for display) -> yyyy-mm-dd (ISO, required by schema.org datePublished).
function isoDate(d) {
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day}`;
}

export function buildBlogPosts(write, categories) {
  for (let i = 0; i < BLOG_POSTS.length; i++) {
    const p = BLOG_POSTS[i];
    const prev = BLOG_POSTS[i + 1];
    const next = BLOG_POSTS[i - 1];
    const path = `/${p.slug}/`;
    const description = truncate(p.excerpt || stripHtml(p.body), 160);
    const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <a href="/tin-tuc/">Tin Tức</a> / ${p.title}</nav>
  <div class="blog-layout">
    <article class="blog-main blog-post">
      <header class="blog-post-header">
        <h1>${p.title}</h1>
        <div class="post-info"><span>${p.date}</span><span>${p.views}</span></div>
        ${taxonomyBadgesHtml(p)}
      </header>
      <div class="tinymce">${p.body}</div>
      <nav class="post-navigation">
        ${prev ? `<a class="nav-prev" href="/${prev.slug}/"><small>Bài trước</small>${prev.title}</a>` : "<span></span>"}
        ${next ? `<a class="nav-next" href="/${next.slug}/"><small>Bài tiếp</small>${next.title}</a>` : ""}
      </nav>
      ${relatedPostsHtml(p.slug)}
    </article>
    ${sidebarCategoriesTags()}
  </div>
</main>`;
    const articleLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: p.title,
      image: [absUrl(p.heroImg)],
      datePublished: isoDate(p.date),
      dateModified: isoDate(p.date),
      author: { "@type": "Organization", name: "Dolphin House" },
      publisher: { "@type": "Organization", name: "Dolphin House", logo: { "@type": "ImageObject", url: absUrl("/assets/images/site/dolphin-house-logo-320x100-1.webp") } },
      mainEntityOfPage: absUrl(path),
      description,
    };
    write(
      `${p.slug}/index.html`,
      page({
        title: `${p.title} | Dolphin House`,
        description,
        path,
        image: p.heroImg,
        type: "article",
        categories,
        activePath: "/tin-tuc/",
        bodyMain,
        extraScripts: ["/js/site.js"],
        jsonLd: [articleLd, breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Tin Tức", url: "/tin-tuc/" }, { name: p.title, url: path }])],
      })
    );
  }
}

// Post-taxonomy archives (blog categories + tags). The live site serves
// categories at /category/<slug>/ — renamed here to /danh-muc-tin-tuc/<slug>/
// to keep it unambiguous next to the product taxonomy at /danh-muc/<slug>/.
// Tag archives keep the live /tag/<slug>/ path unchanged.
function taxonomyArchive(write, categories, { basePath, kicker, name, breadcrumbLabel, description, posts }) {
  const cards = posts.map(postCardHtml).join("");
  const path = `/${basePath}`;
  const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <a href="/tin-tuc/">Tin Tức</a> / <span>${breadcrumbLabel}</span></nav>
  <div class="blog-layout">
    <div class="blog-main">
      <div class="blog-section-title"><span>${kicker}</span><h1>${name}</h1></div>
      <div class="blog-grid">${cards || "<p class=\"empty-state\">Chưa có bài viết nào.</p>"}</div>
    </div>
    ${sidebarCategoriesTags()}
  </div>
</main>`;
  write(
    `${basePath}index.html`,
    page({
      title: `${name} | Dolphin House`,
      description,
      path,
      categories,
      activePath: "/tin-tuc/",
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Tin Tức", url: "/tin-tuc/" }, { name, url: path }])],
    })
  );
}

export function buildBlogTaxonomies(write, categories) {
  for (const cat of BLOG_CATEGORIES_WIDGET) {
    const posts = BLOG_POSTS.filter((p) => (p.categories || []).includes(cat.slug));
    taxonomyArchive(write, categories, {
      basePath: `danh-muc-tin-tuc/${cat.slug}/`,
      kicker: "DANH MỤC TIN TỨC",
      name: cat.name,
      breadcrumbLabel: cat.name,
      description: `${cat.count} bài viết về "${cat.name}" trong Tin tức Dolphin House.`,
      posts,
    });
  }
  for (const tag of BLOG_TAGS_WIDGET) {
    const posts = BLOG_POSTS.filter((p) => (p.tags || []).includes(tag.slug));
    taxonomyArchive(write, categories, {
      basePath: `tag/${tag.slug}/`,
      kicker: "TỪ KHÓA",
      name: tag.name,
      breadcrumbLabel: `Từ khóa: ${tag.name}`,
      description: `${tag.count} bài viết gắn thẻ "${tag.name}" trong Tin tức Dolphin House.`,
      posts,
    });
  }
}

const GIOI_THIEU_FAQ = [
  {
    question: "Dolphin House chuyên bán những sản phẩm gì?",
    answer:
      "Dolphin House chọn lọc đồ gia dụng thông minh, thiết bị nhà bếp, điện gia dụng và các tiện ích không gian sống cho gia đình hiện đại — ưu tiên sản phẩm có công dụng thật, dùng bền và phù hợp với căn hộ/nhà phố Việt Nam.",
  },
  {
    question: "Sản phẩm tại Dolphin House có chính hãng không?",
    answer:
      "Có. Toàn bộ sản phẩm được nhập và phân phối chính hãng, có đầy đủ thông tin xuất xứ, thông số kỹ thuật và chế độ bảo hành theo từng ngành hàng.",
  },
  {
    question: "Dolphin House có cửa hàng để xem trực tiếp sản phẩm không?",
    answer:
      "Dolphin House có địa chỉ tại S219 Đại Dương 8, Vinhomes Ocean Park, Gia Lâm, Hà Nội. Khách hàng có thể liên hệ hotline 086 639 3892 trước khi ghé để được tư vấn và sắp xếp xem sản phẩm.",
  },
  {
    question: "Chính sách bảo hành, đổi trả của Dolphin House như thế nào?",
    answer:
      'Mỗi sản phẩm có thời hạn bảo hành riêng theo nhà sản xuất, kèm chính sách đổi trả nếu lỗi do nhà sản xuất. Chi tiết đầy đủ tại trang <a href="/chinh-sach-bao-hanh-doi-tra/">Chính sách bảo hành - đổi trả</a>.',
  },
  {
    question: "Làm sao để liên hệ hợp tác hoặc tư vấn với Dolphin House?",
    answer:
      'Liên hệ hotline 086 639 3892, email dolphinhouse.vn@gmail.com, hoặc gửi thông tin qua trang <a href="/lien-he/">Liên hệ</a> — đội ngũ Dolphin House sẽ phản hồi trong thời gian sớm nhất.',
  },
];

export function buildGioiThieu(write, categories) {
  const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / Về Dolphin House</nav>
  <div class="blog-layout blog-layout--narrow-sidebar">
    ${sidebarRecentPosts({ withFeatured: true })}
    <article class="blog-main page-article">
      <h1 class="page-title">Về Dolphin House</h1>
      <div class="tinymce">${readBody("gioithieu.body.html")}</div>
      ${faqSectionHtml(GIOI_THIEU_FAQ, { heading: "Câu hỏi thường gặp về Dolphin House" })}
    </article>
  </div>
</main>`;
  write(
    "gioi-thieu/index.html",
    page({
      title: "Về Dolphin House | Câu Chuyện Thương Hiệu Gia Dụng Thông Minh",
      description: truncate(stripHtml(readBody("gioithieu.body.html")), 160),
      path: "/gioi-thieu/",
      categories,
      activePath: "/gioi-thieu/",
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [
        breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Về Dolphin House", url: "/gioi-thieu/" }]),
        faqLd(GIOI_THIEU_FAQ),
      ],
    })
  );
}

export function buildLienHe(write, categories) {
  const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / Liên hệ</nav>
  <div class="blog-layout blog-layout--narrow-sidebar">
    ${sidebarRecentPosts({ withFeatured: true })}
    <article class="blog-main page-article">
      <h1 class="page-title">Liên hệ</h1>
      <div class="tinymce">
        <h2>Liên hệ Dolphin House</h2>
        <p><strong>Dolphin House</strong> tư vấn đồ gia dụng thông minh, tiện ích cao cấp và điện gia dụng cho gia đình hiện đại.</p>
        <p><strong>Địa chỉ:</strong> S219 Đại Dương 8, Vinhomes Ocean Park, Gia Lâm, Hà Nội</p>
        <p><strong>Hotline:</strong> 086 639 3892</p>
        <p><strong>Email:</strong> dolphinhouse.vn@gmail.com</p>
        <p><strong>Thời gian hỗ trợ:</strong> 8h30 – 21h30 hằng ngày</p>
        <p>Hãy để lại nhu cầu của bạn: sản phẩm quan tâm, ngân sách dự kiến, không gian sử dụng hoặc vấn đề cần giải quyết. Dolphin House sẽ tư vấn theo nhu cầu thật của gia đình.</p>
      </div>
      <form class="contact-form" id="contact-form">
        <div class="contact-form-row">
          <input type="text" placeholder="Họ và tên" required>
          <input type="tel" placeholder="Số điện thoại" required>
        </div>
        <input type="email" placeholder="Email" required>
        <textarea rows="6" placeholder="Tin nhắn"></textarea>
        <button type="submit">Gửi</button>
      </form>
    </article>
  </div>
</main>`;
  write(
    "lien-he/index.html",
    page({
      title: "Liên Hệ Dolphin House | Tư Vấn Đồ Gia Dụng Thông Minh",
      description: "Liên hệ Dolphin House: hotline 086 639 3892, email dolphinhouse.vn@gmail.com. Tư vấn đồ gia dụng thông minh, thiết bị bếp và tiện ích cao cấp cho gia đình hiện đại.",
      path: "/lien-he/",
      categories,
      activePath: "/lien-he/",
      bodyMain,
      extraScripts: ["/js/site.js", "/js/contact-form.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Liên hệ", url: "/lien-he/" }])],
    })
  );
}

// Generic "simple content page" builder for the small policy/help pages
// (Hỗ trợ khách hàng, Hình thức thanh toán, Chính sách vận chuyển) — same
// title-page + tinymce + recent-posts-sidebar layout as Giới thiệu/Liên hệ.
export function buildSimplePage(write, categories, { slug, title, bodyFile, faq }) {
  const pageName = title.split(" | ")[0];
  const path = `/${slug}/`;
  const description = truncate(stripHtml(readBody(bodyFile)), 160);
  const bodyMain = `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / ${pageName}</nav>
  <div class="blog-layout blog-layout--narrow-sidebar">
    ${sidebarRecentPosts()}
    <article class="blog-main page-article">
      <h1 class="page-title">${pageName}</h1>
      <div class="tinymce">${readBody(bodyFile)}</div>
      ${faq && faq.length ? faqSectionHtml(faq) : ""}
    </article>
  </div>
</main>`;
  write(
    `${slug}/index.html`,
    page({
      title,
      description,
      path,
      categories,
      bodyMain,
      extraScripts: ["/js/site.js"],
      jsonLd: [
        breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: pageName, url: path }]),
        faq && faq.length ? faqLd(faq) : null,
      ],
    })
  );
}

export function buildVideos(write, categories) {
  const cards = VIDEOS.map(
    (v) => `
    <article class="video-card">
      <a href="/videos/${v.slug}/" class="video-card-thumb"><img src="${v.thumb}" alt="${v.title}" loading="lazy"><span class="play-btn">▶</span></a>
      <h2><a href="/videos/${v.slug}/">${v.title}</a></h2>
      <div class="post-info"><span>${v.date}</span></div>
    </article>`
  ).join("");

  write(
    "videos/index.html",
    page({
      title: "Videos - Dolphin House",
      description: "Video giới thiệu, hướng dẫn sử dụng và trải nghiệm thực tế các sản phẩm gia dụng thông minh tại Dolphin House.",
      path: "/videos/",
      categories,
      activePath: "/videos/",
      bodyMain: `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / Videos</nav>
  <div class="blog-layout">
    <div class="blog-main">
      <h1 class="page-title">Videos</h1>
      <div class="video-grid">${cards}</div>
    </div>
    ${sidebarCategoriesTags()}
  </div>
</main>`,
      extraScripts: ["/js/site.js"],
      jsonLd: [breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Videos", url: "/videos/" }])],
    })
  );

  for (let i = 0; i < VIDEOS.length; i++) {
    const v = VIDEOS[i];
    const other = VIDEOS[(i + 1) % VIDEOS.length];
    const path = `/videos/${v.slug}/`;
    // The CMS description doubles as the page/meta description when present.
    const description = v.description ? truncate(stripHtml(v.description), 160) : `${v.title} — video Dolphin House.`;
    const videoLd = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: v.title,
      description,
      thumbnailUrl: [absUrl(v.thumb)],
      uploadDate: isoDate(v.date),
      embedUrl: `https://www.youtube.com/embed/${v.youtube}`,
    };
    write(
      `videos/${v.slug}/index.html`,
      page({
        title: `${v.title} - Dolphin House`,
        description,
        path,
        image: v.thumb,
        type: "video.other",
        categories,
        activePath: "/videos/",
        bodyMain: `
<main class="container blog-page">
  <nav class="breadcrumb"><a href="/">Trang chủ</a> / <a href="/videos/">Videos</a> / ${v.title}</nav>
  <div class="blog-layout">
    <article class="blog-main blog-post">
      <header class="blog-post-header">
        <h1>${v.title}</h1>
        <div class="post-info"><span>${v.date}</span><span>${v.views}</span></div>
      </header>
      <div class="tinymce"><div class="video-embed"><iframe src="https://www.youtube.com/embed/${v.youtube}" title="${v.title}" frameborder="0" allowfullscreen></iframe></div>${v.description ? `<p>${v.description}</p>` : ""}</div>
      <nav class="post-navigation">
        <a class="nav-next" href="/videos/${other.slug}/"><small>Video khác</small>${other.title}</a>
      </nav>
    </article>
    ${sidebarCategoriesTags()}
  </div>
</main>`,
        extraScripts: ["/js/site.js"],
        jsonLd: [videoLd, breadcrumbLd([{ name: "Trang chủ", url: "/" }, { name: "Videos", url: "/videos/" }, { name: v.title, url: path }])],
      })
    );
  }
}
