// Content for the "Tin Tức" (blog), Giới thiệu, Liên hệ and Videos pages.
// Extracted from the live dolphinhouse.vn on 2026-09-04. Article bodies live as
// separate HTML fragment files under scripts/data/ (read at build time) since
// they're rich content, not JSON-friendly data.
const BLOG_POSTS = [
 {
  "slug": "so-sanh-inox-bep",
  "title": "Inox 201, 304, 316 hay 430: Chọn loại nào cho căn bếp?",
  "date": "26/08/2026",
  "views": "6 lượt xem",
  "excerpt": "So sánh inox 201, 304, 316 và 430 theo độ bền, môi trường sử dụng, từ tính và cách vệ sinh để chọn chất liệu phù hợp cho căn bếp.",
  "heroImg": "/assets/images/blog/so-sanh-inox-bep-hero.webp",
  "bodyFile": "inox.body.html",
  "categories": ["kinh-nghiem-chon-do-gia-dung"],
  "tags": []
 },
 {
  "slug": "7-tieu-chi-chon-do-gia-dung-thong-minh",
  "title": "7 tiêu chí chọn đồ gia dụng thông minh để căn bếp nhẹ nhàng hơn mỗi ngày",
  "date": "25/08/2026",
  "views": "10 lượt xem",
  "excerpt": null,
  "heroImg": "/assets/images/blog/do-dung-nha-bep-hero.webp",
  "bodyFile": "tieu-chi-7.body.html",
  "categories": ["kinh-nghiem-chon-do-gia-dung"],
  "tags": []
 },
 {
  "slug": "chon-san-pham-gia-dung-theo-phong-cach-song",
  "title": "Chọn đồ gia dụng theo phong cách sống: Mua ít, dùng đúng",
  "date": "05/05/2026",
  "views": "13 lượt xem",
  "excerpt": "Mỗi gia đình có một nhịp sống riêng. Gợi ý cách chọn đồ gia dụng theo thời gian, không gian, sở thích và nhu cầu an toàn để mua ít nhưng dùng đúng.",
  "heroImg": "/assets/images/blog/chon-do-gia-dung-theo-phong-cach-song.webp",
  "bodyFile": "phong-cach-song.body.html",
  "categories": ["review-san-pham-cao-cap"],
  "tags": ["gia-dung-thong-minh"]
 },
 {
  "slug": "can-bep-hien-dai-can-nhung-nhom-san-pham-nao",
  "title": "Căn bếp hiện đại cần gì? 5 nhóm sản phẩm nên ưu tiên",
  "date": "05/05/2026",
  "views": "12 lượt xem",
  "excerpt": null,
  "heroImg": "/assets/images/blog/can-bep-hien-dai-5-nhom-san-pham.webp",
  "bodyFile": "can-bep-hien-dai.body.html",
  "categories": ["meo-cham-soc-khong-gian-song"],
  "tags": ["nha-bep-cao-cap"]
 },
 {
  "slug": "tieu-chi-chon-do-gia-dung-thong-minh",
  "title": "5 tiêu chí chọn đồ gia dụng thông minh cho gia đình trẻ",
  "date": "05/05/2026",
  "views": "10 lượt xem",
  "excerpt": null,
  "heroImg": "/assets/images/blog/5-tieu-chi-do-gia-dung-gia-dinh-tre.webp",
  "bodyFile": "tieu-chi-5.body.html",
  "categories": ["tu-van-nha-thong-minh"],
  "tags": ["gia-dung-thong-minh", "nha-thong-minh"]
 }
];
// Each post belongs to exactly one category (single-select, not multi like
// tags) — counts below are derived from BLOG_POSTS.categories and must stay
// in sync with it. Slugs match the live wp-json/wp/v2/categories taxonomy
// (categories with 0 posts on the live site, e.g. "Smart Watch", are omitted).
const BLOG_CATEGORIES_WIDGET = [
 { "name": "Kinh nghiệm chọn đồ gia dụng", "slug": "kinh-nghiem-chon-do-gia-dung", "count": 2 },
 { "name": "Mẹo chăm sóc không gian sống", "slug": "meo-cham-soc-khong-gian-song", "count": 1 },
 { "name": "Review sản phẩm cao cấp", "slug": "review-san-pham-cao-cap", "count": 1 },
 { "name": "Tư vấn nhà thông minh", "slug": "tu-van-nha-thong-minh", "count": 1 }
];
const BLOG_TAGS_WIDGET = [
 { "name": "gia dụng thông minh", "slug": "gia-dung-thong-minh", "count": 2 },
 { "name": "nhà bếp cao cấp", "slug": "nha-bep-cao-cap", "count": 1 },
 { "name": "nhà thông minh", "slug": "nha-thong-minh", "count": 1 }
];
const VIDEOS = [
 {
  "slug": "android-tivi-box-thiet-bi-giai-tri-da-nang-trong-gia-dinh-ban",
  "title": "Android Tivi Box thiết bị giải trí đa năng trong gia đình bạn",
  "date": "13/11/2016",
  "views": "21 lượt xem",
  "thumb": "/assets/images/blog/video2-300x300.jpg",
  "youtube": "L7xb1Ah6q6Q"
 },
 {
  "slug": "android-tivi-box-minix-neo-u1-unbox",
  "title": "Android Tivi Box Minix NEO U1 – Unbox",
  "date": "13/11/2016",
  "views": "13 lượt xem",
  "thumb": "/assets/images/blog/maxresdefault-300x300.jpg",
  "youtube": "1PhhLXxjtpE"
 }
];
