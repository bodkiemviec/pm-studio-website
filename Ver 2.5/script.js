/* ==========================================================================
   PM STUDIO — script.js
   Chỉ xử lý một việc: đóng/mở menu điều hướng trên di động.
   Toàn bộ điều hướng cuộn tới section (Mẫu website, Bảng giá, ...) đã
   được xử lý bằng thẻ <a href="#id"> thuần HTML, không cần JS.
   ========================================================================== */

(function () {
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-links');

  if (!toggle || !menu) return;

  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Đóng menu điều hướng');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Mở menu điều hướng');
  }

  function isOpen() {
    return menu.classList.contains('is-open');
  }

  // Bấm icon hamburger: đảo trạng thái đóng/mở
  toggle.addEventListener('click', () => {
    isOpen() ? closeMenu() : openMenu();
  });

  // Bấm một mục trong menu -> tự đóng lại (đỡ phải bấm 2 lần)
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Nhấn phím Esc -> đóng menu
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  // Bấm ra ngoài menu -> đóng menu
  document.addEventListener('click', (event) => {
    const clickedInsideNav = event.target.closest('.nav');
    if (!clickedInsideNav && isOpen()) {
      closeMenu();
    }
  });

  // Nếu người dùng resize cửa sổ lên desktop trong lúc menu đang mở -> đóng
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && isOpen()) {
      closeMenu();
    }
  });
})();