/* ==========================================================================
   dang-ky.js
   Đăng ký tài khoản khách hàng: validate -> gọi PMAPI.auth.dangKy() ->
   backend tự đăng nhập luôn sau khi tạo tài khoản (set cookie) -> điều
   hướng vào dashboard khách hàng.
   Phụ thuộc: api.js (PMAPI) và ui.js (PMUI) phải được nạp trước file này.
   ========================================================================== */

(function () {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const firstInvalid = PMUI.validateForm(form);
    if (firstInvalid) {
      PMUI.toast('Vui lòng kiểm tra lại các ô được đánh dấu đỏ.', 'error');
      firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    PMUI.setLoading(submitBtn, true, 'Đang tạo tài khoản...');

    const payload = {
      ho_ten: document.getElementById('ho-ten').value.trim(),
      ten_doanh_nghiep: document.getElementById('ten-doanh-nghiep').value.trim(),
      email: document.getElementById('email').value.trim(),
      mat_khau: document.getElementById('mat-khau').value,
    };

    PMAPI.auth.dangKy(payload)
      .then(() => {
        PMUI.toast('Tạo tài khoản thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          window.location.href = 'khach-hang/index.html';
        }, 600);
      })
      .catch((err) => {
        PMUI.setLoading(submitBtn, false);
        PMUI.toast(err.message, 'error');
      });
  });
})();
