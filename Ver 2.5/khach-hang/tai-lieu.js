/* ==========================================================================
   khach-hang/tai-lieu.js
   Nạp danh sách tài liệu thật của dự án từ API, xử lý tải file thật lên
   backend (multer) và tải xuống tài liệu đã lưu.

   Lưu ý: khối "Đang chờ bạn tải lên" (yêu cầu tài liệu cụ thể từ đội thiết
   kế) đã được bỏ khỏi bản demo hard-code cũ — bảng documents có sẵn cột
   `loai` để phân biệt 'can_khach_hang_tai_len', nhưng phía quản trị hiện
   chưa có route để tạo yêu cầu này, nên chưa đủ dữ liệu thật để hiển thị.
   Phụ thuộc: api.js (PMAPI), ui.js (PMUI), auth-guard.js phải được nạp trước.
   ========================================================================== */

(function () {
  let duAnHienTaiId = null;

  const trigger = document.getElementById('upload-trigger-btn');
  const input = document.getElementById('file-upload-input');
  const list = document.getElementById('uploaded-file-list');

  const ICON_BY_EXT = {
    jpg: 'JPG', jpeg: 'JPG', png: 'PNG', gif: 'GIF', webp: 'IMG',
    pdf: 'PDF', doc: 'DOC', docx: 'DOC', xls: 'XLS', xlsx: 'XLS', zip: 'ZIP',
  };

  document.addEventListener('pm:auth-ready', (event) => {
    const user = event.detail.user;
    const sidebarName = document.getElementById('sidebar-customer-name');
    if (sidebarName) sidebarName.textContent = user.ten_doanh_nghiep || user.ho_ten;

    taiDuAnVaTaiLieu();
  });

  if (trigger && input) {
    trigger.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      files.forEach(handleFile);
      input.value = ''; // cho phép chọn lại đúng file đó nếu cần
    });
  }

  function taiDuAnVaTaiLieu() {
    PMAPI.khachHang.layDuAn()
      .then((data) => {
        const duAn = data.du_an || [];
        const duAnChinh = duAn.find((p) => p.trang_thai === 'dang_thuc_hien') || duAn[0];

        if (!duAnChinh) {
          if (list) list.innerHTML = '<p style="color:var(--text-soft);">Bạn chưa có dự án nào để tải tài liệu.</p>';
          return;
        }

        duAnHienTaiId = duAnChinh.id;
        if (trigger) trigger.disabled = false;
        return taiDanhSachTaiLieu();
      })
      .catch((err) => {
        PMUI.toast(err.message, 'error');
      });
  }

  function taiDanhSachTaiLieu() {
    return PMAPI.khachHang.layTaiLieu(duAnHienTaiId).then((data) => {
      renderFileList(data.tai_lieu || []);
    });
  }

  function renderFileList(taiLieuList) {
    if (!list) return;

    if (taiLieuList.length === 0) {
      list.innerHTML = '<p style="color:var(--text-soft);">Chưa có tài liệu nào được tải lên.</p>';
      renderQuotaSummary(0);
      return;
    }

    const tongDungLuong = taiLieuList.reduce((sum, tl) => sum + Number(tl.kich_thuoc || 0), 0);
    renderQuotaSummary(tongDungLuong);

    list.innerHTML = '';
    taiLieuList.forEach((taiLieu) => {
      const row = document.createElement('div');
      row.className = 'file-row';

      const ext = (taiLieu.ten_file.split('.').pop() || '').toLowerCase();
      const kichThuoc = taiLieu.kich_thuoc ? ' · ' + PMUI.formatBytes(Number(taiLieu.kich_thuoc)) : '';

      row.innerHTML =
        '<div class="file-row__icon">' + (ICON_BY_EXT[ext] || 'FILE') + '</div>' +
        '<div class="file-row__main">' +
          '<p class="file-row__name">' + PMUI.escapeHTML(taiLieu.ten_file) + '</p>' +
          '<p class="file-row__meta">Tải lên ' + PMUI.formatDateVN(new Date(taiLieu.created_at)) + kichThuoc + '</p>' +
        '</div>' +
        '<a href="' + PMAPI.khachHang.urlTaiXuongTaiLieu(taiLieu.id) + '" class="link-action">Tải xuống</a>';

      list.appendChild(row);
    });
  }

  // Hiển thị dung lượng dự án đã dùng so với hạn mức, để người dùng hiểu lý
  // do bị chặn (413) nếu gần đầy, thay vì chỉ thấy lỗi khi upload thất bại.
  // Hạn mức hiển thị ở đây là ước lượng mặc định phía backend (100MB/dự án)
  // — nếu server đổi qua biến môi trường QUOTA_PROJECT_MB thì số này chỉ
  // mang tính tham khảo, giới hạn thật luôn do backend quyết định.
  function renderQuotaSummary(daDungByte) {
    const summaryEl = document.getElementById('quota-summary');
    if (!summaryEl) return;
    const HAN_MUC_UOC_LUONG = 100 * 1024 * 1024;
    summaryEl.textContent = 'Đã dùng ' + PMUI.formatBytes(daDungByte) + ' / ~' + PMUI.formatBytes(HAN_MUC_UOC_LUONG) + ' cho dự án này';
  }

  function handleFile(file) {
    if (!duAnHienTaiId) {
      PMUI.toast('Không tìm thấy dự án để gắn tài liệu.', 'error');
      return;
    }

    const row = buildUploadingRow(file);
    if (list) list.prepend(row);

    PMAPI.khachHang.taiLenTaiLieu(duAnHienTaiId, file)
      .then(() => {
        PMUI.toast('Đã tải lên "' + file.name + '"', 'success');
        return taiDanhSachTaiLieu();
      })
      .catch((err) => {
        row.remove();
        PMUI.toast(err.message || ('Tải lên "' + file.name + '" thất bại'), 'error');
      });
  }

  function buildUploadingRow(file) {
    const row = document.createElement('div');
    row.className = 'file-row file-row--uploading';

    const icon = document.createElement('div');
    icon.className = 'file-row__icon';

    if (file.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = '';
      img.className = 'file-row__thumb';
      icon.appendChild(img);
    } else {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      icon.textContent = ICON_BY_EXT[ext] || 'FILE';
    }

    const main = document.createElement('div');
    main.className = 'file-row__main';
    main.innerHTML =
      '<p class="file-row__name">' + PMUI.escapeHTML(file.name) + '</p>' +
      '<p class="file-row__meta">' + PMUI.formatBytes(file.size) + '</p>';

    const status = document.createElement('span');
    status.className = 'badge badge--progress file-row__status';
    status.textContent = 'Đang tải lên...';

    row.appendChild(icon);
    row.appendChild(main);
    row.appendChild(status);
    return row;
  }
})();
