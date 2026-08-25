const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Regex email đơn giản, đủ để chặn các giá trị rõ ràng không phải email
// (VD: "abc"). Không cố bắt mọi trường hợp hợp lệ theo chuẩn RFC 5322 (quá
// phức tạp và dễ sai) — việc xác minh email thật vẫn nên qua gửi mail xác thực.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Giới hạn riêng cho ĐĂNG KÝ: tối đa 10 lần / giờ / IP.
// Tách riêng khỏi đăng nhập để 1 IP spam đăng ký sai không làm khóa luôn
// người dùng hợp lệ đang cố đăng nhập từ cùng IP (VD: mạng công ty/NAT).
const gioiHanDangKy = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { loi: 'Bạn đã thử đăng ký quá nhiều lần. Vui lòng thử lại sau.' },
});

// Giới hạn riêng cho ĐĂNG NHẬP: tối đa 10 lần / 15 phút / IP để chống dò
// mật khẩu (brute-force), cửa sổ ngắn hơn vì đây là hành động người dùng
// hợp lệ có thể cần thử lại nhiều lần trong thời gian ngắn (gõ nhầm mật khẩu).
const gioiHanDangNhap = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { loi: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ít phút.' },
});

// Cấu hình cookie chứa JWT — httpOnly để JS phía trình duyệt không đọc/sửa được
function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // bật secure khi chạy HTTPS thật
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  };
}

function taoToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, vai_tro: user.vai_tro },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ---------- ĐĂNG KÝ (khách hàng) ----------
router.post('/dang-ky', gioiHanDangKy, async (req, res) => {
  const { ho_ten, ten_doanh_nghiep, email, mat_khau } = req.body;

  if (!ho_ten || !email || !mat_khau) {
    return res.status(400).json({ loi: 'Vui lòng nhập đủ họ tên, email và mật khẩu.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ loi: 'Email không hợp lệ.' });
  }
  if (mat_khau.length < 8) {
    return res.status(400).json({ loi: 'Mật khẩu phải có ít nhất 8 ký tự.' });
  }

  const daTonTai = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (daTonTai.rows.length > 0) {
    return res.status(409).json({ loi: 'Email này đã được đăng ký.' });
  }

  // Không bao giờ lưu mật khẩu dạng thô — luôn băm (hash) trước khi lưu
  const matKhauHash = await bcrypt.hash(mat_khau, 10);

  const ketQua = await pool.query(
    `INSERT INTO users (ho_ten, ten_doanh_nghiep, email, mat_khau_hash, vai_tro)
     VALUES ($1, $2, $3, $4, 'khach_hang')
     RETURNING id, ho_ten, ten_doanh_nghiep, email, vai_tro`,
    [ho_ten, ten_doanh_nghiep || null, email, matKhauHash]
  );

  const user = ketQua.rows[0];
  const token = taoToken(user);
  res.cookie('token', token, cookieOptions());
  res.status(201).json({ nguoi_dung: user });
});

// ---------- ĐĂNG NHẬP (dùng chung cho khách hàng & admin) ----------
router.post('/dang-nhap', gioiHanDangNhap, async (req, res) => {
  const { email, mat_khau } = req.body;

  if (!email || !mat_khau) {
    return res.status(400).json({ loi: 'Vui lòng nhập email và mật khẩu.' });
  }

  const ketQua = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = ketQua.rows[0];

  // Thông báo lỗi giống nhau dù sai email hay sai mật khẩu, tránh lộ email nào đã đăng ký
  if (!user) {
    return res.status(401).json({ loi: 'Email hoặc mật khẩu không đúng.' });
  }

  const dungMatKhau = await bcrypt.compare(mat_khau, user.mat_khau_hash);
  if (!dungMatKhau) {
    return res.status(401).json({ loi: 'Email hoặc mật khẩu không đúng.' });
  }

  const token = taoToken(user);
  res.cookie('token', token, cookieOptions());
  res.json({
    nguoi_dung: {
      id: user.id,
      ho_ten: user.ho_ten,
      email: user.email,
      vai_tro: user.vai_tro,
    },
  });
});

// ---------- ĐĂNG XUẤT ----------
router.post('/dang-xuat', (req, res) => {
  res.clearCookie('token', cookieOptions());
  res.json({ thong_bao: 'Đã đăng xuất.' });
});

// ---------- LẤY THÔNG TIN NGƯỜI DÙNG ĐANG ĐĂNG NHẬP ----------
router.get('/toi', requireAuth, async (req, res) => {
  const ketQua = await pool.query(
    'SELECT id, ho_ten, ten_doanh_nghiep, email, vai_tro FROM users WHERE id = $1',
    [req.user.id]
  );
  // requireAuth đã kiểm tra user tồn tại, nhưng vẫn có thể bị xóa đúng lúc
  // giữa 2 truy vấn (race condition hiếm) — xử lý tường minh thay vì trả về
  // { nguoi_dung: undefined } gây khó hiểu cho phía client.
  if (ketQua.rows.length === 0) {
    return res.status(404).json({ loi: 'Không tìm thấy người dùng.' });
  }
  res.json({ nguoi_dung: ketQua.rows[0] });
});

module.exports = router;
