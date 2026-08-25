/**
 * Dọn "file mồ côi" trong thư mục uploads — file nằm trên đĩa nhưng KHÔNG
 * có bản ghi tương ứng trong bảng documents (do request bị hủy giữa chừng,
 * server crash sau khi lưu file nhưng trước khi INSERT DB, v.v).
 *
 * Chạy thủ công:
 *   npm run cleanup-uploads
 *
 * Khuyến nghị chạy định kỳ (VD: cron mỗi đêm) vì đây chỉ là lớp phòng vệ
 * bổ sung — luồng upload chính (khach-hang.routes.js) đã tự xóa file nếu
 * INSERT DB thất bại ngay trong cùng request, nên bình thường sẽ không có
 * gì để dọn; script này xử lý các trường hợp hiếm hơn (crash tiến trình,
 * mất kết nối DB đúng lúc, client ngắt kết nối giữa chừng...).
 *
 * An toàn: CHỈ xóa file có thời gian sửa đổi (mtime) cũ hơn NGUONG_TUOI_MS
 * (mặc định 1 giờ) để không xóa nhầm file của 1 upload đang chạy dở cùng lúc
 * script này thực thi.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db/pool');
const { THU_MUC_UPLOAD } = require('../middleware/upload');

const NGUONG_TUOI_MS = 60 * 60 * 1000; // chỉ xóa file cũ hơn 1 giờ

async function chay() {
  console.log('🔍 Đang quét file mồ côi trong: ' + THU_MUC_UPLOAD);

  const ketQuaDb = await pool.query('SELECT duong_dan FROM documents');
  const filesTrongDb = new Set(ketQuaDb.rows.map((r) => r.duong_dan));

  const filesTrenDia = await fs.promises.readdir(THU_MUC_UPLOAD).catch(() => []);

  let soLuongDaXoa = 0;
  let dungLuongDaGiaiPhong = 0;

  for (const tenFile of filesTrenDia) {
    if (filesTrongDb.has(tenFile)) continue; // có trong DB -> không phải mồ côi

    const duongDanDayDu = path.join(THU_MUC_UPLOAD, tenFile);
    const thongTin = await fs.promises.stat(duongDanDayDu).catch(() => null);
    if (!thongTin) continue;

    const tuoiFile = Date.now() - thongTin.mtimeMs;
    if (tuoiFile < NGUONG_TUOI_MS) {
      console.log(`⏭️  Bỏ qua (còn quá mới, có thể đang upload dở): ${tenFile}`);
      continue;
    }

    await fs.promises.unlink(duongDanDayDu);
    soLuongDaXoa += 1;
    dungLuongDaGiaiPhong += thongTin.size;
    console.log(`🗑️  Đã xóa file mồ côi: ${tenFile} (${(thongTin.size / 1024).toFixed(1)} KB)`);
  }

  console.log('---');
  console.log(`✅ Hoàn tất. Đã xóa ${soLuongDaXoa} file, giải phóng ${(dungLuongDaGiaiPhong / (1024 * 1024)).toFixed(2)} MB.`);

  await pool.end();
}

chay().catch((err) => {
  console.error('❌ Lỗi khi dọn file mồ côi:', err);
  process.exit(1);
});
