/* ==========================================================================
   PM STUDIO — api.js
   Module gọi API backend dùng chung cho toàn bộ frontend.
   Không phụ thuộc thư viện ngoài, không đọc/ghi token thủ công — token JWT
   nằm trong cookie httpOnly do backend set, trình duyệt tự gửi kèm mỗi
   request khi bật { credentials: 'include' }.

   Cách dùng ở các trang:
     <script src="../api.js"></script>       (đường dẫn tùy độ sâu thư mục)
     PMAPI.auth.dangNhap({ email, mat_khau })
       .then((data) => { ... })
       .catch((err) => { PMUI.toast(err.message, 'error'); });
   ========================================================================== */

window.PMAPI = (function () {

  // Tự động nhận diện môi trường để gán URL API
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const PM_API_BASE = isLocalhost ? 'http://localhost:4000' : 'https://api.pmstudio.vn';

  /**
   * Gọi API, tự đính kèm cookie (credentials: 'include') và parse JSON.
   * Ném lỗi (Error) có .status và .data khi response không phải 2xx,
   * để nơi gọi có thể bắt bằng .catch(err => ...) và hiện toast/lỗi cụ thể.
   */
  async function request(path, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    let res;
    try {
      res = await fetch(PM_API_BASE + path, {
        method: options.method || 'GET',
        headers: {
          // FormData (upload file): để trình duyệt tự đặt Content-Type kèm boundary.
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(options.headers || {}),
        },
        credentials: 'include',
        body: options.body === undefined
          ? undefined
          : (isFormData ? options.body : JSON.stringify(options.body)),
      });
    } catch (networkErr) {
      // Backend chưa chạy, sai domain, mất mạng...
      const err = new Error('Không kết nối được tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.');
      err.status = 0;
      err.cause = networkErr;
      throw err;
    }

    let data = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      // Một số response (vd 204 No Content) không có body JSON — bỏ qua.
    }

    if (!res.ok) {
      const message = (data && data.loi) || 'Có lỗi xảy ra, vui lòng thử lại.';
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  /* ------------------------------------------------------------------
     AUTH
     ------------------------------------------------------------------ */
  const auth = {
    dangKy(payload) {
      return request('/api/auth/dang-ky', { method: 'POST', body: payload });
    },
    dangNhap(payload) {
      return request('/api/auth/dang-nhap', { method: 'POST', body: payload });
    },
    dangXuat() {
      return request('/api/auth/dang-xuat', { method: 'POST' });
    },
    layToi() {
      return request('/api/auth/toi');
    },
  };

  /* ------------------------------------------------------------------
     KHÁCH HÀNG (yêu cầu đăng nhập vai trò khach_hang)
     ------------------------------------------------------------------ */
  const khachHang = {
    layDuAn() {
      return request('/api/khach-hang/du-an');
    },
    layTienDo(projectId) {
      return request('/api/khach-hang/du-an/' + projectId + '/tien-do');
    },
    layThanhToan(projectId) {
      return request('/api/khach-hang/du-an/' + projectId + '/thanh-toan');
    },
    layTaiLieu(projectId) {
      return request('/api/khach-hang/du-an/' + projectId + '/tai-lieu');
    },
    taiLenTaiLieu(projectId, file) {
      const formData = new FormData();
      formData.append('file', file);
      return request('/api/khach-hang/du-an/' + projectId + '/tai-lieu', {
        method: 'POST',
        body: formData,
      });
    },
    urlTaiXuongTaiLieu(documentId) {
      // Dùng làm href cho thẻ <a> tải xuống — cookie phiên đăng nhập sẽ được
      // trình duyệt tự gửi kèm vì đây là điều hướng GET cùng SameSite=Lax.
      return PM_API_BASE + '/api/khach-hang/tai-lieu/' + documentId + '/tai-xuong';
    },
  };

  /* ------------------------------------------------------------------
     QUẢN TRỊ (yêu cầu đăng nhập vai trò admin)
     ------------------------------------------------------------------ */
  const quanTri = {
    layKhachHang() {
      return request('/api/quan-tri/khach-hang');
    },
    layDuAn() {
      return request('/api/quan-tri/du-an');
    },
    taoDuAn(payload) {
      return request('/api/quan-tri/du-an', { method: 'POST', body: payload });
    },
    capNhatTienDo(stepId, trangThai) {
      return request('/api/quan-tri/tien-do/' + stepId, {
        method: 'PUT',
        body: { trang_thai: trangThai },
      });
    },
    xacNhanThanhToan(paymentId) {
      return request('/api/quan-tri/thanh-toan/' + paymentId + '/xac-nhan', { method: 'PUT' });
    },
    layTuVan() {
      return request('/api/quan-tri/tu-van');
    },
    xacNhanTuVan(consultationId) {
      return request('/api/quan-tri/tu-van/' + consultationId + '/xac-nhan', { method: 'PUT' });
    },
    layDonHang() {
      return request('/api/quan-tri/don-hang');
    },
    xacNhanDonHang(orderId) {
      return request('/api/quan-tri/don-hang/' + orderId + '/xac-nhan', { method: 'PUT' });
    },
    tuChoiDonHang(orderId) {
      return request('/api/quan-tri/don-hang/' + orderId + '/tu-choi', { method: 'PUT' });
    },
  };

  /* ------------------------------------------------------------------
     CÔNG KHAI (không cần đăng nhập)
     ------------------------------------------------------------------ */
  const publicApi = {
    datLichTuVan(payload) {
      return request('/api/dat-lich-tu-van', { method: 'POST', body: payload });
    },
  };

  return {
    request,
    auth,
    khachHang,
    quanTri,
    public: publicApi,
  };

})();