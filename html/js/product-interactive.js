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

  const addToCartBtn = document.getElementById("add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const qty = Math.max(1, parseInt((qtyValue && qtyValue.value) || "1", 10));
      if (window.DHCart) {
        window.DHCart.add(
          {
            slug: addToCartBtn.dataset.slug || "",
            name: addToCartBtn.dataset.name || "",
            price: addToCartBtn.dataset.price || 0,
            image: addToCartBtn.dataset.image || "",
          },
          qty
        );
      }
      if (window.showAddToCartToast) window.showAddToCartToast(addToCartBtn.dataset.name || "");
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
