# Triển khai CMS cho dolphinhouse.vn — làm một lần, theo đúng thứ tự

Quyết định nghiệp vụ nằm ở [`GAS.md`](GAS.md). File này chỉ là các bước bấm tay để đưa hệ thống
lên chạy thật.

```
Admin (dolphinhouse.vn/admin)  →  dịch vụ quản trị (web app)  →  data/*.json trong repo
                                                              →  GitHub Actions build html/
                                                              →  Cloudflare Pages deploy
```

---

## 0. Những gì đã có sẵn trong repo

| Đường dẫn | Vai trò |
|---|---|
| `data/**.json` | **Nguồn chân lý nội dung** — chỉ CMS ghi. Đã migrate xong từ dữ liệu clone cũ. |
| `html/scripts/build.mjs` + `html/scripts/lib/cms-data.mjs` | Sinh toàn bộ `html/**` từ `data/`. |
| `html/scripts/migrate-to-data.mjs` | Script migrate **một lần** (đã chạy). Chỉ chạy lại với `--force` nếu muốn dựng lại `data/` từ đầu — sẽ **mất hết** nội dung khách đã nhập qua CMS. |
| `html/admin/`, `html/admin-gas/` | 2 trang quản trị trên domain khách. |
| `html/js/cms-config.js` | **Nơi duy nhất** khai địa chỉ dịch vụ quản trị. |
| `html/assets/tinymce/` | Thư viện soạn thảo tự host (Admin nạp lại từ đây). |
| `html/scripts/make-responsive-images.mjs` | Tạo bản ảnh nhỏ (`-mobile` 900px, `-tablet` 1100px) cho ảnh banner. Chạy tay khi đổi ảnh banner: `cd html && node scripts/make-responsive-images.mjs`; kết quả commit vào repo nên CI không cần công cụ ảnh. |
| `.github/workflows/build.yml` | CI build + commit `html/`. |
| `gas/` | Mã nguồn dịch vụ quản trị. **Không nằm trong git** (`.gitignore`) — deploy bằng clasp. |

`gas/` gồm: `Code.js`, `index.html`, `app.html`, `css.html`, `js.html`, `appsscript.json`.

---

## 1. Tạo project Apps Script và đẩy mã lên

```bash
npm install -g @google/clasp     # nếu chưa có
clasp login                       # đăng nhập bằng tài khoản Google sẽ SỞ HỮU hệ thống
cd gas
clasp create --type webapp --title "Dolphin House CMS"   # tạo .clasp.json
clasp push -f
```

> Tài khoản đăng nhập ở bước này **luôn là quản trị cao nhất** (`root`) và không bao giờ bị khoá
> ra ngoài, kể cả khi danh sách người dùng trống.

## 2. Điền cấu hình (Project Settings → Script Properties)

| Tên | Giá trị | Bắt buộc |
|---|---|---|
| `GITHUB_TOKEN` | Personal access token (fine-grained), quyền **Contents: Read and write** trên đúng repo `dolphinhouse` | ✅ |
| `GITHUB_OWNER` | `tranquanghuy-rightsvn` | ✅ |
| `GITHUB_REPO` | `dolphinhouse` | ✅ |
| `GITHUB_BRANCH` | `master` | ✅ |
| `SITE_URL` | `https://dolphinhouse.vn` | ✅ |
| `SPREADSHEET_ID` | **để trống** — hệ thống tự tạo kho dữ liệu lần chạy đầu và tự lưu lại | ❌ |
| `EMAIL_NOTIFY` | Email nhận thông báo đơn hàng mới (nhiều địa chỉ ngăn cách bằng dấu phẩy) | ❌ |

## 3. Deploy web app

Deploy → New deployment → **Web app**:

- Execute as: **Me**
- Who has access: **Anyone** (bắt buộc: trang đặt hàng của khách gọi vào đây mà không đăng nhập)

Copy URL kết thúc bằng `/exec`.

> **Từ lần sửa mã thứ 2 trở đi**: luôn dùng *Manage deployments → Edit (bút chì) → Version: New
> version → Deploy*. Nếu bấm "New deployment" sẽ sinh URL mới và site vẫn gọi URL cũ (mã cũ vẫn
> chạy song song, rất khó phát hiện).

## 4. Gắn URL vào website — ĐÃ XONG

`html/js/cms-config.js` đã được điền URL thật (deployment ngày 08/09/2026). Chỉ làm lại bước này
nếu sau này sinh ra URL `/exec` MỚI:

```js
window.DH_CMS_URL = "https://script.google.com/macros/s/AKfy.../exec";
```

Rồi build lại và commit:

```bash
cd html && node scripts/build.mjs && cd ..
git add -A && git commit -m "Point site at the content service" && git push
```

## 5. Cấp quyền lần đầu

Mở `https://dolphinhouse.vn/admin` → nhập email chủ script → nhận mã 6 số → đăng nhập.
Vào tab **Người dùng** để thêm `admin` / `editor` cho khách. Không cần (và không nên) thêm chính
tài khoản chủ vào danh sách này.

Lần chạy đầu Google sẽ hỏi cấp quyền (gửi mail, gọi mạng, bảng tính) — nếu chưa thấy hộp thoại,
mở editor Apps Script chạy thử một hàm bất kỳ để kích hoạt màn hình cấp quyền.

---

## Kiểm tra bắt buộc trước khi bàn giao

- [ ] Đăng nhập được `/admin` → **F5 lại không phải nhập OTP lần nữa** (nếu phải nhập lại, trình
      duyệt đang chặn lưu trữ trong khung nhúng → dùng `/admin-gas/` thay thế).
- [ ] `/admin-gas/` mở được (đường lui cho trình duyệt đang đăng nhập tài khoản tổ chức).
- [ ] Lưu thử 1 sản phẩm nháp → xem Actions chạy xanh → sau ~1–2 phút thấy trên site thật.
- [ ] Chèn ảnh trong nội dung → F12 xem `src` **đã lưu** phải là `/assets/images/...`, không phải
      URL tuyệt đối.
- [ ] Xoá sản phẩm/bài viết nháp → trang tương ứng biến mất khỏi site sau build kế tiếp.
- [ ] Đặt thử 1 đơn ở `/thanh-toan/` → hiện trong tab Đơn hàng, mã đơn khớp mã ghi ở khung
      chuyển khoản.
- [ ] `curl -s https://dolphinhouse.vn/css/styles.css | grep -c hp-field` → phải khác 0 (mất rule
      này thì ô bẫy bot hiện ra và mọi đơn hàng thật sẽ bị **âm thầm** loại bỏ).
- [ ] `curl -sI https://dolphinhouse.vn/admin/ | grep -i x-robots-tag` → phải có `noindex`.
- [ ] `robots.txt` **không** khai `/admin` (cố ý — file đó công khai, khai ra là tự chỉ đường).

## Mỗi lần sửa mã trong `gas/`

1. `cd gas && clasp push -f`
2. Deploy → Manage deployments → Edit → **New version** → Deploy
3. Nếu có sửa `app.html` hoặc `js.html`: **bump `CLIENT_BUILD` trong `js.html`** (dòng đầu file).
   Quên bump thì khách vẫn thấy giao diện cũ do bộ nhớ tạm của trình duyệt, và không có cách nào
   tự thoát ngoài việc xoá tay — điều không được phép xảy ra.

## Giới hạn cần biết

- Gmail gửi tối đa **100 mail/ngày** (tài khoản thường), dùng chung cho mã đăng nhập và email
  báo đơn hàng. Hệ thống tự ngừng gửi mail báo đơn khi quota còn <= 20 để luôn chừa chỗ cho mã
  đăng nhập (đơn vẫn lưu đủ, chỉ là không có mail báo). Nếu ngày nào đó đơn về nhiều hơn mức
  này, chuyển sang tài khoản Google Workspace (1.500 mail/ngày).
- Mỗi lần lưu tạo vài commit (ảnh + chi tiết + index) — bình thường ở quy mô này.
- Sheets + khoá ghi đủ cho vài đơn/giây. Nếu có đợt dồn đơn rất lớn (flash sale) thì phần đặt
  hàng nên tách sang backend riêng.
