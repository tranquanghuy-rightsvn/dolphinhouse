# HomeSections Specification

## Overview
- **Target file:** `index.html` + `css/styles.css` (§ home sections) + `js/data/home-sections.data.js`
- **Screenshot:** `/tmp/dh-orig-desktop.png`
- **Interaction model:** static + hover

## DOM Structure
```html
<div class="home-sections">
  <section class="home-section">
    <div class="section_cvp_title">
      <h3><span>CÁC SẢN PHẨM NỔI BẬT</span></h3>
      <a class="section_cvp_link" href="cua-hang.html">Xem thêm</a>
    </div>
    <div class="section_cvp_content">
      <ul class="products">
        <li class="product">
          <div class="shop_loop_box">
            <a class="product-link" href="san-pham.html?slug=...">
              <span class="onsale">Giảm giá!</span>
              <img ...>
            </a>
            <a class="add_to_cart_button" href="#">Thêm vào giỏ hàng</a>
          </div>
          <a class="product-link" href="...">
            <h2 class="woocommerce-loop-product__title">...</h2>
            <span class="price"><del>260.000 ₫</del> <ins>190.000 ₫</ins></span>
          </a>
        </li>
        ...
      </ul>
    </div>
  </section>
  ... (6 sections, data in HOME_SECTIONS)
</div>
```

## Computed Styles (exact, from getComputedStyle on live site)
- Card `li.product`: border `1px solid #e5e9ec`, radius `8px`,
  padding `8px 8px 16px`, background `#fff`.
- Title `h2`: 15px, weight 700, color `#333`, line-height 20.25px,
  clamp 3 lines, min-height 2.9em.
- Price: current `#e03232` 16px/700; old price gray line-through 13px.
- `.onsale`: bg `#b8489a` (rgb 184,72,154), white, 12px, radius 3px,
  absolute top-left.
- `.section_cvp_title`: border-bottom `2px solid #0e3b3f`,
  margin `0 0 14px`, padding `0 0 8px`; label `span` bg `#4f1c78`,
  white, 16px/500, uppercase, padding `0 10px`, slanted right edge;
  link "Xem thêm" right, teal.
- Grid: 4 cols desktop / 3 cols ≤1024 / 2 cols ≤768; gap 16px (10px ≤480px).

## States & Behaviors
- Hover card: shadow + translateY(-2px); "Thêm vào giỏ hàng" appears.
- Hover title: teal. Otherwise N/A (no tabs/scroll/time states).

## Content
- Verbatim titles/prices/images in `js/data/home-sections.data.js`
  (52 products, 12+8+8+8+8+8). Images hotlink original CDN
  `https://dolphinhouse.vn/wp-content/uploads/...` (300x300).
- Section heads verbatim (uppercase VI): see HOME_SECTIONS keys.

## Responsive
- Desktop 1440: 4 col. Tablet 768: 2 col + stacked header + hamburger nav.
  Breakpoints: 1024 (→3 col), 768 (→2 col + nav collapse), 480 (gap 10px).
