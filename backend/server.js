require('dotenv').config();

// Dừng server ngay khi thiếu biến môi trường bắt buộc, thay vì chạy "âm thầm
// sai" — VD: thiếu JWT_SECRET khiến jwt.sign() ký token bằng undefined, tạo
// ra token không an toàn (hoặc lỗi khó hiểu) thay vì báo lỗi rõ ràng lúc khởi động.
const BIEN_MOI_TRUONG_BAT_BUOC = ['JWT_SECRET', 'DATABASE_URL', 'FRONTEND_ORIGIN'];
const bienConThieu = BIEN_MOI_TRUONG_BAT_BUOC.filter((ten) => !process.env[ten]);
if (bienConThieu.length > 0) {
  console.error('❌ Thiếu biến môi trường bắt buộc: ' + bienConThieu.join(', '));
  console.error('   Kiểm tra file .env (xem .env.example để biết các biến cần thiết).');
  process.exit(1);
}

const express = require('express');
// Vá Express 4 để lỗi ném ra (hoặc reject) trong route/middleware async
// được tự động chuyển tới error handler bên dưới, thay vì trở thành
// "unhandled promise rejection" có thể làm sập tiến trình Node.
// Phải require TRƯỚC khi khai báo bất kỳ route nào.
require('express-async-errors');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const authRoutes = require('./src/routes/auth.routes');
const khachHangRoutes = require('./src/routes/khach-hang.routes');
const quanTriRoutes = require('./src/routes/quan-tri.routes');
const publicRoutes = require('./src/routes/public.routes');

const app = express();

// Nếu chạy sau reverse proxy (Nginx, load balancer...) thì bật để
// express-rate-limit và req.ip đọc đúng IP thật của client thay vì IP proxy.
app.set('trust proxy', 1);

// Thêm các security header cơ bản (X-Content-Type-Options, X-Frame-Options, ...)
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN, // domain frontend được phép gọi API
  credentials: true, // cho phép gửi cookie kèm request
}));
// Giới hạn kích thước body để tránh request quá lớn làm tốn tài nguyên
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/khach-hang', khachHangRoutes);
app.use('/api/quan-tri', quanTriRoutes);
app.use('/api', publicRoutes);

app.get('/api/health', (req, res) => res.json({ trang_thai: 'ok' }));

// ---------- 404: mọi route không khớp ở trên đều trả JSON, không phải HTML ----------
app.use((req, res) => {
  res.status(404).json({ loi: 'Không tìm thấy tài nguyên.' });
});

// ---------- ERROR HANDLER TOÀN CỤC (bắt buộc đặt cuối cùng) ----------
// Bắt mọi lỗi chưa được xử lý ở route (kể cả lỗi ném ra từ middleware như
// multer) để luôn trả JSON thay vì HTML mặc định của Express (lộ stack trace).
app.use((err, req, res, next) => {
  console.error('Lỗi chưa xử lý:', err);

  if (err.name === 'MulterError') {
    return res.status(400).json({ loi: 'Lỗi tải file lên: ' + err.message });
  }

  res.status(500).json({
    loi: 'Có lỗi xảy ra ở máy chủ, vui lòng thử lại.',
    ...(process.env.NODE_ENV === 'development' && { chi_tiet: err.message }),
  });
});

// ---------- BẮT LỖI Ở CẤP TIẾN TRÌNH ----------
// Promise bị reject mà không có .catch() hoặc lỗi ném ra ngoài mọi try/catch
// sẽ không làm sập server ngầm — log lại để biết mà xử lý, thay vì mất dấu vết.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
