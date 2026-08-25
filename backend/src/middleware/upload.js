const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Thư mục lưu file tải lên — nằm ngoài phạm vi commit (xem .gitignore).
const THU_MUC_UPLOAD = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(THU_MUC_UPLOAD)) {
  fs.mkdirSync(THU_MUC_UPLOAD, { recursive: true });
}

// Các loại file được phép khách hàng tải lên (ảnh, tài liệu văn phòng, nén).
const DUOI_FILE_CHO_PHEP = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip',
]);

// Chữ ký nhị phân (magic bytes) thật của từng loại file — dùng để chặn file
// giả đuôi (VD: đổi tên script.php.jpg thành ảnh) vì fileFilter của multer
// chỉ nhìn được phần đuôi tên file, không nhìn được nội dung thật bên trong.
// docx/xlsx/zip đều là file ZIP thật (PK\x03\x04); doc/xls cũ hơn dùng định
// dạng OLE (\xD0\xCF\x11\xE0...) nên cả 2 chữ ký đều được chấp nhận cho chúng.
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04];
const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const CHU_KY_THEO_DUOI = {
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  '.gif': [[0x47, 0x49, 0x46, 0x38]],
  '.webp': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF' — 4 byte 'WEBP' tiếp theo được kiểm ở kiemTraChuKyFile
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // '%PDF'
  '.zip': [ZIP_SIG],
  '.docx': [ZIP_SIG],
  '.xlsx': [ZIP_SIG],
  '.doc': [OLE_SIG, ZIP_SIG],
  '.xls': [OLE_SIG, ZIP_SIG],
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, THU_MUC_UPLOAD);
  },
  filename(req, file, cb) {
    // Giữ lại phần đuôi file gốc, đặt tên vật lý ngẫu nhiên để tránh trùng
    // lặp / ghi đè lẫn nhau và tránh path traversal qua tên file người dùng.
    const duoi = path.extname(file.originalname).toLowerCase();
    const tenNgauNhien = Date.now() + '-' + Math.round(Math.random() * 1e9) + duoi;
    cb(null, tenNgauNhien);
  },
});

function locFile(req, file, cb) {
  const duoi = path.extname(file.originalname).toLowerCase();
  if (!DUOI_FILE_CHO_PHEP.has(duoi)) {
    return cb(new Error('Định dạng file không được hỗ trợ.'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: locFile,
  limits: {
    fileSize: 25 * 1024 * 1024, // tối đa 25MB / file
    files: 1, // chỉ 1 file / request (khớp với upload.single() ở route)
  },
});

// Hạn mức tổng dung lượng tài liệu — đọc từ biến môi trường nếu có, để dễ
// chỉnh theo gói dịch vụ mà không phải sửa code. Đơn vị trong .env là MB.
const HAN_MUC_MOI_USER = (Number(process.env.QUOTA_USER_MB) || 200) * 1024 * 1024; // mặc định 200MB / khách hàng
const HAN_MUC_MOI_DU_AN = (Number(process.env.QUOTA_PROJECT_MB) || 100) * 1024 * 1024; // mặc định 100MB / dự án

/**
 * Đọc vài byte đầu của file đã lưu trên đĩa và so với chữ ký nhị phân thật
 * của định dạng tương ứng với đuôi file. Trả về true nếu khớp (hoặc nếu đuôi
 * không nằm trong danh sách cần kiểm — không nên xảy ra vì đã lọc ở fileFilter).
 * Dùng SAU khi multer đã lưu file, vì diskStorage ghi thẳng ra đĩa dạng
 * stream nên không có buffer nội dung sẵn trong fileFilter để kiểm trước.
 * @param {string} filePath - đường dẫn tuyệt đối tới file đã lưu
 * @param {string} originalName - tên file gốc người dùng đặt (lấy đuôi từ đây)
 * @returns {Promise<boolean>}
 */
async function kiemTraChuKyFile(filePath, originalName) {
  const duoi = path.extname(originalName).toLowerCase();
  const dsChuKy = CHU_KY_THEO_DUOI[duoi];
  if (!dsChuKy) return true; // đuôi lạ đã bị chặn từ fileFilter trước đó rồi

  const soByteCanDoc = Math.max(...dsChuKy.map((sig) => sig.length), 12);
  const fileHandle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(soByteCanDoc);
    await fileHandle.read(buffer, 0, soByteCanDoc, 0);

    if (duoi === '.webp') {
      // RIFF <4 byte size> WEBP — kiểm cả 'RIFF' ở đầu và 'WEBP' ở byte 8-11
      return buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP';
    }

    return dsChuKy.some((sig) => sig.every((byte, i) => buffer[i] === byte));
  } finally {
    await fileHandle.close();
  }
}

module.exports = { upload, THU_MUC_UPLOAD, kiemTraChuKyFile, HAN_MUC_MOI_USER, HAN_MUC_MOI_DU_AN };
