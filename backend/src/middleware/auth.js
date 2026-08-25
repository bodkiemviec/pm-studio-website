const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

// Kiểm tra người dùng đã đăng nhập chưa (đọc token từ cookie httpOnly).
// Token hợp lệ về chữ ký/hạn không có nghĩa user vẫn còn tồn tại trong DB
// (VD: admin xóa tài khoản nhưng client vẫn giữ cookie cũ) — nên sau khi
// verify token, luôn truy vấn lại DB 1 lần để chắc chắn user còn tồn tại
// và lấy vai_tro mới nhất (phòng trường hợp vai trò bị đổi sau khi đăng nhập).
async function requireAuth(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ loi: 'Bạn chưa đăng nhập.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ loi: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' });
  }

  const ketQua = await pool.query(
    'SELECT id, email, vai_tro FROM users WHERE id = $1',
    [payload.id]
  );
  if (ketQua.rows.length === 0) {
    return res.status(401).json({ loi: 'Tài khoản không còn tồn tại, vui lòng đăng nhập lại.' });
  }

  req.user = ketQua.rows[0]; // { id, email, vai_tro }
  next();
}

// Chỉ cho phép 1 vai trò cụ thể đi tiếp (dùng sau requireAuth)
// Ví dụ: requireRole('admin')
function requireRole(vaiTro) {
  return (req, res, next) => {
    if (req.user.vai_tro !== vaiTro) {
      return res.status(403).json({ loi: 'Bạn không có quyền truy cập mục này.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
