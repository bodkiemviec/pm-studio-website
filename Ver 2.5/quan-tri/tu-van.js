/* ==========================================================================
   quan-tri/tu-van.js
   Nạp danh sách lịch tư vấn thật từ API, tách thành "Hôm nay" (timeline)
   và "Sắp tới" (bảng có lọc + xác nhận), gọi API thật khi xác nhận lịch.

   Lưu ý: bảng "consultations" không có cột ngành nên cột "Ngành" cũ được
   đổi thành "Liên hệ" (email/số điện thoại) — dữ liệu thật đang có sẵn.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  const TRANG_THAI_LICH = {
    cho_xac_nhan: { label: 'Chờ xác nhận', badge: 'badge--wait' },
    da_xac_nhan: { label: 'Đã xác nhận', badge: 'badge--progress' },
    da_huy: { label: 'Đã hủy', badge: 'badge--draft' },
  };

  document.addEventListener('pm:auth-ready', (event) => {
    const nameEl = document.getElementById('sidebar-admin-name');
    if (nameEl) nameEl.textContent = event.detail.user.ho_ten;

    taiLichTuVan();
  });

  function taiLichTuVan() {
    PMAPI.quanTri.layTuVan()
      .then((data) => {
        const lichHen = (data.lich_hen || []).slice()
          .sort((a, b) => new Date(a.thoi_gian_hen) - new Date(b.thoi_gian_hen));

        const now = new Date();
        const homNay = lichHen.filter((l) => isSameDay(new Date(l.thoi_gian_hen), now));
        const sapToi = lichHen.filter((l) => new Date(l.thoi_gian_hen) >= now && !isSameDay(new Date(l.thoi_gian_hen), now));

        renderToday(homNay, now);
        renderTable(sapToi);
        setupFilterAndActions();
      })
      .catch((err) => PMUI.toast(err.message, 'error'));
  }

  function renderToday(homNay, now) {
    setText('today-panel-title', 'Hôm nay — ' + PMUI.formatDateVN(now));

    const container = document.getElementById('today-timeline');
    if (!container) return;

    if (homNay.length === 0) {
      container.innerHTML = '<p style="color:var(--text-soft);">Không có buổi tư vấn nào hôm nay.</p>';
      return;
    }

    container.innerHTML = '';
    homNay.forEach((lich, index) => {
      const gio = new Date(lich.thoi_gian_hen);
      const item = document.createElement('div');
      item.className = 'timeline__item' + (index === 0 ? ' timeline__item--active' : '');
      item.innerHTML =
        '<p class="timeline__date">' + formatGio(gio) + '</p>' +
        '<p class="timeline__title">' + PMUI.escapeHTML(lich.ho_ten) + '</p>' +
        '<p class="timeline__desc">' + PMUI.escapeHTML(lich.ghi_chu || lich.email) + '</p>';
      container.appendChild(item);
    });
  }

  function renderTable(sapToi) {
    const tbody = document.getElementById('consult-table-body');
    if (!tbody) return;

    if (sapToi.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-soft);">Không có lịch tư vấn sắp tới.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    sapToi.forEach((lich) => {
      const trangThai = TRANG_THAI_LICH[lich.trang_thai] || { label: lich.trang_thai, badge: 'badge--wait' };
      const gio = new Date(lich.thoi_gian_hen);

      const tr = document.createElement('tr');
      tr.dataset.consultationId = lich.id;
      tr.innerHTML =
        '<td>' + PMUI.escapeHTML(lich.ho_ten) + '</td>' +
        '<td>' + PMUI.formatDateVN(gio) + ' · ' + formatGio(gio) + '</td>' +
        '<td>' + PMUI.escapeHTML(lich.email || lich.so_dien_thoai || '—') + '</td>' +
        '<td><span class="badge ' + trangThai.badge + '">' + PMUI.escapeHTML(trangThai.label) + '</span></td>' +
        '<td class="data-table__actions">' + buildActionsHTML(lich.trang_thai) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function buildActionsHTML(trangThai) {
    if (trangThai === 'cho_xac_nhan') {
      return '<a href="#" class="link-action" data-action="xac-nhan">Xác nhận</a>';
    }
    return '<a href="#" class="link-action" data-action="xem">Xem</a>';
  }

  function setupFilterAndActions() {
    const table = document.getElementById('consult-table');
    if (!table) return;

    const searchInput = document.getElementById('filter-search');
    const trangThaiSelect = document.getElementById('filter-trang-thai');

    PMUI.setupTableFilter({
      table,
      searchInput,
      selectFilters: [{ element: trangThaiSelect, columnIndex: 3 }],
      emptyMessage: 'Không tìm thấy lịch tư vấn phù hợp.',
    });

    table.addEventListener('click', (event) => {
      const link = event.target.closest('a.link-action');
      if (!link) return;
      event.preventDefault();

      const row = link.closest('tr');
      const consultationId = row.dataset.consultationId;
      const action = link.dataset.action;

      if (action === 'xac-nhan') {
        confirmBooking(row, consultationId);
      } else if (action === 'xem') {
        viewBooking(row);
      }
    });
  }

  function getBookingInfo(row) {
    return {
      khachHang: row.children[0] ? row.children[0].textContent.trim() : '',
      ngayGio: row.children[1] ? row.children[1].textContent.trim() : '',
      lienHe: row.children[2] ? row.children[2].textContent.trim() : '',
    };
  }

  function confirmBooking(row, consultationId) {
    const info = getBookingInfo(row);

    PMUI.openModal({
      title: 'Xác nhận lịch tư vấn',
      bodyHTML:
        '<p>Xác nhận lịch tư vấn với <strong>' + PMUI.escapeHTML(info.khachHang) + '</strong> ' +
        'lúc ' + PMUI.escapeHTML(info.ngayGio) + '?</p>',
      confirmText: 'Xác nhận lịch',
      onConfirm: () => PMAPI.quanTri.xacNhanTuVan(consultationId)
        .then(() => {
          const badge = row.querySelector('.badge');
          if (badge) {
            badge.className = 'badge badge--progress';
            badge.textContent = 'Đã xác nhận';
          }
          const actionsCell = row.querySelector('.data-table__actions');
          if (actionsCell) actionsCell.innerHTML = '<a href="#" class="link-action" data-action="xem">Xem</a>';

          PMUI.toast('Đã xác nhận lịch tư vấn với ' + info.khachHang + '.', 'success');
        }),
    });
  }

  function viewBooking(row) {
    const info = getBookingInfo(row);
    PMUI.alertModal(
      'Lịch tư vấn — ' + info.khachHang,
      '<p><strong>Thời gian:</strong> ' + PMUI.escapeHTML(info.ngayGio) + '</p>' +
      '<p><strong>Liên hệ:</strong> ' + PMUI.escapeHTML(info.lienHe) + '</p>'
    );
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function formatGio(date) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
})();
