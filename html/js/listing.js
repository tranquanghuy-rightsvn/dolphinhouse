// Progressive enhancement for shop/category listing pages. The static HTML
// already contains the correct default (page 1, default sort) product grid —
// this only re-renders client-side when the URL carries ?sort=/?q=/?paged=
// (no backend exists to render those combinations as their own static pages).
(function () {
  const PER_PAGE = 16;

  function formatVnd(n) {
    return Number(n).toLocaleString("vi-VN") + " ₫";
  }

  function cardHtml(p) {
    const isSale = p.on_sale && p.regular_price !== p.price;
    const priceHtml = isSale
      ? `<span class="price-old">${formatVnd(p.regular_price)}</span><span class="price-current sale">${formatVnd(p.price)}</span>`
      : `<span class="price-current">${formatVnd(p.price)}</span>`;
    return `
    <div class="product-card">
      ${isSale ? '<span class="onsale">Giảm giá!</span>' : ""}
      <a class="thumb" href="/san-pham/${p.slug}/"><img src="${p.img}" alt="${p.name}" loading="lazy"></a>
      <h3><a href="/san-pham/${p.slug}/">${p.name}</a></h3>
      <div class="price-row">${priceHtml}</div>
    </div>`;
  }

  function sortItems(list, key) {
    const arr = list.slice();
    if (key === "price-asc") return arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (key === "price-desc") return arr.sort((a, b) => Number(b.price) - Number(a.price));
    if (key === "latest") return arr.sort((a, b) => b.id - a.id);
    return arr;
  }

  function paginationHtml(base, params, totalPages, currentPage) {
    if (totalPages <= 1) return "";
    const hrefFor = (p) => {
      const sp = new URLSearchParams(params);
      if (p === 1) sp.delete("paged");
      else sp.set("paged", p);
      const qs = sp.toString();
      return base + (qs ? "?" + qs : "");
    };
    let html = "";
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
        html += p === currentPage ? `<span class="current">${p}</span>` : `<a href="${hrefFor(p)}">${p}</a>`;
      } else if (html.slice(-10).indexOf("…") === -1) {
        html += `<span>…</span>`;
      }
    }
    if (currentPage < totalPages) html += `<a href="${hrefFor(currentPage + 1)}">→</a>`;
    return html;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("listing-dynamic");
    const dataEl = document.querySelector('script[type="application/json"][id]');
    const sortSelect = document.getElementById("sort-select");
    if (!container || !dataEl) return;

    const params = new URLSearchParams(window.location.search);
    const sortKey = params.get("sort") || "default";
    const query = (params.get("q") || "").trim();
    const paged = Math.max(1, parseInt(params.get("paged") || "1", 10));

    if (sortSelect) sortSelect.value = sortKey;

    // Static HTML already matches this exact state — nothing to re-render.
    if (sortKey === "default" && !query && paged === 1) {
      bindSortHandler();
      return;
    }

    const all = JSON.parse(dataEl.textContent);
    const base = container.dataset.base;
    let filtered = all;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    filtered = sortItems(filtered, sortKey);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const currentPage = Math.min(paged, totalPages);
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    const countEl = document.getElementById("result-count");
    if (countEl) {
      countEl.textContent = query
        ? `Kết quả tìm kiếm cho "${query}" — ${filtered.length} sản phẩm`
        : `Hiển thị ${filtered.length === 0 ? 0 : start + 1}–${Math.min(start + PER_PAGE, filtered.length)} của ${filtered.length} sản phẩm`;
    }

    const gridHtml = pageItems.length
      ? `<div class="product-grid" id="product-listing">${pageItems.map(cardHtml).join("")}</div>`
      : `<p class="empty-state" id="empty-msg">Không tìm thấy sản phẩm phù hợp. <a class="link-arrow" href="/cua-hang/">Xem tất cả sản phẩm →</a></p>`;

    container.innerHTML = `${gridHtml}<nav class="pagination" id="pagination">${paginationHtml(base, params, totalPages, currentPage)}</nav>`;

    bindSortHandler();
  });

  function bindSortHandler() {
    const sel = document.getElementById("sort-select");
    if (!sel) return;
    sel.addEventListener("change", () => {
      const params = new URLSearchParams(window.location.search);
      params.set("sort", sel.value);
      params.delete("paged");
      window.location.search = params.toString();
    });
  }
})();
