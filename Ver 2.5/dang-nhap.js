/* ==========================================================================
   dang-nhap.js
   Đăng nhập khách hàng: validate -> gọi PMAPI.auth.dangNhap() -> điều hướng
   vào dashboard khách hàng. Nếu tài khoản là admin, báo dùng đúng trang
   đăng nhập quản trị (tránh nhầm khu vực).
   Phụ thuộc: api.js (PMAPI) và ui.js (PMUI) phải được nạp trước file này.
   ========================================================================== */

(function () {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const firstInvalid = PMUI.validateForm(form);
    if (firstInvalid) {
      PMUI.toast('Vui lòng nhập đủ email và mật khẩu.', 'error');
      firstInvalid.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    PMUI.setLoading(submitBtn, true, 'Đang đăng nhập...');

    const payload = {
      email: document.getElementById('email').value.trim(),
      mat_khau: document.getElementById('mat-khau').value,
    };

    PMAPI.auth.dangNhap(payload)
      .then((data) => {
        const user = data.nguoi_dung;

        if (user.vai_tro !== 'khach_hang') {
          PMUI.setLoading(submitBtn, false);
          PMUI.toast('Tài khoản này không phải tài khoản khách hàng. Vui lòng dùng trang đăng nhập quản trị.', 'error');
          return;
        }

        PMUI.toast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
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
