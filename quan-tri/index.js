/* ==========================================================================
   quan-tri/index.js
   Trang được bảo vệ bởi auth-guard.js (yêu cầu vai_tro = 'admin').
   Khi có sự kiện "pm:auth-ready", điền tên admin thật và nạp các số liệu
   tổng quan (dự án, đơn hàng, tư vấn) từ API thật.

   Lưu ý: thẻ "Doanh thu tháng" và bảng "Việc cần xử lý" vẫn là nội dung
   minh họa — backend chưa có endpoint tổng hợp doanh thu/việc cần xử lý
   theo nhiều nguồn (đơn hàng + dự án + tư vấn) nên chưa đủ dữ liệu để
   nối API cho 2 khối này.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  document.addEventListener('pm:auth-ready', (event) => {
    const user = event.detail.user;
    const nameEl = document.getElementById('admin-name');
    if (nameEl) nameEl.textContent = user.ho_ten;

    taiDuLieuTongQuan();
  });

  const signoutLink = document.getElementById('signout-link');
  if (signoutLink) {
    signoutLink.addEventListener('click', (event) => {
      event.preventDefault();
      PMAPI.auth.dangXuat().finally(() => {
        window.location.href = 'dang-nhap.html';
      });
    });
  }

  function taiDuLieuTongQuan() {
    PMAPI.quanTri.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        const dangChay = duAn.filter((p) => p.trang_thai === 'dang_thuc_hien');
        setText('stat-du-an-dang-chay', String(dangChay.length));
        setText('stat-du-an-tong', 'Trên tổng ' + duAn.length + ' dự án');
      })
      .catch((err) => PMUI.toast(err.message, 'error'));

    PMAPI.quanTri.layDonHang()
      .then((data) => {
        const donHang = data.don_hang || [];
        const donMoi = donHang.filter((o) => o.trang_thai === 'moi');
        setText('stat-don-hang-moi', String(donMoi.length));
      })
      .catch((err) => PMUI.toast(err.message, 'error'));

    PMAPI.quanTri.layTuVan()
      .then((data) => {
        const lichHen = data.lich_hen || [];
        const now = new Date();
        const sapToi = lichHen.filter((l) => new Date(l.thoi_gian_hen) >= now);
        const homNay = sapToi.filter((l) => isSameDay(new Date(l.thoi_gian_hen), now));

        setText('stat-tu-van-sap-toi', String(sapToi.length));
        setText('stat-tu-van-ghi-chu', homNay.length + ' buổi hôm nay');
      })
      .catch((err) => PMUI.toast(err.message, 'error'));
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
