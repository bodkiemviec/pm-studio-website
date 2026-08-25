/* ==========================================================================
   quan-tri/du-an.js
   Nạp danh sách toàn bộ dự án từ API thật, dựng bảng động, giữ nguyên
   chức năng lọc theo tên/trạng thái (PMUI.setupTableFilter) và xác nhận
   trước khi điều hướng tới trang quản lý dự án.

   Lưu ý: trang chi tiết (du-an-chi-tiet.html) hiện là 1 trang demo dùng
   chung cho mọi dự án, chưa nhận id dự án qua URL — nên mọi dòng đều dẫn
   tới cùng 1 trang, giống hành vi cũ. Cột "Tiến độ" hiển thị "—" vì
   quan-tri.routes.js hiện chưa có endpoint đọc project_steps theo id dự
   án cho vai trò admin (chỉ có endpoint cập nhật 1 bước theo stepId) —
   cần bổ sung ở lần nối API tiếp theo cho khách hàng.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  const TEN_TRANG_THAI = {
    dang_thuc_hien: { label: 'Đang thực hiện', badge: 'badge--progress' },
    hoan_thanh: { label: 'Hoàn thành', badge: 'badge--done' },
    tam_dung: { label: 'Tạm dừng', badge: 'badge--draft' },
  };

  document.addEventListener('pm:auth-ready', (event) => {
    const nameEl = document.getElementById('sidebar-admin-name');
    if (nameEl) nameEl.textContent = event.detail.user.ho_ten;

    taiDanhSachDuAn();
  });

  function taiDanhSachDuAn() {
    PMAPI.quanTri.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        setText('project-count-subtitle', duAn.length + ' dự án đang được quản lý bởi đội thiết kế.');
        renderTable(duAn);
        setupFilterAndActions();
      })
      .catch((err) => PMUI.toast(err.message, 'error'));
  }

  function renderTable(duAnList) {
    const tbody = document.getElementById('project-table-body');
    if (!tbody) return;

    if (duAnList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-soft);">Chưa có dự án nào.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    duAnList.forEach((duAn) => {
      const trangThai = TEN_TRANG_THAI[duAn.trang_thai] || { label: duAn.trang_thai, badge: 'badge--wait' };
      const tenKhachHang = duAn.ten_doanh_nghiep || duAn.ten_khach_hang || '—';

      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + PMUI.escapeHTML(duAn.ten_du_an) + ' <span style="color:var(--muted); font-size:.8em;">· ' + PMUI.escapeHTML(tenKhachHang) + '</span></td>' +
        '<td>' + PMUI.escapeHTML(duAn.loai || '—') + '</td>' +
        '<td style="color:var(--muted);">—</td>' +
        '<td><span class="badge ' + trangThai.badge + '">' + PMUI.escapeHTML(trangThai.label) + '</span></td>' +
        '<td>' + PMUI.formatDateVN(new Date(duAn.ngay_bat_dau)) + '</td>' +
        '<td class="data-table__actions"><a href="du-an-chi-tiet.html" class="link-action">Quản lý</a></td>';
      tbody.appendChild(tr);
    });
  }

  function setupFilterAndActions() {
    const table = document.getElementById('project-table');
    if (!table) return;

    const searchInput = document.getElementById('filter-search');
    const trangThaiSelect = document.getElementById('filter-trang-thai');

    PMUI.setupTableFilter({
      table,
      searchInput,
      selectFilters: [{ element: trangThaiSelect, columnIndex: 3 }],
      emptyMessage: 'Không tìm thấy dự án phù hợp.',
    });

    // Liên kết "Quản lý" -> xác nhận trước khi vào trang quản lý dự án.
    table.addEventListener('click', (event) => {
      const link = event.target.closest('a.link-action');
      if (!link) return;

      event.preventDefault();
      const row = link.closest('tr');
      const projectName = row.children[0] ? row.children[0].textContent.trim() : 'dự án này';

      PMUI.openModal({
        title: 'Quản lý dự án',
        bodyHTML: '<p>Đi tới trang quản lý dự án của <strong>' + PMUI.escapeHTML(projectName) + '</strong>?</p>',
        confirmText: 'Quản lý',
        onConfirm: () => {
          window.location.href = link.getAttribute('href');
        },
      });
    });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
