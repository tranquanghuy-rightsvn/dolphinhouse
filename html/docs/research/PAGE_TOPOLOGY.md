# PAGE_TOPOLOGY — dolphinhouse.vn homepage (v2, redesign live từ ~11:00 2026-09-04)

Bản cũ (6 section tím `.section_cvp`, 52 sp) đã bị thay bằng layout bán lẻ mới.
Source: live site via agent-browser + `/tmp/v-orig.png`.

1. `.topbar` #6d6d6d: welcome trái / pill HOTLINE tím giữa / giờ phải.
2. `header.site-header` trắng: logo / search + nút tím / cart.
3. `nav.main-nav` #0e3b3f: toggle tím "DANH MỤC SẢN PHẨM" + drawer;
   links HOA: TRANG CHỦ / CỬA HÀNG / DANH MỤC SẢN PHẨM / GÓC CHUYÊN GIA /
   GIỚI THIỆU / LIÊN HỆ / VIDEOS.
4. H1 head: H1 42px/500/teal "Dolphin House – Gia dụng thông minh cho
   gia đình hiện đại" + đoạn intro; link phải "Xem toàn bộ cửa hàng →".
5. `section.dh-home-retail-top` (grid ~423px + 1fr, gap 16):
   - Menu trắng radius 18px: head (small + strong 18px) + 7 item
     (badge số 01–07, strong + small, mũi tên →).
   - Hero banner bg #123f40 radius 18px (grid 1fr + 282px):
     ảnh bếp + panel chữ trắng (small, h2 37px, p, nút pill trắng).
6. `section.dh-home-brands`: head (strong 20px + span + link phải) +
   grid 5 cột, 10 thẻ brand (strong 15px + small 11px xám).
7. 7× `section.dh-home-category-block`: heading flex, border-bottom
   2px #e33434; h2 label đỏ #e33434 trắng 20px (vát cạnh phải);
   link "Xem thêm →" đỏ 800. Body grid 220px + 1fr:
   - aside sidebar: tiêu đề ("Danh mục con" / "Gợi ý trong nhóm")
     + links (danh mục con + SP, prefix "›").
   - 4 thẻ SP: ảnh contain 190px + strong teal 14px + del xám 12px
     + giá đỏ #d52b2b 16px/800 (đơn vị "đ").
   Block 7 (Gia dụng châu Âu) chỉ có 1 SP — đúng gốc.
8. Footer #2d2d2d 4 cột + bottom bar; Zalo FAB + back-to-top fixed.

Tương tác: tĩnh + hover (card nổi + hiện nút, title/link đổi màu).
Không carousel/tab/scroll-driven/smooth-lib.
