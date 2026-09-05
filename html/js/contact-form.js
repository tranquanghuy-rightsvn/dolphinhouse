// Demo-only contact form (no backend to submit to, same pattern as the
// product page's "add to cart" demo action).
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Cảm ơn bạn đã liên hệ! Đây là bản demo nên tin nhắn chưa được gửi thật.");
    form.reset();
  });
});
