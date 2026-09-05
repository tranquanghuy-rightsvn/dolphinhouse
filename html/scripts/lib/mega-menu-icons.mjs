// Icons + accent colors for the "Danh mục sản phẩm" mega menu, extracted
// verbatim (SVG paths + computed accent colors) from dolphinhouse.vn on 2026-09-04.
export const CATEGORY_ICONS = {
  "do-dung-nha-bep": {
    color: "#e03232",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11h16l-1.1 8.1a2 2 0 0 1-2 1.9H7.1a2 2 0 0 1-2-1.9L4 11z"></path><path d="M2 11h20"></path><path d="M8.5 7.5c0-1 .8-1 .8-2s-.8-1-.8-2M12 7.5c0-1 .8-1 .8-2S12 3.5 12 2.5M15.5 7.5c0-1 .8-1 .8-2s-.8-1-.8-2"></path></svg>`,
  },
  "chan-ga-goi-dem": {
    color: "#db2777",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6"></path><path d="M2 18h20"></path><path d="M7 10V8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"></path><path d="M4 18v2M20 18v2"></path></svg>`,
  },
  "dien-gia-dung": {
    color: "#ef8f1c",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path></svg>`,
  },
  "ghe-o-to-tre-em": {
    color: "#ef8f1c",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"></path><path d="M3 8l9 5 9-5"></path><path d="M12 13v8"></path></svg>`,
  },
  "gia-dung-chau-au": {
    color: "#0e9488",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><circle cx="12" cy="13" r="5"></circle><circle cx="12" cy="13" r="1.6"></circle><path d="M7 5h.01M10 5h.01"></path></svg>`,
  },
  "gia-dung-tien-ich": {
    color: "#0e9488",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><circle cx="12" cy="13" r="5"></circle><circle cx="12" cy="13" r="1.6"></circle><path d="M7 5h.01M10 5h.01"></path></svg>`,
  },
  "san-pham-deco": {
    color: "#7c3aed",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"></path><path d="M2 14a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5H2z"></path><path d="M6 17h12"></path></svg>`,
  },
  "san-pham-thong-minh": {
    color: "#2563eb",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"></rect><rect x="9.5" y="9.5" width="5" height="5" rx="1"></rect><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"></path></svg>`,
  },
  "tat-ca": {
    color: "#0e3b3f",
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>`,
  },
};

export function hexToRgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
