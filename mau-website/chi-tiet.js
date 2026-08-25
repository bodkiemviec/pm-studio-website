/* ==========================================================================
   mau-website/chi-tiet.js
   Xử lý form "Đặt mẫu / Tùy chỉnh" trên trang chi tiết mẫu website.
   Phụ thuộc: ui.js (PMUI) phải được nạp trước file này.
   ========================================================================== */

(function () {
  const form = document.getElementById('order-form');
  if (!form) return;

  const swatches = form.querySelectorAll('.swatch');
  const colorInput = document.getElementById('mau-chu-dao-input');

  const packageSelect = document.getElementById('goi-dich-vu');
  const priceDisplay = document.getElementById('gia-hien-thi');
  const customPriceField = document.getElementById('gia-de-xuat-field');
  const customPriceInput = document.getElementById('gia-de-xuat');
  const CUSTOM_PACKAGE_VALUE = 'tuy-chon';

  /* --- Chọn màu chủ đạo: đổi trạng thái active + lưu giá trị --- */
  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      swatches.forEach((s) => s.setAttribute('aria-pressed', 'false'));
      swatch.setAttribute('aria-pressed', 'true');
      if (colorInput) {
        colorInput.value = swatch.getAttribute('aria-label') || '';
      }
    });
  });

  /* --- Chọn gói / đổi giá hiển thị --- */
  function isCustomPackage() {
    return packageSelect && packageSelect.value === CUSTOM_PACKAGE_VALUE;
  }

  function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  function updatePriceDisplay() {
    if (!packageSelect || !priceDisplay) return;

    if (isCustomPackage()) {
      if (customPriceField) customPriceField.hidden = false;
      const raw = customPriceInput ? customPriceInput.value.replace(/\D/g, '') : '';
      priceDisplay.textContent = raw ? formatCurrency(parseInt(raw, 10)) : 'Thương lượng';
    } else {
      if (customPriceField) customPriceField.hidden = true;
      if (customPriceInput) PMUI.clearFieldError(customPriceInput);
      const price = parseInt(packageSelect.value, 10);
      priceDisplay.textContent = Number.isNaN(price) ? '' : formatCurrency(price);
    }
  }

  if (packageSelect) {
    packageSelect.addEventListener('change', updatePriceDisplay);
  }

  /* --- Ô nhập giá đề xuất: tự thêm dấu chấm ngăn cách hàng nghìn khi gõ --- */
  if (customPriceInput) {
    customPriceInput.addEventListener('input', () => {
      const raw = customPriceInput.value.replace(/\D/g, '');
      customPriceInput.value = raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '';
      PMUI.clearFieldError(customPriceInput);
      updatePriceDisplay();
    });
  }

  // Đồng bộ giá hiển thị đúng ngay khi tải trang (phòng trường hợp select
  // không ở option đầu tiên, ví dụ do trình duyệt tự nhớ lựa chọn cũ).
  updatePriceDisplay();

  /* --- Submit form --- */
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const firstInvalid = PMUI.validateForm(form);
    if (firstInvalid) {
      PMUI.toast('Vui lòng kiểm tra lại các ô được đánh dấu đỏ.', 'error');
      firstInvalid.focus();
      return;
    }

    // "Tự đề xuất mức giá" không dùng thuộc tính required (vì chỉ bắt buộc
    // khi gói này được chọn) nên validate riêng bằng đúng cơ chế PMUI.
    if (isCustomPackage()) {
      const rawCustomPrice = customPriceInput ? customPriceInput.value.replace(/\D/g, '') : '';
      if (!rawCustomPrice) {
        PMUI.markFieldError(customPriceInput, 'Vui lòng nhập mức giá bạn đề xuất.');
        PMUI.toast('Vui lòng nhập mức giá bạn đề xuất.', 'error');
        customPriceInput.focus();
        return;
      }
      PMUI.clearFieldError(customPriceInput);
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    PMUI.setLoading(submitBtn, true, 'Đang gửi...');

    const payload = Object.fromEntries(new FormData(form).entries());

    // Chuẩn hóa 3 trường giá để backend không phải tự suy luận lại từ text:
    // packageName (tên gói dạng chữ), finalPrice (số nguyên VNĐ),
    // isCustomPrice (gói này có phải do khách tự đề xuất hay không).
    const isCustom = isCustomPackage();
    payload.packageName = packageSelect.options[packageSelect.selectedIndex].text;
    payload.finalPrice = isCustom
      ? parseInt(customPriceInput.value.replace(/\D/g, ''), 10)
      : parseInt(packageSelect.value, 10);
    payload.isCustomPrice = isCustom;

    submitOrder(payload)
      .then(() => {
        PMUI.toast('Đặt mẫu thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          window.location.href = form.getAttribute('action') || 'dat-hang-thanh-cong.html';
        }, 900);
      })
      .catch(() => {
        PMUI.setLoading(submitBtn, false);
        PMUI.toast('Có lỗi xảy ra, vui lòng thử lại.', 'error');
      });
  });

  /**
   * Giả lập gửi dữ liệu đơn hàng lên server.
   * TODO: khi có backend thật, thay hàm này bằng:
   *
   *   function submitOrder(data) {
   *     return fetch('/api/orders', {
   *       method: 'POST',
   *       headers: { 'Content-Type': 'application/json' },
   *       body: JSON.stringify(data),
   *     }).then((res) => {
   *       if (!res.ok) throw new Error('Gửi đơn hàng thất bại');
   *       return res.json();
   *     });
   *   }
   */
  function submitOrder(data) {
    console.log('[demo] Dữ liệu đặt mẫu:', data);
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
})();
