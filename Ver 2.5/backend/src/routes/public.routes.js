const express = require('express');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');

const router = express.Router();

/* ==========================================================================
   Giới hạn lượt gọi (Rate Limit)
   Không yêu cầu đăng nhập nên ai cũng gọi được — cần giới hạn 
   chống spam đặt lịch (tối đa 5 lần / giờ / IP).
   ========================================================================== */
const gioiHanDatLich = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { loi: 'Bạn đã đặt lịch quá nhiều lần. Vui lòng thử lại sau.' },
});

/* ==========================================================================
   POST: ĐẶT LỊCH TƯ VẤN (ai cũng đặt được, không cần tài khoản)
   ========================================================================== */
router.post('/dat-lich-tu-van', gioiHanDatLich, async (req, res) => {
  try {
    // 1. Nhận dữ liệu (Tên biến khớp 100% với Payload của Frontend)
    const { ho_ten, so_dien_thoai, email, ghi_chu, linh_vuc, ngay_hen, gio_hen } = req.body;

    // 2. Validate dữ liệu đầu vào bắt buộc
    if (!ho_ten || !so_dien_thoai || !email || !ngay_hen) {
      // Trả về thuộc tính "loi" để khớp với cơ chế PMAPI tự động báo lỗi ở Frontend
      return res.status(400).json({ loi: 'Vui lòng điền đầy đủ họ tên, email, số điện thoại và ngày hẹn.' });
    }

    // 3. Validate định dạng email (Regex cơ bản)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ loi: 'Định dạng email không hợp lệ.' });
    }

    // 4. Xử lý Thời gian (Ghép ngày_hen và phần bắt đầu của gio_hen)
    // VD: gio_hen = "09:00 – 09:45" -> Lấy ra "09:00"
    let gioBatDau = '00:00';
    if (gio_hen) {
      gioBatDau = gio_hen.split(' ')[0]; 
    }
    
    // Ghép thành định dạng chuẩn ISO (YYYY-MM-DDTHH:MM:00)
    const thoi_gian_hen = new Date(`${ngay_hen}T${gioBatDau}:00`);

    if (Number.isNaN(thoi_gian_hen.getTime())) {
      return res.status(400).json({ loi: 'Thời gian hẹn không hợp lệ.' });
    }
    if (thoi_gian_hen.getTime() < Date.now()) {
      return res.status(400).json({ loi: 'Thời gian hẹn phải ở trong tương lai.' });
    }

    // 5. Xử lý Ghi chú (Gộp lĩnh vực vào ghi chú lưu DB vì bảng consultations không có cột linh_vuc)
    let ghiChuGhep = `[Lĩnh vực]: ${linh_vuc || 'Không rõ'}`;
    if (ghi_chu) {
      ghiChuGhep += `\n[Nội dung]: ${ghi_chu}`;
    }

    // 6. Insert vào Database PostgreSQL (Dùng $1, $2, $3... chống SQL Injection)
    const query = `
      INSERT INTO consultations (ho_ten, email, so_dien_thoai, thoi_gian_hen, ghi_chu, trang_thai)
      VALUES ($1, $2, $3, $4, $5, 'cho_xac_nhan') RETURNING *
    `;
    
    const ketQua = await pool.query(query, [
      ho_ten, 
      email, 
      so_dien_thoai, 
      thoi_gian_hen.toISOString(), 
      ghiChuGhep
    ]);

    // 7. Trả kết quả thành công
    res.status(201).json({ 
      success: true, 
      message: 'Đặt lịch thành công!',
      lich_hen: ketQua.rows[0] 
    });

  } catch (err) {
    console.error('Lỗi API Đặt lịch:', err);
    res.status(500).json({ loi: 'Lỗi máy chủ nội bộ. Vui lòng thử lại sau.' });
  }
});

module.exports = router;