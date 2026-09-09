// Accent- and case-insensitive text for searching: "noi com dien" has to find
// "Nồi Cơm Điện" — most people type Vietnamese without diacritics in a search
// box. Shared by the header suggestions (js/search-suggest.js) and the shop
// listing's ?q= filter (js/listing.js) so both match identically.
window.DHText = {
  normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  },
};

// Site-wide interactive behavior only (content is now baked into static HTML
// at build time — see scripts/build.mjs — so this file no longer renders
// header/footer/product markup at runtime).
document.addEventListener("DOMContentLoaded", () => {
  const catBtn = document.getElementById("cat-toggle-btn");
  const drawer = document.getElementById("cat-drawer");
  if (catBtn && drawer) {
    catBtn.addEventListener("click", () => drawer.classList.toggle("open"));
    document.addEventListener("click", (e) => {
      if (!catBtn.contains(e.target) && !drawer.contains(e.target)) drawer.classList.remove("open");
    });
  }

  const mobileBtn = document.getElementById("mobile-menu-btn");
  const navLinks = document.getElementById("nav-links");
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener("click", () => {
      const open = navLinks.classList.toggle("open");
      mobileBtn.classList.toggle("open", open);
      mobileBtn.setAttribute("aria-expanded", String(open));
    });
  }

  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  const backToTop = document.getElementById("back-to-top");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      backToTop.classList.toggle("show", window.scrollY > 400);
    });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  // ---- Cart — demo only (no real backend), items persisted in localStorage
  // so both the header dropdown and /gio-hang/ read the same client-side data. ----
  const CART_KEY = "dh_cart_items";

  function formatVndJs(n) {
    return Math.round(Number(n) || 0).toLocaleString("vi-VN") + " ₫";
  }
  function readCart() {
    try {
      const items = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }
  function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }
  function cartCount(items) {
    return items.reduce((sum, it) => sum + it.qty, 0);
  }
  function cartTotal(items) {
    return items.reduce((sum, it) => sum + it.price * it.qty, 0);
  }
  // A product with sizes is a different line per size, so the cart is keyed by
  // slug + size rather than slug alone. Items stored before sizes existed have
  // no `size` at all, which reads as "" and keeps working unchanged.
  function itemKey(it) {
    return (it.slug || "") + "|" + (it.size || "");
  }
  // Cart-wide display name: "Chảo chống dính (size S)".
  function itemName(it) {
    return it.size ? `${it.name} (size ${it.size})` : it.name;
  }
  function addToCart({ slug, name, price, image, size }, qty = 1) {
    const items = readCart();
    const item = { slug, name, size: size || "", price: Number(price) || 0, image: image || "", qty };
    const existing = items.find((it) => itemKey(it) === itemKey(item));
    if (existing) existing.qty += qty;
    else items.push(item);
    writeCart(items);
    renderCart();
  }
  function removeFromCart(key) {
    writeCart(readCart().filter((it) => itemKey(it) !== key));
    renderCart();
  }
  function setQty(key, qty) {
    const items = readCart();
    const item = items.find((it) => itemKey(it) === key);
    if (!item) return;
    if (qty <= 0) return removeFromCart(key);
    item.qty = qty;
    writeCart(items);
    renderCart();
  }

  function cartItemRowHtml(it) {
    const label = itemName(it);
    return `
      <div class="cart-dropdown-item">
        <button type="button" class="cart-dropdown-item-remove" data-cart-remove="${itemKey(it)}" aria-label="Xoá ${label}">✕</button>
        <div class="cart-dropdown-item-body">
          <span class="cart-dropdown-item-name">${label}</span>
          <span class="cart-dropdown-item-qty">${it.qty} × <strong>${formatVndJs(it.price)}</strong></span>
        </div>
        ${it.image ? `<img class="cart-dropdown-item-thumb" src="${it.image}" alt="${label}">` : ""}
      </div>`;
  }

  function renderHeaderDropdown(items) {
    const badge = document.querySelector(".cart-badge");
    const subtitle = document.querySelector(".cart-text span");
    const count = cartCount(items);
    const total = cartTotal(items);
    if (badge) badge.textContent = String(count);
    if (subtitle) subtitle.textContent = count > 0 ? `${count} sp - ${formatVndJs(total)}` : "Chưa có sản phẩm";

    const dropdown = document.getElementById("cart-dropdown");
    if (!dropdown) return;
    dropdown.classList.toggle("is-empty", items.length === 0);
    const list = document.getElementById("cart-dropdown-items");
    if (list) list.innerHTML = items.map(cartItemRowHtml).join("");
    const totalEl = document.getElementById("cart-dropdown-total");
    if (totalEl) totalEl.textContent = formatVndJs(total);
  }

  function cartPageRowHtml(it) {
    const key = itemKey(it);
    const label = itemName(it);
    return `
      <div class="cart-page-item" data-cart-row="${key}">
        <img class="cart-page-item-thumb" src="${it.image || ""}" alt="${label}">
        <div class="cart-page-item-body">
          <a class="cart-page-item-name" href="/san-pham/${it.slug}/">${it.name}</a>
          ${it.size ? `<div class="cart-page-item-size">Kích cỡ: <strong>${it.size}</strong></div>` : ""}
          <div class="cart-page-item-price">${formatVndJs(it.price)}</div>
        </div>
        <div class="cart-page-item-qty">
          <button type="button" data-cart-qty-minus="${key}" aria-label="Giảm số lượng">-</button>
          <span>${it.qty}</span>
          <button type="button" data-cart-qty-plus="${key}" aria-label="Tăng số lượng">+</button>
        </div>
        <div class="cart-page-item-subtotal">${formatVndJs(it.price * it.qty)}</div>
        <button type="button" class="cart-page-item-remove" data-cart-remove="${key}" aria-label="Xoá ${label}">✕</button>
      </div>`;
  }

  function renderCartPage(items) {
    const root = document.getElementById("cart-page-root");
    if (!root) return;
    root.classList.toggle("is-empty", items.length === 0);
    const list = document.getElementById("cart-page-items");
    if (list) list.innerHTML = items.map(cartPageRowHtml).join("");
    const totalEl = document.getElementById("cart-page-total-amount");
    if (totalEl) totalEl.textContent = formatVndJs(cartTotal(items));
  }

  function renderCart() {
    const items = readCart();
    renderHeaderDropdown(items);
    renderCartPage(items);
    if (window.DHCart && window.DHCart._onChange) window.DHCart._onChange(items);
  }
  renderCart();

  // Exposed so page-specific scripts (e.g. js/checkout.js on /thanh-toan/)
  // can read/format/clear the same cart without duplicating this logic.
  window.DHCart = {
    read: readCart,
    total: cartTotal,
    count: cartCount,
    formatVnd: formatVndJs,
    itemName: itemName,
    itemKey: itemKey,
    add: (item, qty = 1) => addToCart(item, qty),
    clear: () => {
      writeCart([]);
      renderCart();
    },
    onChange(fn) {
      this._onChange = fn;
    },
  };

  let toastTimer = null;
  function dismissToast(toast) {
    clearTimeout(toastTimer);
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }
  function showToast(title, message) {
    let stack = document.getElementById("dh-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "dh-toast-stack";
      document.body.appendChild(stack);
    }
    stack.querySelectorAll(".dh-toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = "dh-toast";
    toast.innerHTML = `
      <span class="dh-toast-icon">✓</span>
      <span class="dh-toast-text"><strong>${title}</strong>${message}</span>
      <button type="button" class="dh-toast-close" aria-label="Đóng thông báo">✕</button>`;
    stack.appendChild(toast);
    toast.offsetHeight; // force a reflow so the transition actually triggers
    toast.classList.add("show");
    toast.querySelector(".dh-toast-close").addEventListener("click", () => dismissToast(toast));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dismissToast(toast), 3000);
  }
  // Generic (title, message) toast for any page script to reuse (contact
  // modal, checkout...); showAddToCartToast keeps the add-to-cart wording.
  window.showToast = showToast;
  window.showAddToCartToast = (name) => showToast("Đã thêm vào giỏ hàng", `Sản phẩm "${name}" đã được thêm vào giỏ hàng.`);

  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".dh-cart-add-btn");
    if (addBtn) {
      e.preventDefault();
      // Cards show the first size's price (see scripts/build.mjs), so adding
      // from a card adds that size — what the visitor is looking at.
      const added = {
        slug: addBtn.dataset.slug || "",
        name: addBtn.dataset.name || "",
        size: addBtn.dataset.size || "",
        price: addBtn.dataset.price || 0,
        image: addBtn.dataset.image || "",
      };
      addToCart(added);
      window.showAddToCartToast(itemName(added));
      return;
    }

    const removeBtn = e.target.closest("[data-cart-remove]");
    if (removeBtn) {
      e.preventDefault();
      removeFromCart(removeBtn.dataset.cartRemove);
      return;
    }

    const qtyMinusBtn = e.target.closest("[data-cart-qty-minus]");
    if (qtyMinusBtn) {
      const key = qtyMinusBtn.dataset.cartQtyMinus;
      const item = readCart().find((it) => itemKey(it) === key);
      if (item) setQty(key, item.qty - 1);
      return;
    }

    const qtyPlusBtn = e.target.closest("[data-cart-qty-plus]");
    if (qtyPlusBtn) {
      const key = qtyPlusBtn.dataset.cartQtyPlus;
      const item = readCart().find((it) => itemKey(it) === key);
      if (item) setQty(key, item.qty + 1);
      return;
    }
  });
});
