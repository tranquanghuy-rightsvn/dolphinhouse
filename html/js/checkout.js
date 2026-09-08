// /thanh-toan/ page behavior: coupon toggle, tỉnh/phường cascading select
// (js/vn-address.js), order summary rendered from the same cart data as the
// header dropdown and /gio-hang/ (js/site.js's window.DHCart), and a demo
// "place order" flow (no real backend — clears the cart and shows a
// confirmation panel, consistent with the site's other demo CTAs).
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  // Coupon code toggle
  const couponToggle = document.getElementById("coupon-toggle-link");
  const couponForm = document.getElementById("coupon-form");
  if (couponToggle && couponForm) {
    couponToggle.addEventListener("click", (e) => {
      e.preventDefault();
      couponForm.hidden = !couponForm.hidden;
    });
  }

  // Tỉnh/Thành → Phường/Xã cascading select
  const provinceSelect = document.getElementById("billing-province");
  const wardSelect = document.getElementById("billing-ward");
  if (provinceSelect && wardSelect && typeof populateProvinceSelect === "function") {
    populateProvinceSelect(provinceSelect);
    populateWardField("", wardSelect);
    provinceSelect.addEventListener("change", () => {
      populateWardField(provinceSelect.value, wardSelect);
    });
  }

  // Payment method toggle — slide the bank transfer info open/closed
  // depending on whether "Chuyển khoản ngân hàng" or "COD" is selected.
  const bankCollapse = document.getElementById("checkout-bank-collapse");
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  function setBankInfoOpen(open) {
    if (!bankCollapse) return;
    if (open) {
      bankCollapse.style.maxHeight = bankCollapse.scrollHeight + "px";
      bankCollapse.addEventListener(
        "transitionend",
        function onOpen(e) {
          if (e.propertyName === "max-height") {
            bankCollapse.style.maxHeight = "none";
            bankCollapse.removeEventListener("transitionend", onOpen);
          }
        }
      );
    } else {
      bankCollapse.style.maxHeight = bankCollapse.scrollHeight + "px";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bankCollapse.style.maxHeight = "0px";
        });
      });
    }
  }
  if (bankCollapse) {
    const initialBank = document.querySelector('input[name="payment_method"][value="bank"]');
    bankCollapse.style.maxHeight = initialBank && initialBank.checked ? "none" : "0px";
    paymentRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.checked) setBankInfoOpen(radio.value === "bank");
      });
    });
  }

  // Order summary — same cart data as the header dropdown / giỏ hàng
  function renderOrderSummary() {
    const cart = window.DHCart;
    if (!cart) return;
    const items = cart.read();
    const rowsEl = document.getElementById("checkout-order-items");
    const subtotalEl = document.getElementById("checkout-order-subtotal");
    const totalEl = document.getElementById("checkout-order-total");
    const placeOrderBtn = document.getElementById("place-order-btn");
    if (rowsEl) {
      rowsEl.innerHTML = items
        .map(
          (it) => `
        <tr>
          <td>${it.name} <strong>× ${it.qty}</strong></td>
          <td>${cart.formatVnd(it.price * it.qty)}</td>
        </tr>`
        )
        .join("");
    }
    const total = cart.total(items);
    if (subtotalEl) subtotalEl.textContent = cart.formatVnd(total);
    if (totalEl) totalEl.textContent = cart.formatVnd(total);
    if (placeOrderBtn) placeOrderBtn.disabled = items.length === 0;
  }
  renderOrderSummary();
  if (window.DHCart) window.DHCart.onChange(renderOrderSummary);

  // 6-char order code, e.g. "BQOMXA" — stays the same across page reloads
  // as long as the cart's contents are unchanged, and is regenerated only
  // when the cart changes (item added/removed/qty changed). Kept in
  // localStorage alongside a signature of the cart it was generated for.
  const ORDER_CODE_KEY = "dh_checkout_order_code";
  function generateOrderCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  function cartSignature(items) {
    return items
      .map((it) => `${it.slug}x${it.qty}`)
      .sort()
      .join(",");
  }
  function getOrderCode(items) {
    const sig = cartSignature(items);
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(ORDER_CODE_KEY) || "null");
    } catch {
      stored = null;
    }
    if (stored && stored.sig === sig) return stored.code;
    const code = generateOrderCode();
    localStorage.setItem(ORDER_CODE_KEY, JSON.stringify({ code, sig }));
    return code;
  }

  const transferCodeEl = document.getElementById("checkout-transfer-code");
  function renderOrderCode() {
    if (!window.DHCart || !transferCodeEl) return;
    transferCodeEl.textContent = getOrderCode(window.DHCart.read());
  }
  renderOrderCode();
  if (window.DHCart) window.DHCart.onChange(renderOrderCode);

  // Real order submission. The order is posted to the content service, which
  // stores it for the admin screen; `text/plain` keeps this a "simple request"
  // so the browser never sends a CORS preflight the service cannot answer.
  const errorEl = document.getElementById("checkout-error");
  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function selectedText(select) {
    if (!select || select.selectedIndex < 0) return "";
    const opt = select.options[select.selectedIndex];
    return opt ? opt.textContent.trim() : "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!window.DHCart || window.DHCart.read().length === 0) return;

    const items = window.DHCart.read();
    const total = window.DHCart.total(items);
    const orderCode = transferCodeEl ? transferCodeEl.textContent.trim() : "";
    const payment = document.querySelector('input[name="payment_method"]:checked');
    const btn = document.getElementById("place-order-btn");
    const label = btn ? btn.textContent : "";

    if (errorEl) errorEl.hidden = true;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Đang gửi đơn hàng…";
    }

    const payload = {
      action: "order",
      code: orderCode,
      _hp: (document.getElementById("checkout-hp") || {}).value || "",
      name: (document.getElementById("billing-name") || {}).value || "",
      phone: (document.getElementById("billing-phone") || {}).value || "",
      email: (document.getElementById("billing-email") || {}).value || "",
      province: selectedText(provinceSelect),
      ward: selectedText(wardSelect),
      address: (document.getElementById("billing-address") || {}).value || "",
      note: (document.getElementById("billing-note") || {}).value || "",
      payment_method: payment ? payment.value : "cod",
      items: items.map((it) => ({ slug: it.slug, name: it.name, price: it.price, qty: it.qty })),
      subtotal: total,
      shipping: 0,
      total,
    };

    try {
      if (!window.DH_CMS_URL || window.DH_CMS_URL.indexOf("http") !== 0) {
        throw new Error("Hệ thống đặt hàng chưa sẵn sàng. Vui lòng gọi hotline 086 639 3892.");
      }
      const res = await fetch(window.DH_CMS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Không gửi được đơn hàng, vui lòng thử lại.");

      window.DHCart.clear();
      const orderCodeEl = document.getElementById("checkout-order-code");
      if (orderCodeEl) orderCodeEl.textContent = data.code || orderCode;
      document.getElementById("checkout-form-section").hidden = true;
      document.getElementById("checkout-order-section").hidden = true;
      document.getElementById("checkout-success").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showError(err.message || "Không gửi được đơn hàng, vui lòng thử lại.");
      if (btn) {
        btn.disabled = false;
        btn.textContent = label;
      }
    }
  });
});
