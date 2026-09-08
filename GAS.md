# GAS.md — Guideline CMS cho dolphinhouse.vn

> File này là **nguồn quyết định chốt** cho toàn bộ phần CMS (`gas/`) + pipeline dữ liệu
> (`data/` → `html/scripts/build.mjs` → `html/`). Đọc TOÀN BỘ file này trước khi sửa bất kỳ
> file nào trong `gas/`. Playbook chung nằm ở skill `free-cms-static-site-pipeline`; file này
> chỉ chốt quyết định RIÊNG của dự án dolphinhouse.vn.
>
> Sửa code xong phải đồng bộ ngược lại file này trong CÙNG một lượt sửa.

## Kiến trúc (1 sơ đồ)

```
Admin (dolphinhouse.vn/admin) → iframe → web app GAS
   │  ghi qua GitHub Contents API
   ▼
repo tranquanghuy-rightsvn/dolphinhouse (branch master)
   data/*.json  (nguồn chân lý nội dung)          ← chỉ CMS ghi
   html/assets/images/**  (ảnh)                    ← CMS ghi thẳng vào vị trí site
   │  commit vào file index (data/products.json, data/news.json…) trigger CI
   ▼
GitHub Actions: node html/scripts/build.mjs → ghi đè html/** → commit "CI: build html from data"
   ▼
Cloudflare Pages tự deploy commit mới → dolphinhouse.vn
```

Dữ liệu RIÊNG TƯ (người dùng CMS, đơn hàng, liên hệ) **chỉ nằm trong Google Sheet, không bao
giờ đẩy lên GitHub** — repo là public.

---

## I. Đăng nhập

1. Luồng: nhập email → nhận OTP qua email → xác nhận → vào Admin. Không mật khẩu, không dựa
   vào session Google (người dùng thật không cùng Workspace domain với chủ script).
2. Chỉ email có trong sheet `Users` mới được gửi OTP — **ngoại lệ bắt buộc**: email chủ script
   (`Session.getEffectiveUser().getEmail()`, hàm `ownerEmail_()`) luôn được gửi OTP và luôn là
   `root`, kể cả khi sheet `Users` rỗng.
3. Phân quyền 3 cấp: `root` (3) > `admin` (2) > `editor` (1).
   - `editor`: sản phẩm, danh mục sản phẩm, tin tức, danh mục tin tức, video, xem đơn hàng +
     đổi trạng thái đơn.
   - `admin`: mọi thứ của editor + quản lý người dùng (thêm/sửa/xoá `admin`/`editor`) + xoá đơn
     hàng + xoá liên hệ.
   - `root`: như admin, KHÔNG hiển thị và KHÔNG sửa được qua CMS (chỉ sửa tay trong bảng dữ liệu).
   - Không thêm cấp `viewer` (không có hành vi phân biệt thật trong nghiệp vụ này).
4. OTP: 6 số, sống **10 phút**, cooldown **60 giây**/email, sai tối đa **5 lần** thì huỷ mã.
   Token phiên: UUID, sống **30 ngày**, lưu `localStorage` (key KHÔNG mang phiên bản client).
5. Server `requireRole_(token, need)` ở MỌI hàm gọi được từ client — ẩn nút trên UI không phải
   là bảo mật.

## II. Sản phẩm

`data/products.json` (index) + `data/products/<slug>.json` (đầy đủ).

1. Field có ô nhập trên giao diện:
   - `name` — tên sản phẩm.
   - `slug` — tự sinh từ tên (bỏ dấu, gạch ngang); **bất biến sau lần lưu đầu tiên** (mục III).
   - `sku`.
   - `brand_names` — mảng, UI = dropdown gộp mọi thương hiệu đang có trên các sản phẩm khác
     + ô nhập tự do để thêm thương hiệu mới. **Không có trang quản lý thương hiệu riêng** (theo
     yêu cầu khách): danh sách thương hiệu luôn suy ra từ `brand_names` của toàn bộ sản phẩm,
     đúng như `build.mjs` đang làm để dựng trang `/thuong-hieu/`.
   - `categories` — chọn nhiều, từ `data/product-categories.json`. Lưu `[{id, name, slug}]`
     (giữ nguyên hình dạng dữ liệu WooCommerce cũ để `build.mjs` không phải đổi).
   - `prices.regular_price` (giá gốc) + `prices.price` (giá bán) — nhập số nguyên VND.
   - `short_description` — TinyMCE rút gọn (1 đoạn mô tả ngắn).
   - `description` — TinyMCE đầy đủ (nội dung chi tiết, có chèn ảnh).
   - `images` — thư viện ảnh riêng của sản phẩm: upload nhiều ảnh, xoá từng ảnh, ảnh đầu tiên
     là ảnh đại diện. Lưu `[{src, thumbnail, alt}]`.
2. Field KHÔNG có ô nhập — server tự suy lúc Lưu:
   - `id` = max(id hiện có) + 1 (bất biến sau khi tạo).
   - `permalink` = `san-pham.html?slug=<slug>` (giữ nguyên format cũ, `build.mjs` tự chuyển).
   - `on_sale` = `price < regular_price`.
   - `prices.sale_price` = `price`; các field tiền tệ khác giữ hằng số VND như dữ liệu hiện có.
   - `price_html` = markup giá theo đúng mẫu WooCommerce đang dùng.
   - `average_rating` = `"0"`, `review_count` = `0` cho sản phẩm mới.
   - `alt` của mỗi ảnh gallery = tên sản phẩm nếu để trống.
   - `updated_at` (ISO) — dùng làm version cho cache client (mục 9c playbook).
3. Danh sách trong Admin: tải qua GAS đọc **GitHub Contents API** (`data/products.json`) — luôn
   là dữ liệu mới nhất, không phụ thuộc CI đã build xong hay chưa.
4. Ảnh:
   - Nén phía client bằng canvas trước khi upload: cạnh dài tối đa **1600px**, JPEG chất lượng
     **0.85** (giữ PNG nếu ảnh có nền trong suốt).
   - Upload **thẳng lên GitHub ngay khi chọn ảnh** (không qua Drive) — phương án (b) mục 4
     playbook.
   - Ảnh **riêng 1-1 theo bản ghi**: `html/assets/images/products/<slug>/NN.jpg` (NN bất biến,
     ảnh mới lấy số tiếp theo) → an toàn để đồng bộ xoá theo bản ghi (mục IV).
   - Ảnh cũ (dữ liệu clone từ site gốc) nằm phẳng ở `html/assets/images/products/*.webp` — giữ
     nguyên đường dẫn, KHÔNG di chuyển, KHÔNG bị xoá bởi cơ chế đồng bộ (chỉ đồng bộ xoá trong
     đúng thư mục `products/<slug>/`).
   - Ảnh chèn trong content: nút toolbar `quickimage` mở thẳng file picker, chèn trong
     `<figure class="wp-block-image size-large">` + `<figcaption>` placeholder; `alt`/`title` =
     caption, rơi về **tên sản phẩm / tiêu đề bài** nếu caption rỗng; caption còn placeholder
     thì xoá thẻ `<figcaption>` lúc Lưu (mục 4b playbook).
   - **Đường dẫn ảnh trong data luôn TUYỆT ĐỐI từ gốc domain** (`/assets/images/...`) — toàn bộ
     site đang dùng quy ước này, nên KHÔNG có vấn đề độ sâu tương đối (gotcha #14 không áp dụng).
     Trong editor, `/assets/...` được đổi sang URL tuyệt đối để xem được (mục III).

## III. Sửa sản phẩm / tin tức / video / danh mục

- `slug` bất biến sau lần lưu đầu: server `throw` nếu `existing.slug !== rec.slug`, client
  `disabled` ô slug khi mở bản ghi đã tồn tại (nhớ bật lại khi mở form tạo mới).
- Muốn đổi URL: xoá bản ghi cũ, tạo bản ghi mới.
- Ảnh hiển thị trong editor dùng URL **tuyệt đối**: `https://raw.githubusercontent.com/<owner>/
  <repo>/<branch>/html/assets/images/...` (repo public, thấy ảnh ngay sau khi commit, không cần
  đợi build/deploy). Ảnh vừa upload trong phiên hiện tại hiển thị bằng blob URL local.
  Lúc LƯU, mọi URL tuyệt đối này được đổi ngược về `/assets/images/...` — data không bao giờ
  chứa domain.

## IV. Xoá

- Xoá sản phẩm: xoá `data/products/<slug>.json` + gỡ khỏi `data/products.json` + xoá thư mục
  `html/assets/images/products/<slug>/` (an toàn vì ảnh riêng 1-1). KHÔNG đụng ảnh phẳng cũ.
- Xoá tin tức: tương tự với `data/news/<slug>.json`, `data/news.json`,
  `html/assets/images/blog/<slug>/`.
- Xoá danh mục sản phẩm: chặn nếu còn sản phẩm thuộc danh mục đó (báo rõ số lượng), chặn nếu
  còn danh mục con.
- Xoá danh mục tin tức: chặn nếu còn bài viết thuộc danh mục đó.
- Xoá video: gỡ khỏi `data/videos.json` + xoá `html/assets/images/videos/<slug>.jpg`.
- Mọi thao tác xoá phải qua modal xác nhận (mục VII). Không hoàn tác được.

## V. Tin tức

`data/news.json` (index) + `data/news/<slug>.json` (đầy đủ, chứa `body`).

1. Field có ô nhập: `title`, `slug` (bất biến), `date` (`input type=date`, lưu `YYYY-MM-DD`),
   `excerpt` (textarea thuần), `heroImg` (upload 1 ảnh), `categories` (chọn nhiều từ
   `data/news-categories.json`), `tags` (nhập tự do + gợi ý từ tag đã có), `body` (TinyMCE).
2. Server tự suy: `views` (mặc định `0`, build render `"N lượt xem"`), `updated_at`.
3. Tag KHÔNG có trang quản lý riêng (giống thương hiệu): lúc Lưu, server slugify tên tag và
   upsert vào `data/news-tags.json`.
4. `date` lưu chuẩn ISO `YYYY-MM-DD`; `build.mjs` render ra `dd/mm/yyyy` như site đang hiển thị.

## VI. Danh mục

- **Danh mục sản phẩm** (`data/product-categories.json`): `id` (auto), `name`, `slug` (bất biến),
  `parent` (0 = gốc, hoặc id danh mục cha — chỉ cho 2 cấp), `banner` (upload 1 ảnh),
  `description` (TinyMCE, có thể rỗng). `count` KHÔNG lưu — `build.mjs` tự đếm từ sản phẩm.
  File này gộp luôn vai trò `CATEGORY_META` cũ (banner + description).
- **Danh mục tin tức** (`data/news-categories.json`): `name`, `slug` (bất biến). `count` tự đếm.

## VII. Video

`data/videos.json` (1 file duy nhất, không có file chi tiết riêng).

- Field: `title`, `slug` (bất biến), `youtube` (dán URL hoặc ID, server tự bóc ID 11 ký tự),
  `description` (textarea), `date` (`YYYY-MM-DD`), `thumb`.
- **Chỉ nhúng YouTube, không upload video thật** (yêu cầu khách).
- `thumb`: mặc định server tự tải `https://img.youtube.com/vi/<id>/hqdefault.jpg` về
  `html/assets/images/videos/<slug>.jpg`; cho phép upload ảnh khác đè lên.
- `views` server tự suy (mặc định 0).

## VIII. Đơn hàng (chỉ trong bảng dữ liệu, KHÔNG lên GitHub)

- Trang `/thanh-toan/` gửi đơn thật qua `fetch()` tới `/exec` (`doPost`, `action=order`,
  `Content-Type: text/plain;charset=utf-8` để né CORS preflight).
- Sheet `Orders`, cột: `code`, `created_at`, `name`, `phone`, `email`, `province`, `ward`,
  `address`, `note`, `payment_method`, `items_json`, `subtotal`, `shipping`, `total`, `status`,
  `updated_at`.
- `code` = **đúng mã 6 chữ cái đang hiển thị ở khung chuyển khoản của trang `/thanh-toan/`**
  (client gửi lên trong `payload.code`) — thiếu hoặc trùng thì server tự sinh `DH` + yymmdd + 4 số.
  Lý do: khách ghi mã đó vào nội dung chuyển khoản, mã trong đơn phải khớp thì mới đối soát được.
- `status` (enum cố định): `new` | `confirmed` | `shipping` | `done` | `cancelled`.
- Chống spam: honeypot field `_hp` (ẩn bằng CSS) + rate-limit **20 giây**/số điện thoại
  (`CacheService`) + `LockService` khi ghi Sheet.
- Thông báo đơn mới qua **email** tới `EMAIL_NOTIFY` (nhiều địa chỉ thì ngăn cách bằng dấu phẩy).
  Quota gửi mail (100/ngày với tài khoản thường) **dùng chung với mã OTP đăng nhập**, nên hàm
  `notify_` tự **ngừng gửi mail báo đơn khi quota còn <= 20** (`MAIL_RESERVE_FOR_OTP`) — không
  bao giờ được để mail báo đơn ăn hết quota rồi khoá cả nhà ra khỏi trang quản trị. Chưa cấu
  hình `EMAIL_NOTIFY` thì bỏ qua im lặng, đơn vẫn lưu đủ.
- Vị trí trong menu Admin: **ngay TRÊN mục Người dùng** (yêu cầu khách).

## IX. Liên hệ

**Không áp dụng ở giai đoạn này** (khách chưa yêu cầu quản trị form liên hệ). Form `/lien-he/`
vẫn là bản demo cũ. Khi cần: thêm `action=contact` vào `doPost`, sheet `Contacts`
(`created_at`, `name`, `phone`, `email`, `subject`, `message`, `status`), dùng lại nguyên cơ chế
chống spam của đơn hàng (honeypot `_hp` + rate-limit 20s) và thêm 1 tab trong Admin.

## X. Người dùng

- Sheet `Users`, cột: `email`, `role`, `name`, `created_at`.
- Chỉ `admin`/`root` thao tác. Không hiển thị dòng `root` trong UI. Server chặn tự hạ quyền/tự
  xoá chính mình (`if (email === me.email) throw`).

## XI. UX chung (áp cho MỌI thao tác trong Admin)

- 2 modal riêng, không `alert()`/`confirm()` native, không toast tự ẩn:
  `showConfirm(message)` (Huỷ/Đồng ý, hỏi TRƯỚC khi xử lý) và `showAlert(message, type, note)`
  (1 nút Đóng, hiện SAU khi xử lý). Sau mọi mutation thành công dùng `showSyncAlert()` kèm ghi
  chú "Cần khoảng 1–2 phút để website cập nhật xong".
- Mọi nút async: `withLoading(btn, fn)` — disable + spinner, tự phục hồi trong `finally`.
- Sau khi Lưu thành công → quay lại danh sách của chính entity đó.
- Chuyển tab chỉ là hiệu ứng giao diện: không tải lại trang, render ngay từ dữ liệu đã có
  (localStorage) rồi làm mới ngầm.
- Đăng nhập/mở Admin: **1 round-trip `boot(token)` duy nhất** trả `{me, appHtml, products,
  productCategories, news, newsCategories, newsTags, videos, brands, repo}`; đơn hàng/liên hệ/
  người dùng tải riêng khi mở tab (dữ liệu riêng tư, không cần cho lần render đầu).
- Stale-while-revalidate: render ngay từ cache localStorage, rồi `boot()` ngầm làm mới. Mọi
  mutation tự đồng bộ lại cache ngay (`syncBootCache_`), không đợi lần mở trang sau.
- **Mọi key localStorage (TRỪ token) mang hậu tố `CLIENT_BUILD`** + hàm `purgeStaleCaches_()`
  dọn key khác phiên bản lúc tải script. **BẮT BUỘC bump `CLIENT_BUILD` mỗi lần sửa
  `app.html`/`js.html`.**
- TinyMCE chỉ `init` SAU KHI khung chứa nó đã hiện (gotcha #24), nhớ cờ đã-init để không init lặp.

## XII. TinyMCE — tự host trên chính website, dùng lại ở Admin

Yêu cầu khách: **thư viện TinyMCE nằm trên website gốc, Admin nạp lại từ đó** (không dùng CDN
bên thứ ba, không cần API key Tiny Cloud).

- Thư viện: TinyMCE 7 community (GPL), giải nén vào `html/assets/tinymce/` (commit vào repo,
  Cloudflare Pages phục vụ như tài nguyên tĩnh).
- Admin nạp bằng `<script src="https://dolphinhouse.vn/assets/tinymce/tinymce.min.js">`;
  TinyMCE tự suy `baseURL` từ chính src đó nên skin/plugin/icon đều tải từ domain khách.
- `license_key: 'gpl'` (bắt buộc với bản community v7, nếu thiếu editor sẽ báo cảnh báo).
- URL này lấy từ Script Property `SITE_URL` (không hard-code trong `app.html`).
- Cấu hình: `plugins: 'lists link image table code paste autolink'`,
  `toolbar: 'undo redo | blocks | bold italic | bullist numlist | link quickimage table | code'`,
  `automatic_uploads: false`, `paste_data_images: true`, `relative_urls: false`,
  `content_css` = `https://dolphinhouse.vn/css/styles.css` (soạn thảo thấy đúng style site thật).

## XII-b. Text thuần vs HTML — nơi escape

- Mọi field text thuần (tên sản phẩm, SKU, tên thương hiệu, tên danh mục, tiêu đề bài/video, mô
  tả ngắn bài viết, `alt` ảnh) lưu trong `data/` ở dạng **text thuần đúng như người dùng gõ** —
  KHÔNG escape khi lưu.
- Việc escape HTML xảy ra **đúng một chỗ**: `html/scripts/lib/cms-data.mjs` (hàm `escText`), nơi
  mọi generator lấy dữ liệu vào. Nhờ vậy không template nào phải tự nhớ escape, và một sản phẩm
  tên `Bộ nồi "A & B"` không thể làm vỡ trang.
- `description`/`short_description`/`body` là **HTML thật** (từ trình soạn thảo) — KHÔNG escape,
  chỉ chuẩn hoá đường dẫn ảnh về `/assets/...`.
- Dữ liệu clone cũ từ WooCommerce trộn lẫn 2 kiểu (tên danh mục nhúng trong sản phẩm bị escape
  sẵn) — đã chuẩn hoá về text thuần một lần bằng `html/scripts/migrate-to-data.mjs`.

## XIII. Kiến trúc lưu trữ (TÊN CỐ ĐỊNH — đổi phải sửa luôn `build.mjs` + CI)

**Google Sheet** `Dolphin House CMS` (tự tạo lần đầu, id lưu vào `SPREADSHEET_ID`):

| Sheet | Cột |
|---|---|
| `Users` | email, role, name, created_at |
| `Orders` | code, created_at, name, phone, email, province, ward, address, note, payment_method, items_json, subtotal, shipping, total, status, updated_at |
| `Contacts` | created_at, name, phone, email, subject, message, status |

**GitHub** (`tranquanghuy-rightsvn/dolphinhouse`, branch `master`):

| Đường dẫn | Vai trò | Ghi chú |
|---|---|---|
| `data/products.json` | index sản phẩm | **commit CHỐT** của mọi thao tác sản phẩm |
| `data/products/<slug>.json` | 1 sản phẩm đầy đủ | |
| `data/product-categories.json` | toàn bộ danh mục sản phẩm | vừa là index vừa là chi tiết |
| `data/news.json` | index tin tức | **commit CHỐT** |
| `data/news/<slug>.json` | 1 bài đầy đủ (có `body`) | |
| `data/news-categories.json` | danh mục tin tức | |
| `data/news-tags.json` | tag tin tức | ghi TRƯỚC `data/news.json` |
| `data/videos.json` | toàn bộ video | **commit CHỐT** |
| `html/assets/images/products/<slug>/NN.jpg` | ảnh sản phẩm CMS | |
| `html/assets/images/blog/<slug>/NN.jpg` | ảnh bài viết CMS | |
| `html/assets/images/categories/<slug>.jpg` | banner danh mục | |
| `html/assets/images/videos/<slug>.jpg` | thumb video | |

- File index LUÔN ghi SAU CÙNG trong mỗi thao tác (là file trigger CI).
- Độ trễ Lưu → thấy trên site thật: ~1–2 phút (Actions build + Pages deploy).

## XIV. Trang quản trị trên domain khách

- `/admin/` — **nhúng web app GAS bằng iframe** (không redirect): giấu thanh cảnh báo của
  Google (cắt 25px bằng CSS) + thanh địa chỉ luôn là dolphinhouse.vn. Tự phát hiện treo sau 12s
  → hiện lớp thông báo (z-index dương, ĐÈ LÊN iframe) chỉ sang `/admin-gas/`.
- `/admin-gas/` — đường lui, redirect thẳng ra `/exec` (bắt buộc có: nhúng KHÔNG chạy trên
  trình duyệt đang đăng nhập tài khoản Google Workspace của tổ chức).
- Cả 2 trang: `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet,
  noimageindex">` + `<meta name="referrer" content="no-referrer">` + header `X-Robots-Tag`
  khai trong `html/_headers`. **TUYỆT ĐỐI KHÔNG khai `Disallow` trong `robots.txt`.**
- URL `/exec` khai **đúng 1 chỗ duy nhất cho cả site**: `html/js/cms-config.js`
  (`window.DH_CMS_URL`) — dùng chung cho `/admin/`, `/admin-gas/` và form đặt hàng ở
  `/thanh-toan/`. 3 file này là tài nguyên tĩnh, KHÔNG generate bằng `build.mjs` (gotcha #21).

## XV. Giấu hạ tầng

Không nhắc "Sheet/Drive/Apps Script/GitHub" trong bất kỳ chữ nào gửi xuống trình duyệt — kể cả
comment trong `app.html`/`js.html`/`css.html`/`index.html` và **chuỗi lỗi `throw` từ `Code.js`**.
Kiểm trước mỗi lần deploy (phải không ra kết quả):

```
grep -niE 'sheet|spreadsheet|drive|apps script|github' gas/app.html gas/js.html gas/index.html gas/css.html
```

## XVI. Script Properties (TÊN CỐ ĐỊNH)

| Tên | Bắt buộc | Ghi chú |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | PAT (fine-grained) có quyền Contents: Read and write trên đúng repo |
| `GITHUB_OWNER` | ✅ | `tranquanghuy-rightsvn` |
| `GITHUB_REPO` | ✅ | `dolphinhouse` |
| `GITHUB_BRANCH` | ✅ | `master` |
| `SITE_URL` | ✅ | `https://dolphinhouse.vn` (dùng cho TinyMCE + link xem trước) |
| `SPREADSHEET_ID` | ❌ | code tự tạo lần đầu và tự lưu lại |
| `EMAIL_NOTIFY` | ❌ | nhận email báo đơn hàng mới; nhiều địa chỉ ngăn cách bằng dấu phẩy |

## XVII. CI/CD

- `.github/workflows/build.yml` chạy `node scripts/build.mjs` (trong `html/`) rồi commit lại
  `html/`. Cloudflare Pages tự deploy commit đó.
- Trigger CHỈ ở các file index (commit chốt của mọi thao tác CMS): `data/products.json`,
  `data/product-categories.json`, `data/news.json`, `data/news-categories.json`,
  `data/videos.json` — cộng `html/scripts/**` (khi đổi code build). KHÔNG trigger theo `data/**`
  (sẽ build ở commit dở dang).
- Workflow tự `git pull --rebase` trước khi push, phòng trường hợp CMS ghi tiếp trong lúc build.

## XVIII. Bug đã gặp ở dự án này

1. **Trang bài viết đã xoá vẫn sống mãi trên site.** Bài viết nằm ở gốc (`/<slug>/`), mà
   `clean()` của `build.mjs` chỉ xoá thư mục của các bài ĐANG CÒN → xoá bài qua CMS chỉ mất bản
   ghi trong `data/`, trang cũ vẫn truy cập và index được. Vá: `pruneOrphanPostDirs()` trong
   `build.mjs` — mọi thư mục ở gốc có `index.html` mà không thuộc `OUT_DIRS`, không phải bài
   hiện có, không nằm trong `NON_BUILD_DIRS` (`assets/ css/ js/ docs/ scripts/ admin/
   admin-gas/`) thì xoá. **Thêm thư mục gốc mới cho site thì phải khai vào `NON_BUILD_DIRS`.**
2. **Text người dùng nhập làm vỡ HTML.** Pipeline gốc nội suy thẳng tên sản phẩm/danh mục vào
   HTML mà không escape (dữ liệu clone không có ký tự đặc biệt nên không lộ ra). Mở CMS cho
   người dùng tự gõ thì một dấu `"` hay `&` là hỏng thẻ. Vá: escape tập trung tại
   `cms-data.mjs` — xem mục XII-b.
