const { sandbox, repo, props } = require('./harness.js');
const S = sandbox;

let failed = 0;
function check(name, fn) {
  try { fn(); console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + ' → ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }

// config
props.set('GITHUB_OWNER', 'o'); props.set('GITHUB_REPO', 'r'); props.set('GITHUB_BRANCH', 'master');
props.set('GITHUB_TOKEN', 't'); props.set('SITE_URL', 'https://dolphinhouse.vn');

const b64 = (o) => Buffer.from(JSON.stringify(o, null, 2) + '\n', 'utf8').toString('base64');
repo.set('data/products.json', b64([]));
repo.set('data/product-categories.json', b64([{ id: 1, name: 'Đồ dùng nhà bếp', slug: 'do-dung-nha-bep', parent: 0 }]));
repo.set('data/news.json', b64([]));
repo.set('data/news-categories.json', b64([{ name: 'Kinh nghiệm', slug: 'kinh-nghiem' }]));
repo.set('data/news-tags.json', b64([]));
repo.set('data/videos.json', b64([]));

// an owner session token, as verifyOtp would mint
const sessionToken = 'session-uuid';
props.set('tok_' + sessionToken, JSON.stringify({ email: 'owner@example.com', exp: Date.now() + 1000000 }));

console.log('\n— khoá kết nối —');
let key;
check('createApiKey trả về khoá dhk_', () => {
  const res = S.createApiKey(sessionToken, 'Máy ở nhà');
  key = res.key;
  assert(/^dhk_[0-9a-f]{64}$/.test(key), 'định dạng khoá: ' + key);
  assert(res.list.length === 1, 'danh sách khoá');
});
check('khoá đóng vai editor, không phải admin', () => {
  const me = S.whoAmI_(key);
  assert(me.role === 'editor', me.role);
  let threw = false;
  try { S.listUsers(key); } catch (e) { threw = true; }
  assert(threw, 'listUsers phải bị chặn');
});
check('khoá lạ bị từ chối', () => {
  const r = S.handleApi_({ key: 'dhk_deadbeef', action: 'ping' }, 'POST');
  assert(r.ok === false && /không còn hiệu lực/i.test(r.error), JSON.stringify(r));
});
check('thiếu khoá bị từ chối', () => {
  const r = S.handleApi_({ action: 'product.list' }, 'GET');
  assert(r.ok === false && /Thiếu "key"/.test(r.error), JSON.stringify(r));
});
check('action lạ báo rõ', () => {
  const r = S.handleApi_({ key, action: 'product.nuke' }, 'POST');
  assert(r.ok === false && /không tồn tại/.test(r.error), JSON.stringify(r));
});
check('GET không chạy được lệnh ghi', () => {
  const r = S.handleApi_({ key, action: 'product.create', name: 'x' }, 'GET');
  assert(r.ok === false && /POST/.test(r.error), JSON.stringify(r));
});
check('ping trả về danh sách action', () => {
  const r = S.handleApi_({ key, action: 'ping' }, 'GET');
  assert(r.ok && r.data.actions.indexOf('product.create') !== -1, JSON.stringify(r));
});

console.log('\n— sản phẩm —');
check('product.create lưu bản ghi + index + ảnh tải từ xa', () => {
  const r = S.handleApi_({
    key, action: 'product.create',
    name: 'Chảo chống dính Steiger 28cm', sku: 'ST-CH28',
    regular_price: 890000, price: '790.000đ',
    categories: ['do-dung-nha-bep'], brand_names: ['Steiger'],
    short_description: '<p>Đáy từ</p>', description: '<h2>Nổi bật</h2>',
    images: ['https://anh.example/a.jpg', { url: 'https://anh.example/b.png', alt: 'mặt sau' }]
  }, 'POST');
  assert(r.ok, JSON.stringify(r));
  const rec = r.data.record;
  assert(rec.slug === 'chao-chong-dinh-steiger-28cm', rec.slug);
  assert(rec.prices.price === '790000', rec.prices.price);
  assert(rec.prices.regular_price === '890000', rec.prices.regular_price);
  assert(rec.on_sale === true, 'on_sale');
  assert(rec.categories[0].id === 1, 'category id');
  assert(rec.images.length === 2, 'số ảnh');
  assert(rec.images[0].src === '/assets/images/products/chao-chong-dinh-steiger-28cm/01.jpg', rec.images[0].src);
  assert(rec.images[1].alt === 'mặt sau', rec.images[1].alt);
  assert(repo.has('html/assets/images/products/chao-chong-dinh-steiger-28cm/01.jpg'), 'ảnh 01 chưa lưu');
  assert(repo.has('data/products/chao-chong-dinh-steiger-28cm.json'), 'file chi tiết');
  assert(r.data.url === 'https://dolphinhouse.vn/san-pham/chao-chong-dinh-steiger-28cm/', r.data.url);
});
check('tạo trùng slug bị chặn kèm gợi ý', () => {
  const r = S.handleApi_({ key, action: 'product.create', name: 'Chảo chống dính Steiger 28cm' }, 'POST');
  assert(r.ok === false && /product\.update/.test(r.error), JSON.stringify(r));
});
check('danh mục không tồn tại báo rõ', () => {
  const r = S.handleApi_({ key, action: 'product.create', name: 'Nồi X', categories: ['khong-co'] }, 'POST');
  assert(r.ok === false && /category\.list/.test(r.error), JSON.stringify(r));
});
check('product.update chỉ đổi field được gửi', () => {
  const r = S.handleApi_({ key, action: 'product.update', slug: 'chao-chong-dinh-steiger-28cm', price: 690000 }, 'POST');
  assert(r.ok, JSON.stringify(r));
  const rec = r.data.record;
  assert(rec.prices.price === '690000', rec.prices.price);
  assert(rec.name === 'Chảo chống dính Steiger 28cm', 'tên bị mất');
  assert(rec.images.length === 2, 'ảnh bị mất: ' + rec.images.length);
  assert(rec.sku === 'ST-CH28', 'sku bị mất');
  assert(rec.categories.length === 1, 'danh mục bị mất');
  assert(repo.has('html/assets/images/products/chao-chong-dinh-steiger-28cm/02.png'), 'ảnh bị xoá oan');
});
check('product.update báo lỗi khi không có bản ghi', () => {
  const r = S.handleApi_({ key, action: 'product.update', slug: 'khong-co-dau', price: 1 }, 'POST');
  assert(r.ok === false && /product\.create/.test(r.error), JSON.stringify(r));
});
check('sizes: kích cỡ đầu tiên quyết định giá', () => {
  const r = S.handleApi_({
    key, action: 'product.create', name: 'Bộ nồi inox 3 đáy',
    sizes: [{ name: '16cm', price: 590000, regular_price: 690000 }, { name: '20cm', price: 790000 }]
  }, 'POST');
  assert(r.ok, JSON.stringify(r));
  assert(r.data.record.prices.price === '590000', r.data.record.prices.price);
  assert(r.data.record.sizes.length === 2, 'số kích cỡ');
  assert(r.data.record.sizes[1].regular_price === '790000', 'giá gốc mặc định');
});
check('kích cỡ thiếu giá bị chặn', () => {
  const r = S.handleApi_({ key, action: 'product.create', name: 'Nồi lỗi', sizes: [{ name: 'M' }] }, 'POST');
  assert(r.ok === false && /chưa có giá bán/.test(r.error), JSON.stringify(r));
});
check('product.list lọc không dấu + phân trang', () => {
  const r = S.handleApi_({ key, action: 'product.list', q: 'chao chong dinh' }, 'GET');
  assert(r.ok && r.data.items.length === 1, JSON.stringify(r.data));
  const r2 = S.handleApi_({ key, action: 'product.list', category: 'do-dung-nha-bep' }, 'GET');
  assert(r2.data.items.length === 1, 'lọc danh mục');
  const r3 = S.handleApi_({ key, action: 'product.list', limit: '1' }, 'GET');
  assert(r3.data.items.length === 1 && r3.data.total === 2, JSON.stringify(r3.data));
});
check('product.get trả bản ghi đầy đủ', () => {
  const r = S.handleApi_({ key, action: 'product.get', slug: 'chao-chong-dinh-steiger-28cm' }, 'GET');
  assert(r.ok && r.data.description === '<h2>Nổi bật</h2>', JSON.stringify(r).slice(0, 200));
});
check('brand.list gom thương hiệu', () => {
  const r = S.handleApi_({ key, action: 'brand.list' }, 'GET');
  assert(r.ok && r.data.items.indexOf('Steiger') !== -1, JSON.stringify(r.data));
});

console.log('\n— ảnh —');
check('image.upload nhận base64 kèm tiền tố data:', () => {
  const data = 'data:image/png;base64,' + Buffer.from('PNG').toString('base64');
  const r = S.handleApi_({ key, action: 'image.upload', kind: 'product', slug: 'chao-chong-dinh-steiger-28cm', data, filename: 'x.png' }, 'POST');
  assert(r.ok, JSON.stringify(r));
  assert(r.data.path === '/assets/images/products/chao-chong-dinh-steiger-28cm/03.png', r.data.path);
  assert(r.data.url === 'https://dolphinhouse.vn' + r.data.path, r.data.url);
});
check('image.upload thiếu nguồn báo lỗi', () => {
  const r = S.handleApi_({ key, action: 'image.upload', kind: 'product', slug: 'a-b' }, 'POST');
  assert(r.ok === false && /url/.test(r.error), JSON.stringify(r));
});
check('ảnh tải về không được báo lỗi rõ', () => {
  const r = S.handleApi_({ key, action: 'image.upload', kind: 'news', slug: 'bai-viet', url: 'https://anh.example/missing.jpg' }, 'POST');
  assert(r.ok === false && /Không tải được ảnh/.test(r.error), JSON.stringify(r));
});
check('đường dẫn /assets có sẵn được giữ nguyên', () => {
  const r = S.handleApi_({ key, action: 'product.update', slug: 'chao-chong-dinh-steiger-28cm',
    images: ['/assets/images/products/chao-chong-dinh-steiger-28cm/01.jpg'] }, 'POST');
  assert(r.ok, JSON.stringify(r));
  assert(r.data.record.images.length === 1, 'số ảnh');
  assert(!repo.has('html/assets/images/products/chao-chong-dinh-steiger-28cm/02.png'), 'ảnh thừa chưa được dọn');
});

console.log('\n— tin tức, danh mục, video —');
check('news.create + tag tự tạo', () => {
  const r = S.handleApi_({
    key, action: 'news.create', title: '5 mẹo giữ chảo bền lâu',
    excerpt: 'Vài thói quen nhỏ.', categories: ['kinh-nghiem'], tags: ['chảo chống dính'],
    heroImg: 'https://anh.example/hero.jpg', body: '<p>Nội dung</p>', date: '2026-09-14'
  }, 'POST');
  assert(r.ok, JSON.stringify(r));
  assert(r.data.record.slug === '5-meo-giu-chao-ben-lau', r.data.record.slug);
  assert(r.data.record.heroImg === '/assets/images/blog/5-meo-giu-chao-ben-lau/01.jpg', r.data.record.heroImg);
  assert(r.data.record.tags[0] === 'chao-chong-dinh', r.data.record.tags[0]);
  assert(r.data.url === 'https://dolphinhouse.vn/5-meo-giu-chao-ben-lau/', r.data.url);
});
check('news.update giữ phần không gửi', () => {
  const r = S.handleApi_({ key, action: 'news.update', slug: '5-meo-giu-chao-ben-lau', excerpt: 'Đã sửa' }, 'POST');
  assert(r.ok, JSON.stringify(r));
  assert(r.data.record.excerpt === 'Đã sửa' && r.data.record.body === '<p>Nội dung</p>', JSON.stringify(r.data.record));
  assert(r.data.record.heroImg === '/assets/images/blog/5-meo-giu-chao-ben-lau/01.jpg', 'ảnh đại diện bị mất');
});
check('danh mục tin tức lạ bị chặn', () => {
  const r = S.handleApi_({ key, action: 'news.create', title: 'Bài khác', categories: ['lung-tung'] }, 'POST');
  assert(r.ok === false && /news-category\.list/.test(r.error), JSON.stringify(r));
});
check('category.create gắn được danh mục cha theo slug', () => {
  const r = S.handleApi_({ key, action: 'category.create', name: 'Chảo chống dính', parent: 'do-dung-nha-bep' }, 'POST');
  assert(r.ok && r.data.parent === 1, JSON.stringify(r));
});
check('video.create lấy mã từ đường dẫn YouTube', () => {
  const r = S.handleApi_({ key, action: 'video.create', title: 'Mở hộp chảo', youtube: 'https://www.youtube.com/watch?v=abcdefghijk' }, 'POST');
  assert(r.ok && r.data.youtube === 'abcdefghijk', JSON.stringify(r));
});
check('video.update đổi mô tả', () => {
  const r = S.handleApi_({ key, action: 'video.update', slug: 'mo-hop-chao', description: 'Mô tả mới' }, 'POST');
  assert(r.ok && r.data.description === 'Mô tả mới' && r.data.youtube === 'abcdefghijk', JSON.stringify(r));
});
check('product.delete dọn cả ảnh', () => {
  const r = S.handleApi_({ key, action: 'product.delete', slug: 'chao-chong-dinh-steiger-28cm' }, 'POST');
  assert(r.ok && r.data.deleted === 'chao-chong-dinh-steiger-28cm' && r.data.remaining === 1, JSON.stringify(r));
  assert(!repo.has('data/products/chao-chong-dinh-steiger-28cm.json'), 'file chi tiết còn');
  assert([...repo.keys()].filter(k => k.includes('products/chao-chong-dinh-steiger-28cm/')).length === 0, 'ảnh còn sót');
});

console.log('\n— cổng vào HTTP —');
check('doPost định tuyến API', () => {
  const out = S.doPost({ postData: { contents: JSON.stringify({ key, action: 'ping' }) } });
  assert(out.json.ok === true, JSON.stringify(out.json));
});
check('doPost vẫn nhận đơn hàng (không đụng API)', () => {
  const out = S.doPost({ postData: { contents: JSON.stringify({ action: 'order', name: 'A', phone: '0900000000', items: [] }) } });
  assert(out.json.ok === false && /Giỏ hàng/.test(out.json.error), JSON.stringify(out.json));
});
check('doGet trả JSON khi có action', () => {
  const out = S.doGet({ parameter: { action: 'product.list', key } });
  assert(out.json.ok === true && out.json.data.items.length === 1, JSON.stringify(out.json).slice(0, 200));
});
check('thu hồi khoá là ngừng dùng được ngay', () => {
  S.revokeApiKey(sessionToken, key);
  const r = S.handleApi_({ key, action: 'ping' }, 'POST');
  assert(r.ok === false, JSON.stringify(r));
});

console.log(failed ? `\n${failed} kiểm tra thất bại` : '\nTất cả kiểm tra đã qua');
process.exit(failed ? 1 : 0);
