// Tỉnh/Thành + Phường/Xã (địa giới hành chính 2 cấp, sau sáp nhập) — dữ liệu
// đầy đủ 34 tỉnh/thành, đọc từ /assets/area/provinces.json +
// /assets/area/wards/{code}.json. Dùng cho trang /thanh-toan/.
function populateProvinceSelect(selectEl) {
  if (!selectEl) return Promise.resolve();
  return fetch("/assets/area/provinces.json")
    .then((r) => r.json())
    .then((list) => {
      selectEl.innerHTML =
        '<option value="">Chọn Tỉnh/Thành</option>' +
        list.map((p) => `<option value="${p.code}">${p.name}</option>`).join("");
    })
    .catch(() => {
      selectEl.innerHTML = '<option value="">Không tải được danh sách tỉnh/thành</option>';
    });
}

function populateWardField(provinceCode, wardSelectEl) {
  if (!wardSelectEl) return Promise.resolve();

  if (!provinceCode) {
    wardSelectEl.innerHTML = '<option value="">Chọn Tỉnh/Thành trước</option>';
    wardSelectEl.disabled = true;
    return Promise.resolve();
  }

  wardSelectEl.disabled = true;
  wardSelectEl.innerHTML = '<option value="">Đang tải…</option>';

  return fetch("/assets/area/wards/" + provinceCode + ".json")
    .then((r) => r.json())
    .then((list) => {
      wardSelectEl.innerHTML =
        '<option value="">Chọn Phường/Xã</option>' +
        list.map((w) => `<option value="${w.code}">${w.name}</option>`).join("");
      wardSelectEl.disabled = false;
    })
    .catch(() => {
      wardSelectEl.innerHTML = '<option value="">Không tải được danh sách phường/xã</option>';
    });
}
