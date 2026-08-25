const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, THU_MUC_UPLOAD, kiemTraChuKyFile, HAN_MUC_MOI_USER, HAN_MUC_MOI_DU_AN } = require('../middleware/upload');

const router = express.Router();

// Mọi route bên dưới đều yêu cầu đã đăng nhập với vai trò khách hàng
router.use(requireAuth, requireRole('khach_hang'));

// ---------- DANH SÁCH DỰ ÁN CỦA TÔI ----------
router.get('/du-an', async (req, res) => {
  const ketQua = await pool.query(
    'SELECT * FROM projects WHERE customer_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ du_an: ketQua.rows });
});

// ---------- TIẾN ĐỘ CỦA 1 DỰ ÁN (chỉ xem được dự án của chính mình) ----------
router.get('/du-an/:id/tien-do', async (req, res) => {
  const duAn = await kiemTraDuAnThuocVeToi(req.params.id, req.user.id);
  if (!duAn) return res.status(404).json({ loi: 'Không tìm thấy dự án.' });

  const ketQua = await pool.query(
    'SELECT * FROM project_steps WHERE project_id = $1 ORDER BY thu_tu ASC',
    [req.params.id]
  );
  res.json({ cac_buoc: ketQua.rows });
});

// ---------- THANH TOÁN CỦA 1 DỰ ÁN ----------
router.get('/du-an/:id/thanh-toan', async (req, res) => {
  const duAn = await kiemTraDuAnThuocVeToi(req.params.id, req.user.id);
  if (!duAn) return res.status(404).json({ loi: 'Không tìm thấy dự án.' });

  const ketQua = await pool.query(
    'SELECT * FROM payments WHERE project_id = $1 ORDER BY dot_so ASC',
    [req.params.id]
  );
  res.json({ thanh_toan: ketQua.rows });
});

// ---------- TÀI LIỆU CỦA 1 DỰ ÁN ----------
router.get('/du-an/:id/tai-lieu', async (req, res) => {
  const duAn = await kiemTraDuAnThuocVeToi(req.params.id, req.user.id);
  if (!duAn) return res.status(404).json({ loi: 'Không tìm thấy dự án.' });

  const ketQua = await pool.query(
    'SELECT * FROM documents WHERE project_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json({ tai_lieu: ketQua.rows });
});

// ---------- TẢI LÊN 1 TÀI LIỆU CHO DỰ ÁN ----------
// Kiểm tra quyền sở hữu dự án TRƯỚC khi cho multer ghi file ra đĩa — nếu
// kiểm tra sau (như trước đây), người dùng không có quyền vẫn khiến server
// ghi file rác ra ổ đĩa trước khi bị từ chối, lãng phí tài nguyên và có thể
// bị lợi dụng để làm đầy dung lượng ổ đĩa.
//
// Quy trình chống file mồ côi + vượt quota:
// 1) Kiểm tra quyền sở hữu (không tốn IO đĩa nếu sai).
// 2) Kiểm tra "đã vượt quota chưa" TRƯỚC khi ghi file (chặn sớm, không ghi
//    thêm byte nào nếu user/dự án đã đầy hạn mức).
// 3) multer ghi file thật ra đĩa.
// 4) Kiểm tra chữ ký nhị phân + kiểm tra "cộng thêm file này có vượt quota
//    không" bằng kích thước thật (req.file.size) — sai ở bước nào cũng xóa
//    file vừa ghi (unlink) trước khi trả lỗi, không để lại file mồ côi.
// 5) INSERT DB; nếu INSERT lỗi (catch dbErr) cũng xóa file — đây là điểm mà
//    "file mồ côi" hay xảy ra nhất nếu không dọn thủ công.
router.post('/du-an/:id/tai-lieu', async (req, res) => {
  const duAn = await kiemTraDuAnThuocVeToi(req.params.id, req.user.id);
  if (!duAn) return res.status(404).json({ loi: 'Không tìm thấy dự án.' });

  const [dungLuongUser, dungLuongDuAn] = await Promise.all([
    layTongDungLuongTheoUser(req.user.id),
    layTongDungLuongTheoDuAn(req.params.id),
  ]);

  if (dungLuongUser >= HAN_MUC_MOI_USER) {
    return res.status(413).json({ loi: 'Bạn đã dùng hết hạn mức lưu trữ tài liệu. Vui lòng xóa bớt tài liệu cũ.' });
  }
  if (dungLuongDuAn >= HAN_MUC_MOI_DU_AN) {
    return res.status(413).json({ loi: 'Dự án này đã dùng hết hạn mức lưu trữ tài liệu. Vui lòng xóa bớt tài liệu cũ.' });
  }

  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ loi: err.message || 'Tải file lên thất bại.' });
    }
    if (!req.file) {
      return res.status(400).json({ loi: 'Vui lòng chọn 1 file để tải lên.' });
    }

    const duongDanFile = path.join(THU_MUC_UPLOAD, req.file.filename);
    const xoaFileVuaTaiLen = () => fs.promises.unlink(duongDanFile).catch(() => {});

    try {
      // Kiểm tra chính xác bằng kích thước thật của file vừa lưu — kiểm tra
      // ở bước trước chỉ dựa trên dữ liệu cũ, chưa tính file đang tải lên này.
      if (dungLuongUser + req.file.size > HAN_MUC_MOI_USER) {
        await xoaFileVuaTaiLen();
        return res.status(413).json({ loi: 'File này vượt quá hạn mức lưu trữ còn lại của bạn.' });
      }
      if (dungLuongDuAn + req.file.size > HAN_MUC_MOI_DU_AN) {
        await xoaFileVuaTaiLen();
        return res.status(413).json({ loi: 'File này vượt quá hạn mức lưu trữ còn lại của dự án.' });
      }

      // Kiểm tra chữ ký nhị phân thật của file khớp với đuôi file khai báo —
      // chặn file độc hại giả đuôi hợp lệ (VD: đổi tên script thành ảnh .jpg).
      const chuKyHopLe = await kiemTraChuKyFile(duongDanFile, req.file.originalname);
      if (!chuKyHopLe) {
        await xoaFileVuaTaiLen();
        return res.status(400).json({ loi: 'Nội dung file không khớp với định dạng đã khai báo.' });
      }

      const ketQua = await pool.query(
        `INSERT INTO documents (project_id, ten_file, duong_dan, kich_thuoc, loai, tai_len_boi)
         VALUES ($1, $2, $3, $4, 'da_tai_len', $5) RETURNING *`,
        [req.params.id, req.file.originalname, req.file.filename, req.file.size, req.user.id]
      );
      res.status(201).json({ tai_lieu: ketQua.rows[0] });
    } catch (dbErr) {
      // upload.single() gọi callback này ngoài luồng promise của handler
      // async bên ngoài, nên express-async-errors KHÔNG bắt được lỗi ở đây —
      // phải tự try/catch, nếu không client sẽ treo tới khi hết timeout.
      // INSERT thất bại (DB lỗi/mất kết nối) là nơi dễ sinh file mồ côi nhất
      // nếu không dọn ở đây — file đã nằm trên đĩa nhưng DB không có bản ghi.
      console.error(dbErr);
      await xoaFileVuaTaiLen();
      res.status(500).json({ loi: 'Có lỗi xảy ra ở máy chủ, vui lòng thử lại.' });
    }
  });
});

// ---------- TẢI XUỐNG 1 TÀI LIỆU (chỉ chủ dự án mới tải được) ----------
router.get('/tai-lieu/:id/tai-xuong', async (req, res) => {
  const ketQua = await pool.query(
    `SELECT d.* FROM documents d
     JOIN projects p ON p.id = d.project_id
     WHERE d.id = $1 AND p.customer_id = $2`,
    [req.params.id, req.user.id]
  );
  const taiLieu = ketQua.rows[0];
  if (!taiLieu) return res.status(404).json({ loi: 'Không tìm thấy tài liệu.' });

  res.download(path.join(THU_MUC_UPLOAD, taiLieu.duong_dan), taiLieu.ten_file);
});

// Hàm dùng chung: đảm bảo khách hàng chỉ xem được dữ liệu của chính họ,
// không thể sửa URL để xem dự án của người khác (bảo mật quan trọng!)
async function kiemTraDuAnThuocVeToi(projectId, customerId) {
  const ketQua = await pool.query(
    'SELECT * FROM projects WHERE id = $1 AND customer_id = $2',
    [projectId, customerId]
  );
  return ketQua.rows[0];
}

// Tổng dung lượng (byte) tất cả tài liệu thuộc các dự án của 1 khách hàng —
// dùng để áp quota tổng theo user, không phân biệt tài liệu ở dự án nào.
async function layTongDungLuongTheoUser(customerId) {
  const ketQua = await pool.query(
    `SELECT COALESCE(SUM(d.kich_thuoc), 0) AS tong
     FROM documents d JOIN projects p ON p.id = d.project_id
     WHERE p.customer_id = $1`,
    [customerId]
  );
  return Number(ketQua.rows[0].tong);
}

// Tổng dung lượng (byte) tài liệu của riêng 1 dự án — dùng để áp quota theo dự án.
async function layTongDungLuongTheoDuAn(projectId) {
  const ketQua = await pool.query(
    `SELECT COALESCE(SUM(kich_thuoc), 0) AS tong FROM documents WHERE project_id = $1`,
    [projectId]
  );
  return Number(ketQua.rows[0].tong);
}

module.exports = router;
