// Product page interactivity (gallery swap, qty stepper, copy name, description
// expand/collapse). Content itself is static HTML baked at build time.
document.addEventListener("DOMContentLoaded", () => {
  const mainImg = document.getElementById("gallery-main-img");
  document.querySelectorAll("#gallery-thumbs img").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainImg.src = thumb.dataset.full;
      document.querySelectorAll("#gallery-thumbs img").forEach((t) => t.classList.remove("active"));
      thumb.classList.add("active");
    });
  });

  const qtyMinus = document.getElementById("qty-minus");
  const qtyPlus = document.getElementById("qty-plus");
  const qtyValue = document.getElementById("qty-value");
  if (qtyMinus && qtyPlus && qtyValue) {
    qtyMinus.addEventListener("click", () => {
      qtyValue.value = Math.max(1, parseInt(qtyValue.value || "1", 10) - 1);
    });
    qtyPlus.addEventListener("click", () => {
      qtyValue.value = parseInt(qtyValue.value || "1", 10) + 1;
    });
  }

  const copyBtn = document.getElementById("copy-name-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard?.writeText(copyBtn.dataset.name || "");
      const old = copyBtn.textContent;
      copyBtn.textContent = "Đã sao chép!";
      setTimeout(() => (copyBtn.textContent = old), 1500);
    });
  }

  // Size picker: switching size rewrites the displayed price and the data the
  // add-to-cart button carries, so the cart can never disagree with the page.
  const priceBlock = document.getElementById("price-block");
  const sizeRow = document.getElementById("size-row");
  const addToCartBtn = document.getElementById("add-to-cart-btn");
  if (sizeRow && priceBlock && addToCartBtn) {
    const options = [...sizeRow.querySelectorAll(".size-option")];
    const formatVnd = (window.DHCart && window.DHCart.formatVnd) ||
      ((n) => Math.round(Number(n) || 0).toLocaleString("vi-VN") + " ₫");

    const selectSize = (option) => {
      options.forEach((o) => {
        const active = o === option;
        o.classList.toggle("is-active", active);
        o.setAttribute("aria-pressed", String(active));
      });
      const price = option.dataset.price || "0";
      const regular = option.dataset.regular || price;
      priceBlock.innerHTML =
        Number(price) < Number(regular)
          ? `<span class="price-old">${formatVnd(regular)}</span> ${formatVnd(price)}`
          : formatVnd(price);
      addToCartBtn.dataset.price = price;
      addToCartBtn.dataset.size = option.dataset.size || "";
    };

    options.forEach((option) => option.addEventListener("click", () => selectSize(option)));
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const qty = Math.max(1, parseInt((qtyValue && qtyValue.value) || "1", 10));
      const item = {
        slug: addToCartBtn.dataset.slug || "",
        name: addToCartBtn.dataset.name || "",
        size: addToCartBtn.dataset.size || "",
        price: addToCartBtn.dataset.price || 0,
        image: addToCartBtn.dataset.image || "",
      };
      if (window.DHCart) window.DHCart.add(item, qty);
      const label = window.DHCart && window.DHCart.itemName ? window.DHCart.itemName(item) : item.name;
      if (window.showAddToCartToast) window.showAddToCartToast(label);
    });
  }

  // "Liên hệ" quick-contact modal — includes the current product so the
  // enquiry is tied to it. Submit has no real backend yet (TODO: wire this
  // to send the admin an email/notification with the product attached) —
  // for now it's UI-only: closes the modal and shows a demo confirmation.
  const contactTrigger = document.getElementById("contact-modal-trigger");
  const contactOverlay = document.getElementById("contact-modal-overlay");
  const contactClose = document.getElementById("contact-modal-close");
  const contactForm = document.getElementById("contact-modal-form");
  if (contactTrigger && contactOverlay && contactClose) {
    const openModal = () => {
      contactOverlay.hidden = false;
      document.body.style.overflow = "hidden";
    };
    const closeModal = () => {
      contactOverlay.hidden = true;
      document.body.style.overflow = "";
    };
    contactTrigger.addEventListener("click", openModal);
    contactClose.addEventListener("click", closeModal);
    contactOverlay.addEventListener("click", (e) => {
      if (e.target === contactOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !contactOverlay.hidden) closeModal();
    });
    if (contactForm) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        closeModal();
        contactForm.reset();
        if (window.showToast) {
          window.showToast("Đã gửi liên hệ!", "Chúng tôi sẽ liên hệ lại với bạn trong thời gian sớm nhất.");
        }
      });
    }
  }

  const descBody = document.getElementById("description-body");
  const expandBtn = document.getElementById("expand-toggle");
  if (descBody && expandBtn) {
    if (descBody.scrollHeight <= 640) {
      expandBtn.style.display = "none";
      descBody.classList.add("expanded");
    } else {
      expandBtn.addEventListener("click", () => {
        const expanded = descBody.classList.toggle("expanded");
        expandBtn.textContent = expanded ? "Thu gọn ▲" : "Xem thêm ▼";
      });
    }
  }
});
