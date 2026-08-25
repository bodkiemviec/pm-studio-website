/* ==========================================================================
   PM STUDIO — auth-guard.js
   Chặn truy cập trang nếu chưa đăng nhập, hoặc đăng nhập sai vai trò.
   Phụ thuộc: api.js (PMAPI) phải được nạp trước file này.

   Cách dùng — thêm data-role và data-login-path vào chính thẻ <script>:

     <script src="../api.js"></script>
     <script src="../auth-guard.js"
             data-role="khach_hang"
             data-login-path="../dang-nhap.html"></script>

   Trong lúc chờ xác thực, nội dung trang được ẩn (class "auth-pending" trên
   <body>) để tránh nháy lộ dữ liệu trước khi biết chắc người dùng có quyền
   xem hay không. Khi xác thực xong, class này được gỡ và sự kiện
   "pm:auth-ready" được bắn ra kèm { user } để trang tự cập nhật UI
   (vd: hiện tên khách hàng, danh sách dự án...).
   ========================================================================== */

(function () {
  const scriptTag = document.currentScript;
  const requiredRole = scriptTag ? scriptTag.dataset.role : null;
  const loginPath = (scriptTag && scriptTag.dataset.loginPath) || 'dang-nhap.html';

  // Ẩn nội dung ngay lập tức, tránh nháy lộ dữ liệu trước khi xác thực xong.
  document.documentElement.classList.add('auth-pending');

  if (!window.PMAPI) {
    console.error('auth-guard.js cần api.js được nạp trước.');
    redirectToLogin();
    return;
  }

  PMAPI.auth.layToi()
    .then((data) => {
      const user = data && data.nguoi_dung;

      if (!user) {
        redirectToLogin();
        return;
      }

      if (requiredRole && user.vai_tro !== requiredRole) {
        // Đăng nhập đúng nhưng sai khu vực (vd: khách hàng cố vào trang quản trị)
        redirectToLogin();
        return;
      }

      window.PM_CURRENT_USER = user;
      document.documentElement.classList.remove('auth-pending');
      document.dispatchEvent(new CustomEvent('pm:auth-ready', { detail: { user } }));
    })
    .catch(() => {
      redirectToLogin();
    });

  function redirectToLogin() {
    window.location.href = loginPath;
  }
})();
