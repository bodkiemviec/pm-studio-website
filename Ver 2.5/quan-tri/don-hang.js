/* ==========================================================================
   quan-tri/don-hang.js
   Nạp danh sách đơn hàng thật từ API, dựng bảng động, giữ nguyên chức
   năng lọc + luồng "Xác nhận" / "Từ chối" / "Xem" nhưng gọi API thật thay
   vì chỉ đổi giao diện tại chỗ.

   Lưu ý: bảng "orders" hiện chưa có cột lưu giá trị đơn hàng (giá tiền)
   nên đã bỏ cột "Giá trị" cũ (không có dữ liệu thật để hiển thị), thay
   bằng cột "Ngày đặt" (created_at) đang có sẵn.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  const TRANG_THAI_DON = {
    moi: { label: 'Chờ xác nhận', badge: 'badge--wait' },
    da_xac_nhan: { label: 'Đã xác nhận', badge: 'badge--done' },
    da_huy: { label: 'Đã hủy', badge: 'badge--draft' },
  };

  document.addEventListener('pm:auth-ready', (event) => {
    const nameEl = document.getElementById('sidebar-admin-name');
    if (nameEl) nameEl.textContent = event.detail.user.ho_ten;

    taiDanhSachDonHang();
  });

  function taiDanhSachDonHang() {
    PMAPI.quanTri.layDonHang()
      .then((data) => {
        renderTable(data.don_hang || []);
        setupFilterAndActions();
      })
      .catch((err) => PMUI.toast(err.message, 'error'));
  }

  function renderTable(donHangList) {
    const tbody = document.getElementById('order-table-body');
    if (!tbody) return;

    if (donHangList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-soft);">Chưa có đơn hàng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    donHangList.forEach((don) => {
      const trangThai = TRANG_THAI_DON[don.trang_thai] || { label: don.trang_thai, badge: 'badge--wait' };
      const tenKhachHang = don.ten_doanh_nghiep || don.ten_khach_hang || '—';

      const tr = document.createElement('tr');
      tr.dataset.orderId = don.id;
      tr.innerHTML =
        '<td>#' + String(don.id).padStart(4, '0') + '</td>' +
        '<td>' + PMUI.escapeHTML(tenKhachHang) + '</td>' +
        '<td>' + PMUI.escapeHTML(don.goi_dich_vu || don.ten_mau || '—') + '</td>' +
        '<td>' + PMUI.formatDateVN(new Date(don.created_at)) + '</td>' +
        '<td><span class="badge ' + trangThai.badge + '">' + PMUI.escapeHTML(trangThai.label) + '</span></td>' +
        '<td class="data-table__actions">' + buildActionsHTML(don.trang_thai) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function buildActionsHTML(trangThai) {
    if (trangThai === 'moi') {
      return '<a href="#" class="link-action" data-action="xac-nhan">Xác nhận</a> ' +
        '<a href="#" class="link-action link-action--danger" data-action="tu-choi">Từ chối</a>';
    }
    return '<a href="#" class="link-action" data-action="xem">Xem</a>';
  }

  function setupFilterAndActions() {
    const table = document.getElementById('order-table');
    if (!table) return;

    const searchInput = document.getElementById('filter-search');
    const trangThaiSelect = document.getElementById('filter-trang-thai');

    PMUI.setupTableFilter({
      table,
      searchInput,
      selectFilters: [{ element: trangThaiSelect, columnIndex: 4 }],
      emptyMessage: 'Không tìm thấy đơn hàng phù hợp.',
    });

    table.addEventListener('click', (event) => {
      const link = event.target.closest('a.link-action');
      if (!link) return;
      event.preventDefault();

      const row = link.closest('tr');
      const orderId = row.dataset.orderId;
      const action = link.dataset.action;

      if (action === 'xac-nhan') {
        confirmOrder(row, orderId);
      } else if (action === 'tu-choi') {
        rejectOrder(row, orderId);
      } else if (action === 'xem') {
        viewOrder(row);
      }
    });
  }

  function getOrderInfo(row) {
    return {
      maDon: row.children[0] ? row.children[0].textContent.trim() : '',
      khachHang: row.children[1] ? row.children[1].textContent.trim() : '',
      goi: row.children[2] ? row.children[2].textContent.trim() : '',
      ngayDat: row.children[3] ? row.children[3].textContent.trim() : '',
    };
  }

  function confirmOrder(row, orderId) {
    const info = getOrderInfo(row);

    PMUI.openModal({
      title: 'Xác nhận đơn hàng ' + info.maDon,
      bodyHTML:
        '<p>Xác nhận đơn hàng của <strong>' + PMUI.escapeHTML(info.khachHang) + '</strong> ' +
        '(' + PMUI.escapeHTML(info.goi) + ')?</p>',
      confirmText: 'Xác nhận đơn',
      onConfirm: () => PMAPI.quanTri.xacNhanDonHang(orderId)
        .then(() => {
          setStatusBadge(row, 'badge--done', 'Đã xác nhận');
          setActionsToView(row);
          PMUI.toast('Đã xác nhận đơn hàng ' + info.maDon + '.', 'success');
        }),
    });
  }

  function rejectOrder(row, orderId) {
    const info = getOrderInfo(row);

    PMUI.openModal({
      title: 'Từ chối đơn hàng ' + info.maDon,
      bodyHTML:
        '<p>Từ chối đơn hàng của <strong>' + PMUI.escapeHTML(info.khachHang) + '</strong>? ' +
        'Hành động này sẽ báo cho khách hàng biết đơn không được xử lý.</p>',
      confirmText: 'Từ chối đơn',
      danger: true,
      onConfirm: () => PMAPI.quanTri.tuChoiDonHang(orderId)
        .then(() => {
          setStatusBadge(row, 'badge--draft', 'Đã hủy');
          setActionsToView(row);
          PMUI.toast('Đã từ chối đơn hàng ' + info.maDon + '.', 'success');
        }),
    });
  }

  function viewOrder(row) {
    const info = getOrderInfo(row);
    PMUI.alertModal(
      'Đơn hàng ' + info.maDon,
      '<p><strong>Khách hàng:</strong> ' + PMUI.escapeHTML(info.khachHang) + '</p>' +
      '<p><strong>Gói dịch vụ:</strong> ' + PMUI.escapeHTML(info.goi) + '</p>' +
      '<p><strong>Ngày đặt:</strong> ' + PMUI.escapeHTML(info.ngayDat) + '</p>'
    );
  }

  function setStatusBadge(row, className, text) {
    const badge = row.querySelector('.badge');
    if (badge) {
      badge.className = 'badge ' + className;
      badge.textContent = text;
    }
  }

  function setActionsToView(row) {
    const actionsCell = row.querySelector('.data-table__actions');
    if (actionsCell) {
      actionsCell.innerHTML = '<a href="#" class="link-action" data-action="xem">Xem</a>';
    }
  }
})();
