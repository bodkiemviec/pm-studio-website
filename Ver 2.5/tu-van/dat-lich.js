/* ==========================================================================
   tu-van/dat-lich.js
   Xử lý form đặt lịch tư vấn 1-1: chặn ngày quá khứ, validate, submit.
   Phụ thuộc: ui.js (PMUI), api.js (PMAPI) phải được nạp trước file này.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('booking-form');
  if (!form) return;

  const dateInput = document.getElementById('ngay-hen');

  /* --- Chặn chọn ngày quá khứ: set min = hôm nay --- */
  if (dateInput) {
    const todayStr = toDateInputValue(new Date());
    dateInput.setAttribute('min', todayStr);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Chặn load lại trang

    // Validate form bằng PMUI (kiểm tra các trường bắt buộc, email hợp lệ...)
    const firstInvalid = PMUI.validateForm(form);
    if (firstInvalid) {
      PMUI.toast('Vui lòng điền đầy đủ thông tin bắt buộc.', 'error');
      firstInvalid.focus();
      return;
    }

    // Kiểm tra lại ngày ở phía JS (Chặn ngày quá khứ)
    if (dateInput && dateInput.value < toDateInputValue(new Date())) {
      PMUI.markFieldError(dateInput, 'Vui lòng chọn ngày từ hôm nay trở đi.');
      PMUI.toast('Ngày hẹn không hợp lệ.', 'error');
      dateInput.focus();
      return;
    }

    // Lấy dữ liệu và đồng bộ tên biến với Backend
    const ho_ten = document.getElementById('ho_ten').value.trim();
    const so_dien_thoai = document.getElementById('so_dien_thoai').value.trim();
    const email = document.getElementById('email').value.trim();
    const ghi_chu = document.getElementById('ghi_chu').value.trim();
    
    // Lấy thêm các trường bổ sung từ form
    const linh_vuc = document.getElementById('linh-vuc') ? document.getElementById('linh-vuc').value : '';
    const ngay_hen = document.getElementById('ngay-hen') ? document.getElementById('ngay-hen').value : '';
    const gio_hen = document.getElementById('gio-hen') ? document.getElementById('gio-hen').value : '';

    // Bật hiệu ứng loading cho nút Submit
    const submitBtn = form.querySelector('button[type="submit"]');
    PMUI.setLoading(submitBtn, true, 'Đang đặt lịch...');

    // Đóng gói Payload gửi lên API
    const payload = {
      ho_ten,
      so_dien_thoai,
      email,
      ghi_chu,
      linh_vuc,
      ngay_hen,
      gio_hen
    };

    try {
      // Sử dụng module PMAPI đã cấu hình sẵn thay vì fetch thủ công
      // (Đã tự động lấy URL, thêm headers và bắt lỗi chuẩn hóa)
      await PMAPI.public.datLichTuVan(payload);
      
      PMUI.toast('Đặt lịch thành công! Đang chuyển hướng...', 'success');
      
      // Chuyển hướng sang trang thành công sau 0.9s
      setTimeout(() => {
        window.location.href = form.getAttribute('action') || 'dat-lich-thanh-cong.html';
      }, 900);

    } catch (error) {
      console.error("Lỗi đặt lịch:", error);
      PMUI.setLoading(submitBtn, false); // Tắt loading nếu lỗi
      PMUI.toast(error.message || 'Có lỗi xảy ra, vui lòng thử lại.', 'error');
    }
  });

  // Hàm Helper: Lấy chuỗi định dạng YYYY-MM-DD
  function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
});