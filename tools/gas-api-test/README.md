# Kiểm thử API của dịch vụ quản trị

Chạy `gas/Code.js` trong một môi trường giả lập (kho nội dung nằm trong bộ nhớ) để kiểm tra
cổng API cho AI — quyết định thiết kế ở [`GAS.md`](../../GAS.md) mục XIX.

```bash
node tools/gas-api-test/test-api.js
```

Không gọi mạng, không đụng dữ liệu thật. Sửa `gas/Code.js` xong thì chạy lại trước khi
`clasp push`. Thư mục này cố ý **nằm ngoài `gas/`** để clasp không đẩy nó lên theo.
