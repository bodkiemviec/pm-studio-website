/**
 * Điền lại cột documents.kich_thuoc cho các bản ghi cũ (tạo trước khi cột
 * này tồn tại, nên đang mặc định = 0) bằng cách đọc kích thước thật của
 * file tương ứng trên đĩa. Chỉ cần chạy 1 LẦN sau khi thêm cột kich_thuoc
 * vào DB đã có sẵn dữ liệu (xem ghi chú MIGRATION trong sql/schema.sql).
 *
 * Chạy: node src/scripts/dien-lai-kich-thuoc.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { THU_MUC_UPLOAD } = require('../middleware/upload');

async function chay() {
  const ketQua = await pool.query(
    `SELECT id, duong_dan FROM documents WHERE kich_thuoc = 0`
  );

  console.log(`🔍 Tìm thấy ${ketQua.rows.length} tài liệu chưa có kích thước.`);
  let soLuongDaCapNhat = 0;

  for (const taiLieu of ketQua.rows) {
    const duongDanDayDu = path.join(THU_MUC_UPLOAD, taiLieu.duong_dan);
    const thongTin = await fs.promises.stat(duongDanDayDu).catch(() => null);

    if (!thongTin) {
      console.log(`⚠️  Không tìm thấy file trên đĩa cho tài liệu #${taiLieu.id} (${taiLieu.duong_dan}) — bỏ qua.`);
      continue;
    }

    await pool.query('UPDATE documents SET kich_thuoc = $1 WHERE id = $2', [thongTin.size, taiLieu.id]);
    soLuongDaCapNhat += 1;
  }

  console.log(`✅ Đã cập nhật kích thước cho ${soLuongDaCapNhat} tài liệu.`);
  await pool.end();
}

chay().catch((err) => {
  console.error('❌ Lỗi khi điền lại kích thước file:', err);
  process.exit(1);
});
