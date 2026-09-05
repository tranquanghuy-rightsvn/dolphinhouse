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

  // Demo "place order" — no real payment/order backend on this static site.
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!window.DHCart || window.DHCart.read().length === 0) return;
    window.DHCart.clear();
    document.getElementById("checkout-form-section").hidden = true;
    document.getElementById("checkout-order-section").hidden = true;
    document.getElementById("checkout-success").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
