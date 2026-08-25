/* ==========================================================================
   PM STUDIO — ui.js
   Module dùng chung cho mọi trang cần tương tác JS (form, modal, toast).
   Không phụ thuộc thư viện ngoài. Expose ra window.PMUI để các file
   script riêng của từng trang (vd: chi-tiet.js, dat-lich.js...) gọi lại.

   Các trang chỉ cần thêm:
     <script src="../ui.js"></script>
   trước script riêng của trang, rồi dùng:
     PMUI.toast(...), PMUI.setLoading(...), PMUI.openModal(...), PMUI.validateForm(...)
   ========================================================================== */

window.PMUI = (function () {

  /* ------------------------------------------------------------------
     TOAST
     ------------------------------------------------------------------ */

  function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Hiện thông báo toast góc màn hình.
   * @param {string} message
   * @param {'success'|'error'} type
   * @param {number} duration - thời gian hiện (ms)
   */
  function toast(message, type, duration) {
    type = type || 'success';
    duration = duration || 3200;

    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = message;
    container.appendChild(el);

    // Chờ 1 frame để CSS transition chạy đúng
    requestAnimationFrame(() => el.classList.add('is-visible'));

    const remove = () => {
      if (!el.isConnected) return;
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 250);
    };

    setTimeout(remove, duration);
  }

  /* ------------------------------------------------------------------
     NÚT LOADING (chống bấm submit 2 lần)
     ------------------------------------------------------------------ */

  /**
   * Bật/tắt trạng thái loading cho 1 nút.
   * @param {HTMLButtonElement} button
   * @param {boolean} isLoading
   * @param {string} [loadingText]
   */
  function setLoading(button, isLoading, loadingText) {
    if (!button) return;

    if (isLoading) {
      if (button.dataset.originalHtml === undefined) {
        button.dataset.originalHtml = button.innerHTML;
      }
      button.disabled = true;
      button.classList.add('is-loading');
      button.innerHTML =
        '<span class="btn__spinner" aria-hidden="true"></span>' +
        (loadingText || 'Đang xử lý…');
    } else {
      button.disabled = false;
      button.classList.remove('is-loading');
      if (button.dataset.originalHtml !== undefined) {
        button.innerHTML = button.dataset.originalHtml;
      }
    }
  }

  /* ------------------------------------------------------------------
     VALIDATE FORM
     ------------------------------------------------------------------ */

  function markFieldError(field, message) {
    const wrapper = field.closest('.field') || field.parentElement;
    wrapper.classList.add('field--invalid');
    field.setAttribute('aria-invalid', 'true');

    let msg = wrapper.querySelector('.field__error');
    if (!msg) {
      msg = document.createElement('p');
      msg.className = 'field__error';
      wrapper.appendChild(msg);
    }
    msg.textContent = message;
  }

  function clearFieldError(field) {
    const wrapper = field.closest('.field') || field.parentElement;
    wrapper.classList.remove('field--invalid');
    field.removeAttribute('aria-invalid');
    const msg = wrapper.querySelector('.field__error');
    if (msg) msg.remove();
  }

  /**
   * Kiểm tra toàn bộ field [required] trong 1 form.
   * Tự thêm/xóa style lỗi + text lỗi dưới field.
   * @param {HTMLFormElement} form
   * @returns {HTMLElement|null} field lỗi đầu tiên, null nếu form hợp lệ
   */
  function validateForm(form) {
    let firstInvalid = null;
    const fields = form.querySelectorAll('[required]');

    fields.forEach((field) => {
      const value = (field.value || '').trim();
      let valid = value.length > 0;
      let message = 'Vui lòng điền thông tin này.';

      if (valid && field.type === 'email') {
        valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        message = 'Email không hợp lệ.';
      }

      if (valid && field.type === 'tel') {
        valid = /^0\d{9,10}$/.test(value.replace(/[\s.-]/g, ''));
        message = 'Số điện thoại không hợp lệ.';
      }

      if (valid && field.hasAttribute('minlength')) {
        const min = parseInt(field.getAttribute('minlength'), 10);
        if (value.length < min) {
          valid = false;
          message = 'Cần ít nhất ' + min + ' ký tự.';
        }
      }

      if (valid) {
        clearFieldError(field);
      } else {
        markFieldError(field, message);
        if (!firstInvalid) firstInvalid = field;
      }
    });

    return firstInvalid;
  }

  /* ------------------------------------------------------------------
     MODAL XÁC NHẬN (dùng chung cho mọi trang)
     ------------------------------------------------------------------ */

  /**
   * Mở modal xác nhận.
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} [opts.bodyHTML]
   * @param {string} [opts.confirmText]
   * @param {string} [opts.cancelText]
   * @param {boolean} [opts.danger]
   * @param {(modalEl: HTMLElement) => (void|Promise)} [opts.onConfirm]
   *        Nếu trả về Promise: nút Xác nhận sẽ vào trạng thái loading,
   *        modal chỉ đóng khi Promise resolve. Nếu reject, modal ở lại
   *        (dùng cho trường hợp validate trong modal, vd: bắt buộc nhập ghi chú).
   * @returns {Promise<boolean>} true nếu người dùng xác nhận, false nếu hủy
   */
  function openModal(opts) {
    const {
      title,
      bodyHTML = '',
      confirmText = 'Xác nhận',
      cancelText = 'Hủy',
      danger = false,
      onConfirm,
    } = opts;

    return new Promise((resolve) => {
      const previouslyFocused = document.activeElement;
      const titleId = 'modal-title-' + Date.now();

      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', titleId);

      // KHÔNG nối chuỗi title vào innerHTML để chống XSS
      // Thay vào đó, để trống nội dung thẻ <h3>
      modal.innerHTML =
        '<div class="modal__head">' +
          '<h3 id="' + titleId + '"></h3>' + 
          '<button type="button" class="modal__close" aria-label="Đóng">&times;</button>' +
        '</div>' +
        '<div class="modal__body">' + bodyHTML + '</div>' +
        '<div class="modal__foot">' +
          (cancelText ? '<button type="button" class="btn btn--ghost" data-modal-cancel>' + cancelText + '</button>' : '') +
          '<button type="button" class="btn ' + (danger ? 'btn--danger' : 'btn--primary') + '" data-modal-confirm>' + confirmText + '</button>' +
        '</div>';

      // Vá lỗi XSS: Gán dữ liệu cho tiêu đề bằng textContent
      modal.querySelector('#' + titleId).textContent = title;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      document.body.classList.add('modal-open');

      const confirmBtn = modal.querySelector('[data-modal-confirm]');
      const cancelBtn = modal.querySelector('[data-modal-cancel]');
      const closeBtn = modal.querySelector('.modal__close');

      function close(result) {
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', onKeydown);
        overlay.remove();
        if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
          previouslyFocused.focus();
        }
        resolve(result);
      }

      function onKeydown(event) {
        if (event.key === 'Escape') close(false);
      }

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close(false);
      });
      if (cancelBtn) cancelBtn.addEventListener('click', () => close(false));
      closeBtn.addEventListener('click', () => close(false));
      document.addEventListener('keydown', onKeydown);

      confirmBtn.addEventListener('click', () => {
        if (typeof onConfirm !== 'function') {
          close(true);
          return;
        }

        const result = onConfirm(modal);

        if (result && typeof result.then === 'function') {
          setLoading(confirmBtn, true, 'Đang xử lý…');
          result
            .then(() => close(true))
            .catch(() => {
              // Trang gọi chịu trách nhiệm hiện toast lỗi cụ thể.
              // Modal ở lại để người dùng sửa rồi bấm lại.
              setLoading(confirmBtn, false);
            });
        } else {
          close(true);
        }
      });

      const focusable = modal.querySelector('input, textarea, select');
      (focusable || confirmBtn).focus();
    });
  }

  /* ------------------------------------------------------------------
     HELPERS DÙNG CHUNG KHÁC
     ------------------------------------------------------------------ */

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDateVN(date) {
    date = date || new Date();
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return d + '/' + m + '/' + y;
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Modal chỉ để thông báo (không có lựa chọn Hủy/Xác nhận thật sự),
   * dùng thay cho window.alert() ở những nút "Xem" chưa có trang chi tiết riêng.
   * @param {string} title
   * @param {string} bodyHTML
   * @param {string} [closeText]
   */
  function alertModal(title, bodyHTML, closeText) {
    return openModal({
      title,
      bodyHTML,
      confirmText: closeText || 'Đóng',
      cancelText: null,
    });
  }

  /* ------------------------------------------------------------------
     LỌC BẢNG (search + select) — dùng chung cho các trang quản trị
     ------------------------------------------------------------------ */

  function normalizeText(str) {
    return (str || '').toLowerCase().trim();
  }

  /**
   * Gắn lọc thời gian thực cho 1 bảng: ô tìm kiếm lọc theo toàn bộ nội dung
   * dòng, mỗi select lọc theo đúng 1 cột (so khớp text, "Tất cả..." = bỏ qua).
   *
   * @param {Object} config
   * @param {HTMLTableElement} config.table
   * @param {HTMLInputElement} [config.searchInput]
   * @param {Array<{element: HTMLSelectElement, columnIndex: number}>} [config.selectFilters]
   * @param {string} [config.emptyMessage]
   * @returns {{refresh: Function}}
   */
  function setupTableFilter(config) {
    const { table, searchInput, selectFilters = [], emptyMessage } = config;
    if (!table) return { refresh: () => {} };

    const tbody = table.tagName === 'TBODY' ? table : table.querySelector('tbody');
    if (!tbody) return { refresh: () => {} };

    const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
    let emptyRow = null;

    function applyFilters() {
      const searchTerm = searchInput ? normalizeText(searchInput.value) : '';
      let visibleCount = 0;

      rows.forEach((row) => {
        let matches = !searchTerm || normalizeText(row.textContent).includes(searchTerm);

        if (matches) {
          for (const filter of selectFilters) {
            const selectedValue = filter.element.value;
            const isWildcard = normalizeText(selectedValue).startsWith('tất cả');
            if (isWildcard) continue;

            const cell = row.children[filter.columnIndex];
            const cellText = cell ? normalizeText(cell.textContent) : '';
            if (cellText !== normalizeText(selectedValue)) {
              matches = false;
              break;
            }
          }
        }

        row.style.display = matches ? '' : 'none';
        if (matches) visibleCount += 1;
      });

      toggleEmptyRow(visibleCount === 0);
    }

    function toggleEmptyRow(show) {
      if (show) {
        if (!emptyRow) {
          emptyRow = document.createElement('tr');
          const td = document.createElement('td');
          td.colSpan = rows[0] ? rows[0].children.length : 5;
          td.style.textAlign = 'center';
          td.style.color = 'var(--muted)';
          td.style.padding = '1.6rem';
          td.textContent = emptyMessage || 'Không tìm thấy kết quả phù hợp.';
          emptyRow.appendChild(td);
        }
        if (!emptyRow.isConnected) tbody.appendChild(emptyRow);
      } else if (emptyRow && emptyRow.isConnected) {
        emptyRow.remove();
      }
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    selectFilters.forEach((filter) => filter.element.addEventListener('change', applyFilters));

    return { refresh: applyFilters };
  }

  return {
    toast,
    setLoading,
    validateForm,
    markFieldError,
    clearFieldError,
    openModal,
    alertModal,
    setupTableFilter,
    formatBytes,
    formatDateVN,
    escapeHTML,
  };

})();