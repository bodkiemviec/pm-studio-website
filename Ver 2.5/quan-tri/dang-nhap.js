/* ==========================================================================
   quan-tri/dang-nhap.js
   Đăng nhập quản trị: validate -> gọi PMAPI.auth.dangNhap() -> chỉ chấp
   nhận tài khoản vai_tro = 'admin' -> điều hướng vào dashboard quản trị.
   Phụ thuộc: api.js (PMAPI) và ui.js (PMUI) phải được nạp trước file này.
   ========================================================================== */

(function () {
  const form = document.getElementById('admin-login-form');
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

        if (user.vai_tro !== 'admin') {
          // Tài khoản đúng mật khẩu nhưng không có quyền quản trị.
          // Đăng xuất ngay để không giữ cookie của tài khoản khách hàng ở khu vực quản trị.
          PMAPI.auth.dangXuat().finally(() => {
            PMUI.setLoading(submitBtn, false);
            PMUI.toast('Tài khoản này không có quyền truy cập khu vực quản trị.', 'error');
          });
          return;
        }

        PMUI.toast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 600);
      })
      .catch((err) => {
        PMUI.setLoading(submitBtn, false);
        PMUI.toast(err.message, 'error');
      });
  });
})();
