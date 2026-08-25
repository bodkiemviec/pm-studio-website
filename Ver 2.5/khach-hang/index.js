/* ==========================================================================
   khach-hang/index.js
   Trang được bảo vệ bởi auth-guard.js — nội dung ẩn cho tới khi xác thực
   xong. Khi có sự kiện "pm:auth-ready", điền tên khách hàng thật và nạp
   dữ liệu tổng quan (dự án, tiến độ, thanh toán) từ API thật.

   Lưu ý: khối "Việc cần bạn xác nhận" và "Cập nhật gần đây" vẫn là nội
   dung minh họa — chưa có bảng dữ liệu (task/activity log) tương ứng ở
   backend nên chưa nối API cho 2 khối này.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  document.addEventListener('pm:auth-ready', (event) => {
    const user = event.detail.user;

    const nameEl = document.getElementById('customer-name');
    const greetingEl = document.getElementById('greeting-title');
    if (nameEl) nameEl.textContent = user.ten_doanh_nghiep || user.ho_ten;
    if (greetingEl) greetingEl.textContent = 'Chào ' + user.ho_ten + ' 👋';

    taiDuLieuTongQuan();
  });

  const signoutLink = document.getElementById('signout-link');
  if (signoutLink) {
    signoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      PMAPI.auth.dangXuat().finally(() => {
        window.location.href = '../dang-nhap.html';
      });
    });
  }

  function taiDuLieuTongQuan() {
    PMAPI.khachHang.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        const dangChay = duAn.filter((p) => p.trang_thai === 'dang_thuc_hien');

        setText('stat-du-an-dang-chay', String(dangChay.length));

        const duAnChinh = dangChay[0] || duAn[0];
        if (!duAnChinh) {
          setText('stat-du-an-ten', 'Chưa có dự án nào.');
          setText('stat-tien-do', '0%');
          setText('stat-tien-do-ghi-chu', 'Chưa có dự án đang thực hiện.');
          setText('stat-thanh-toan', '0/0');
          setText('stat-thanh-toan-ghi-chu', 'Chưa có khoản thanh toán.');
          return;
        }

        setText('stat-du-an-ten', duAnChinh.ten_du_an);
        taiTienDo(duAnChinh.id);
        taiThanhToan(duAnChinh.id);
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function taiTienDo(projectId) {
    PMAPI.khachHang.layTienDo(projectId)
      .then((data) => {
        const cacBuoc = data.cac_buoc || [];
        const tongSo = cacBuoc.length;
        const soHoanThanh = cacBuoc.filter((b) => b.trang_thai === 'hoan_thanh').length;
        const phanTram = tongSo > 0 ? Math.round((soHoanThanh / tongSo) * 100) : 0;
        const buocDangLam = cacBuoc.find((b) => b.trang_thai === 'dang_lam');

        setText('stat-tien-do', phanTram + '%');
        setText(
          'stat-tien-do-ghi-chu',
          buocDangLam ? 'Đang ở bước: ' + buocDangLam.ten_buoc : 'Chưa có bước nào đang thực hiện.'
        );
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function taiThanhToan(projectId) {
    PMAPI.khachHang.layThanhToan(projectId)
      .then((data) => {
        const cacDot = data.thanh_toan || [];
        const daThanhToan = cacDot.filter((d) => d.trang_thai === 'da_thanh_toan').length;

        setText('stat-thanh-toan', daThanhToan + '/' + cacDot.length);

        const dotChoThanhToan = cacDot.find((d) => d.trang_thai !== 'da_thanh_toan');
        setText(
          'stat-thanh-toan-ghi-chu',
          dotChoThanhToan ? 'Còn đợt ' + dotChoThanhToan.dot_so + ' chưa thanh toán' : 'Đã thanh toán đủ.'
        );
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
