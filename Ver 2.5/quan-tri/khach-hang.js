/* ==========================================================================
   quan-tri/khach-hang.js
   Nạp danh sách khách hàng thật từ API. Bảng "users" không có sẵn cột
   ngành / gói dịch vụ / trạng thái nên các cột này được suy ra bằng cách
   khớp thêm dữ liệu từ PMAPI.quanTri.layDuAn() (ngành + trạng thái, lấy
   theo dự án gần nhất) và PMAPI.quanTri.layDonHang() (gói dịch vụ, lấy
   theo đơn gần nhất) — ghép ở phía trình duyệt, không cần thêm route mới.
   Giữ nguyên chức năng lọc theo tên/ngành/trạng thái + xác nhận trước khi
   điều hướng tới trang hồ sơ.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  const NGANH_LABEL = {
    'quan-an': 'Quán ăn',
    'ca-phe': 'Cà phê',
    gym: 'Phòng gym',
    'doanh-nghiep': 'Doanh nghiệp',
  };

  const TRANG_THAI_DU_AN = {
    dang_thuc_hien: { label: 'Đang thực hiện', badge: 'badge--progress' },
    hoan_thanh: { label: 'Hoàn thành', badge: 'badge--done' },
    tam_dung: { label: 'Tạm dừng', badge: 'badge--draft' },
  };

  document.addEventListener('pm:auth-ready', (event) => {
    const nameEl = document.getElementById('sidebar-admin-name');
    if (nameEl) nameEl.textContent = event.detail.user.ho_ten;

    taiDanhSachKhachHang();
  });

  function taiDanhSachKhachHang() {
    Promise.all([
      PMAPI.quanTri.layKhachHang(),
      PMAPI.quanTri.layDuAn(),
      PMAPI.quanTri.layDonHang(),
    ])
      .then(([khachHangData, duAnData, donHangData]) => {
        const khachHangList = khachHangData.khach_hang || [];
        const duAnList = duAnData.du_an || [];
        const donHangList = donHangData.don_hang || [];

        const hang = khachHangList.map((kh) => buildRowData(kh, duAnList, donHangList));
        renderTable(hang);
        setupFilterAndActions();
      })
      .catch((err) => PMUI.toast(err.message, 'error'));
  }

  function buildRowData(khachHang, duAnList, donHangList) {
    const duAnCuaKh = duAnList
      .filter((p) => p.customer_id === khachHang.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const donHangCuaKh = donHangList
      .filter((o) => o.customer_id === khachHang.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const duAnGanNhat = duAnCuaKh[0];
    const donHangGanNhat = donHangCuaKh[0];

    return {
      id: khachHang.id,
      ten: khachHang.ten_doanh_nghiep || khachHang.ho_ten,
      nganh: duAnGanNhat ? (NGANH_LABEL[duAnGanNhat.loai] || duAnGanNhat.loai) : '—',
      goiDichVu: donHangGanNhat ? (donHangGanNhat.goi_dich_vu || '—') : '—',
      trangThai: duAnGanNhat
        ? (TRANG_THAI_DU_AN[duAnGanNhat.trang_thai] || { label: duAnGanNhat.trang_thai, badge: 'badge--wait' })
        : { label: 'Chưa có dự án', badge: 'badge--wait' },
    };
  }

  function renderTable(hangList) {
    const tbody = document.getElementById('customer-table-body');
    if (!tbody) return;

    if (hangList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-soft);">Chưa có khách hàng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    hangList.forEach((hang) => {
      const tr = document.createElement('tr');
      // Thêm data-id attribute vào thẻ <a> để lưu trữ ID khách hàng
      tr.innerHTML =
        '<td>' + PMUI.escapeHTML(hang.ten) + '</td>' +
        '<td>' + PMUI.escapeHTML(hang.nganh) + '</td>' +
        '<td>' + PMUI.escapeHTML(hang.goiDichVu) + '</td>' +
        '<td><span class="badge ' + hang.trangThai.badge + '">' + PMUI.escapeHTML(hang.trangThai.label) + '</span></td>' +
        '<td class="data-table__actions"><a href="#" class="link-action" data-id="' + PMUI.escapeHTML(hang.id) + '">Xem hồ sơ</a></td>';
      tbody.appendChild(tr);
    });
  }

  function setupFilterAndActions() {
    const table = document.getElementById('customer-table');
    if (!table) return;

    const searchInput = document.getElementById('filter-search');
    const nganhSelect = document.getElementById('filter-nganh');
    const trangThaiSelect = document.getElementById('filter-trang-thai');

    PMUI.setupTableFilter({
      table,
      searchInput,
      selectFilters: [
        { element: nganhSelect, columnIndex: 1 },
        { element: trangThaiSelect, columnIndex: 3 },
      ],
      emptyMessage: 'Không tìm thấy khách hàng phù hợp.',
    });

    // Chưa có trang hồ sơ riêng theo từng khách hàng (khach-hang-chi-tiet.html
    // là trang demo dùng chung) -> xác nhận trước khi điều hướng, như hành vi cũ.
    table.addEventListener('click', (event) => {
      const link = event.target.closest('a.link-action');
      if (!link || link.getAttribute('href') !== '#') return;

      event.preventDefault();
      const row = link.closest('tr');
      const customerName = row.children[0] ? row.children[0].textContent.trim() : 'khách hàng này';
      
      // Lấy ID khách hàng từ attribute đã gắn ở renderTable
      const customerId = link.getAttribute('data-id');

      PMUI.openModal({
        title: 'Xem hồ sơ khách hàng',
        bodyHTML: '<p>Xem hồ sơ chi tiết của <strong>' + PMUI.escapeHTML(customerName) + '</strong>?</p>',
        confirmText: 'Xem hồ sơ',
        onConfirm: () => {
          // Điều hướng và đồng bộ định danh qua query parameter (URL ID routing)
          window.location.href = `khach-hang-chi-tiet.html?id=${customerId}`;
        },
      });
    });
  }
})();