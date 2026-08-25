/* ==========================================================================
   khach-hang/tien-do.js
   Nạp dự án đang thực hiện của khách hàng và các bước tiến độ tương ứng
   từ API thật, thay cho nội dung mẫu hard-code trước đây.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  document.addEventListener('pm:auth-ready', (event) => {
    const user = event.detail.user;
    const sidebarName = document.getElementById('sidebar-customer-name');
    if (sidebarName) sidebarName.textContent = user.ten_doanh_nghiep || user.ho_ten;

    taiDuAnVaTienDo();
  });

  const TEN_TRANG_THAI_BUOC = {
    hoan_thanh: 'Hoàn tất',
    dang_lam: 'Đang thực hiện',
    cho_xu_ly: 'Chưa bắt đầu',
  };

  function taiDuAnVaTienDo() {
    PMAPI.khachHang.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        const duAnChinh = duAn.find((p) => p.trang_thai === 'dang_thuc_hien') || duAn[0];

        if (!duAnChinh) {
          setText('project-subtitle', 'Bạn chưa có dự án nào.');
          renderTimeline([]);
          renderProgress(0);
          return;
        }

        setText('project-subtitle', duAnChinh.ten_du_an);
        return PMAPI.khachHang.layTienDo(duAnChinh.id).then((tienDoData) => {
          const cacBuoc = (tienDoData.cac_buoc || []).slice().sort((a, b) => a.thu_tu - b.thu_tu);
          renderTimeline(cacBuoc);

          const tongSo = cacBuoc.length;
          const soHoanThanh = cacBuoc.filter((b) => b.trang_thai === 'hoan_thanh').length;
          renderProgress(tongSo > 0 ? Math.round((soHoanThanh / tongSo) * 100) : 0);
        });
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function renderProgress(phanTram) {
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('progress-label');
    if (fill) fill.style.width = phanTram + '%';
    if (label) label.textContent = phanTram + '% hoàn thành';
  }

  function renderTimeline(cacBuoc) {
    const list = document.getElementById('timeline-list');
    if (!list) return;

    if (cacBuoc.length === 0) {
      list.innerHTML = '<p style="color:var(--text-soft);">Chưa có bước tiến độ nào được thiết lập.</p>';
      return;
    }

    list.innerHTML = '';
    cacBuoc.forEach((buoc, index) => {
      const item = document.createElement('div');
      item.className = 'timeline__item' + (
        buoc.trang_thai === 'hoan_thanh' ? ' timeline__item--done' :
        buoc.trang_thai === 'dang_lam' ? ' timeline__item--active' : ''
      );

      const nhanTrangThai = TEN_TRANG_THAI_BUOC[buoc.trang_thai] || buoc.trang_thai;
      item.innerHTML =
        '<p class="timeline__date">Bước ' + (index + 1) + ' · ' + PMUI.escapeHTML(nhanTrangThai) + '</p>' +
        '<p class="timeline__title">' + PMUI.escapeHTML(buoc.ten_buoc) + '</p>' +
        '<p class="timeline__desc">' + PMUI.escapeHTML(buoc.mo_ta || '') + '</p>';

      list.appendChild(item);
    });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
