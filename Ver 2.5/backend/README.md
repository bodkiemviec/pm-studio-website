# PM Studio — Backend

Backend cho website PM Studio: đăng ký, đăng nhập (khách hàng + quản trị), quản lý dự án, tiến độ, thanh toán, tài liệu, lịch tư vấn.

## Công nghệ
- Node.js + Express
- PostgreSQL (qua thư viện `pg`)
- Mật khẩu mã hóa bằng `bcrypt`
- Đăng nhập bằng JWT lưu trong cookie `httpOnly` (an toàn hơn localStorage)

## Cài đặt lần đầu

1. Cài Node.js (bản 18 trở lên) và PostgreSQL trên máy.
2. Tạo 1 database rỗng, ví dụ tên `pm_studio`:
   ```
   createdb pm_studio
   ```
3. Vào thư mục backend, cài thư viện:
   ```
   cd backend
   npm install
   ```
4. Copy file `.env.example` thành `.env`, sửa lại `DATABASE_URL` và `JWT_SECRET` cho đúng máy bạn.
5. Tạo bảng trong database:
   ```
   npm run init-db
   ```
6. Chạy server (tự khởi động lại khi sửa code):
   ```
   npm run dev
   ```
   Server chạy ở `http://localhost:4000`.

## Tạo tài khoản admin đầu tiên

Hiện tại API đăng ký (`/api/auth/dang-ky`) chỉ tạo tài khoản khách hàng. Để tạo tài khoản admin đầu tiên, chạy lệnh SQL trực tiếp sau khi đã đăng ký 1 tài khoản bất kỳ qua trang web:

```sql
UPDATE users SET vai_tro = 'admin' WHERE email = 'email-cua-ban@vidu.com';
```

## Danh sách API chính

| Method | Đường dẫn | Mô tả | Cần đăng nhập? |
|---|---|---|---|
| POST | /api/auth/dang-ky | Đăng ký tài khoản khách hàng | Không |
| POST | /api/auth/dang-nhap | Đăng nhập (khách hàng hoặc admin) | Không |
| POST | /api/auth/dang-xuat | Đăng xuất | Không |
| GET  | /api/auth/toi | Lấy thông tin người đang đăng nhập | Có |
| GET  | /api/khach-hang/du-an | Danh sách dự án của tôi | Có (khách hàng) |
| GET  | /api/khach-hang/du-an/:id/tien-do | Tiến độ 1 dự án | Có (khách hàng) |
| GET  | /api/khach-hang/du-an/:id/thanh-toan | Thanh toán 1 dự án | Có (khách hàng) |
| GET  | /api/khach-hang/du-an/:id/tai-lieu | Tài liệu 1 dự án | Có (khách hàng) |
| GET  | /api/quan-tri/khach-hang | Danh sách toàn bộ khách hàng | Có (admin) |
| GET  | /api/quan-tri/du-an | Danh sách toàn bộ dự án | Có (admin) |
| POST | /api/quan-tri/du-an | Tạo dự án mới cho khách hàng | Có (admin) |
| PUT  | /api/quan-tri/tien-do/:stepId | Cập nhật trạng thái 1 bước tiến độ | Có (admin) |
| PUT  | /api/quan-tri/thanh-toan/:id/xac-nhan | Xác nhận đã nhận thanh toán | Có (admin) |
| GET  | /api/quan-tri/tu-van | Danh sách lịch tư vấn | Có (admin) |
| POST | /api/dat-lich-tu-van | Đặt lịch tư vấn (khách vãng lai) | Không |

## Nối với frontend

Trong thư mục frontend đã có sẵn:
- `api.js` — gọi API, đổi `PM_API_BASE` thành domain backend thật khi deploy.
- `auth-guard.js` — chặn truy cập trang nếu chưa đăng nhập đúng vai trò
  (gắn qua thuộc tính `data-role` trên chính thẻ `<script>`, xem ví dụ
  trong `khach-hang/index.html` hoặc `quan-tri/index.html`).

Đã áp dụng sẵn cho:
- `dang-nhap.html`, `dang-ky.html`, `quan-tri/dang-nhap.html` — gọi API đăng nhập/đăng ký thật.
- `khach-hang/index.html`, `quan-tri/index.html` — được `auth-guard.js` bảo vệ, hiện tên người dùng thật, nút Đăng xuất gọi API thật.

**Việc cần làm tiếp:** áp dụng `auth-guard.js` tương tự cho các trang còn lại trong `khach-hang/` (du-an.html, tien-do.html, thanh-toan.html, tai-lieu.html, chinh-sua.html) và `quan-tri/` (khach-hang.html, du-an.html, don-hang.html, tu-van.html, mau-website.html, ...), rồi thay dữ liệu mẫu (hard-code) trong các trang đó bằng dữ liệu lấy từ API tương ứng (dùng `PMAPI.khachHang.*` / `PMAPI.quanTri.*` đã có sẵn trong `api.js`).

## Bước tiếp theo nên làm trước khi đưa lên production thật

1. Thêm giới hạn số lần thử đăng nhập sai (rate limiting) để chống dò mật khẩu.
2. Thêm xác thực email khi đăng ký.
3. Làm chức năng "Quên mật khẩu" (gửi email link đặt lại mật khẩu).
4. Bật HTTPS và đặt `secure: true` cho cookie khi deploy thật.
5. Sao lưu (backup) database định kỳ.
6. Thêm chức năng tải file thật cho mục "Tài liệu" (dùng thư viện `multer` đã có sẵn trong `package.json`, kết hợp dịch vụ lưu file như AWS S3 hoặc Cloudinary).
