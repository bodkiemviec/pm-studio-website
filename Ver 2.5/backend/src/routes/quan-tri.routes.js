const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Mọi route bên dưới đều yêu cầu đã đăng nhập với vai trò admin
router.use(requireAuth, requireRole('admin'));

// ---------- DANH SÁCH KHÁCH HÀNG ----------
router.get('/khach-hang', async (req, res) => {
  const ketQua = await pool.query(
    `SELECT id, ho_ten, ten_doanh_nghiep, email, created_at
     FROM users WHERE vai_tro = 'khach_hang' ORDER BY created_at DESC`
  );
  res.json({ khach_hang: ketQua.rows });
});

// ---------- DANH SÁCH TOÀN BỘ DỰ ÁN ----------
router.get('/du-an', async (req, res) => {
  const ketQua = await pool.query(
    `SELECT p.*, u.ho_ten AS ten_khach_hang, u.ten_doanh_nghiep
     FROM projects p JOIN users u ON u.id = p.customer_id
     ORDER BY p.created_at DESC`
  );
  res.json({ du_an: ketQua.rows });
});

// ---------- TẠO DỰ ÁN MỚI CHO 1 KHÁCH HÀNG ----------
router.post('/du-an', async (req, res) => {
  const { customer_id, ten_du_an, loai } = req.body;
  if (!customer_id || !ten_du_an) {
    return res.status(400).json({ loi: 'Thiếu customer_id hoặc ten_du_an.' });
  }

  // Đảm bảo customer_id thực sự là 1 tài khoản khách hàng — tránh gán nhầm
  // dự án cho tài khoản admin hoặc id không tồn tại.
  const nguoiDung = await pool.query('SELECT vai_tro FROM users WHERE id = $1', [customer_id]);
  if (nguoiDung.rows.length === 0 || nguoiDung.rows[0].vai_tro !== 'khach_hang') {
    return res.status(400).json({ loi: 'customer_id không hợp lệ hoặc không phải tài khoản khách hàng.' });
  }

  const ketQua = await pool.query(
    `INSERT INTO projects (customer_id, ten_du_an, loai) VALUES ($1, $2, $3) RETURNING *`,
    [customer_id, ten_du_an, loai || null]
  );
  res.status(201).json({ du_an: ketQua.rows[0] });
});

// ---------- CẬP NHẬT TRẠNG THÁI 1 BƯỚC TIẾN ĐỘ ----------
router.put('/tien-do/:stepId', async (req, res) => {
  const { trang_thai } = req.body;
  const hopLe = ['cho_xu_ly', 'dang_lam', 'hoan_thanh'];
  if (!hopLe.includes(trang_thai)) {
    return res.status(400).json({ loi: 'Trạng thái không hợp lệ.' });
  }
  const ketQua = await pool.query(
    `UPDATE project_steps SET trang_thai = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [trang_thai, req.params.stepId]
  );
  if (ketQua.rows.length === 0) return res.status(404).json({ loi: 'Không tìm thấy bước này.' });
  res.json({ buoc: ketQua.rows[0] });
});

// ---------- XÁC NHẬN 1 KHOẢN THANH TOÁN ĐÃ NHẬN ----------
router.put('/thanh-toan/:id/xac-nhan', async (req, res) => {
  const hienTai = await pool.query('SELECT trang_thai FROM payments WHERE id = $1', [req.params.id]);
  if (hienTai.rows.length === 0) {
    return res.status(404).json({ loi: 'Không tìm thấy khoản thanh toán.' });
  }
  if (hienTai.rows[0].trang_thai === 'da_thanh_toan') {
    return res.status(400).json({ loi: 'Khoản thanh toán này đã được xác nhận trước đó.' });
  }

  const ketQua = await pool.query(
    `UPDATE payments SET trang_thai = 'da_thanh_toan', ngay_thanh_toan = NOW()
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  res.json({ thanh_toan: ketQua.rows[0] });
});

// ---------- LỊCH TƯ VẤN ----------
router.get('/tu-van', async (req, res) => {
  const ketQua = await pool.query('SELECT * FROM consultations ORDER BY thoi_gian_hen ASC');
  res.json({ lich_hen: ketQua.rows });
});

// ---------- XÁC NHẬN 1 LỊCH TƯ VẤN ----------
router.put('/tu-van/:id/xac-nhan', async (req, res) => {
  const ketQua = await pool.query(
    `UPDATE consultations SET trang_thai = 'da_xac_nhan' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (ketQua.rows.length === 0) return res.status(404).json({ loi: 'Không tìm thấy lịch tư vấn.' });
  res.json({ lich_hen: ketQua.rows[0] });
});

// ---------- DANH SÁCH ĐƠN HÀNG (đặt mẫu website) ----------
router.get('/don-hang', async (req, res) => {
  const ketQua = await pool.query(
    `SELECT o.*, u.ho_ten AS ten_khach_hang, u.ten_doanh_nghiep
     FROM orders o LEFT JOIN users u ON u.id = o.customer_id
     ORDER BY o.created_at DESC`
  );
  res.json({ don_hang: ketQua.rows });
});

// ---------- XÁC NHẬN 1 ĐƠN HÀNG ----------
router.put('/don-hang/:id/xac-nhan', async (req, res) => {
  const ketQua = await pool.query(
    `UPDATE orders SET trang_thai = 'da_xac_nhan' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (ketQua.rows.length === 0) return res.status(404).json({ loi: 'Không tìm thấy đơn hàng.' });
  res.json({ don_hang: ketQua.rows[0] });
});

// ---------- TỪ CHỐI 1 ĐƠN HÀNG ----------
router.put('/don-hang/:id/tu-choi', async (req, res) => {
  const ketQua = await pool.query(
    `UPDATE orders SET trang_thai = 'da_huy' WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (ketQua.rows.length === 0) return res.status(404).json({ loi: 'Không tìm thấy đơn hàng.' });
  res.json({ don_hang: ketQua.rows[0] });
});

module.exports = router;
