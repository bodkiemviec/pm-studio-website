# CLAUDE.md

Bối cảnh cho AI làm việc trên project PM Studio (website studio thiết kế web). Đọc file này trước khi sửa code. Không giải thích dài — làm theo lệnh, tự kiểm tra bằng checklist cuối file.

## Cấu trúc

```
/                    → frontend tĩnh (HTML/CSS/JS thuần, không build step, không bundler)
/backend             → Node.js + Express + PostgreSQL
/backend/sql         → schema.sql
/backend/uploads     → file khách hàng upload (KHÔNG commit, đã có trong .gitignore)
```

## Lệnh chạy

```bash
# Backend — luôn chạy từ trong thư mục backend/
cd backend
npm install
cp .env.example .env        # rồi tự điền DATABASE_URL, JWT_SECRET thật
createdb pm_studio           # chỉ lần đầu, cần PostgreSQL đã cài sẵn
npm run init-db              # tạo bảng, đọc backend/sql/schema.sql — chạy lại an toàn (IF NOT EXISTS)
npm run dev                  # nodemon, tự reload — dùng khi dev
npm start                    # chạy production, không auto-reload

# Frontend — KHÔNG mở file .html trực tiếp bằng file://
# Phải serve qua HTTP server tại đúng cổng khớp FRONTEND_ORIGIN trong .env
npx serve -l 5500 .          # hoặc VSCode Live Server ở port 5500
```

## ⚠️ Cảnh báo môi trường — đọc kỹ trước khi chạy

- `api.js` **hard-code** `PM_API_BASE = 'http://localhost:4000'`. Nếu đổi cổng backend hoặc deploy domain khác, PHẢI sửa dòng này thủ công — không có biến môi trường ở frontend.
- Cookie JWT là `httpOnly` + `sameSite`. Frontend PHẢI chạy qua HTTP server (port khớp `FRONTEND_ORIGIN` trong `.env` backend, mặc định `5500`), không mở bằng `file://` — nếu không, auth sẽ luôn thất bại (cookie không gửi được).
- Không có tài khoản admin mặc định. Tạo bằng cách đăng ký 1 tài khoản qua UI rồi chạy SQL tay:
  ```sql
  UPDATE users SET vai_tro = 'admin' WHERE email = '...';
  ```
- `npm run init-db` **không xóa dữ liệu cũ** (`CREATE TABLE IF NOT EXISTS`) — nếu cần đổi schema cột đã tồn tại, phải tự viết `ALTER TABLE` hoặc drop bảng thủ công, init-db sẽ không tự làm.
- `backend/uploads/` phải tồn tại và ghi được — không tự tạo nếu thiếu, multer sẽ lỗi.

## Test

**Không có test tự động (không có Jest/Mocha/Playwright, không CI).** Kiểm tra thủ công là bắt buộc sau mỗi thay đổi:

1. Backend còn chạy không lỗi: `npm run dev`, xem log console — không có stack trace khi gọi thử API bằng curl/Postman.
2. Với thay đổi route: gọi thử bằng `curl` kèm cookie thật (đăng nhập trước qua UI, copy cookie), kiểm tra status code + JSON trả về đúng field tiếng Việt có dấu gạch dưới (`ho_ten`, không phải `ho-ten` hay camelCase).
3. Với thay đổi frontend JS: mở DevTools Console, xác nhận không có lỗi đỏ khi load trang và khi submit form.
4. Với thay đổi liên quan quyền (`requireAuth`, `requireRole`, ownership check): test bằng 2 tài khoản khác nhau (khách hàng A không được thấy dữ liệu khách hàng B) — đây là lớp bảo mật quan trọng nhất của project, không được để hồi quy.

## Quy ước bắt buộc tuân theo

- Toàn bộ tên field API, route, biến CSDL dùng **tiếng Việt không dấu, snake_case** (`ho_ten`, `trang_thai`, `goi_dich_vu`) — không đổi sang tiếng Anh hay camelCase dù chỉ ở 1 file.
- Toast/loading/modal/validate form dùng qua `PMUI` (`ui.js`): `PMUI.toast()`, `PMUI.setLoading()`, `PMUI.validateForm()`, `PMUI.markFieldError()`, `PMUI.openModal()`, `PMUI.setupTableFilter()`. Không dùng `alert()`, `confirm()`, hay tự viết hàm toast/loading mới.
- Mọi chỗ chèn dữ liệu động vào `innerHTML` phải qua `PMUI.escapeHTML()`. Ngoại lệ: `PMUI.openModal({ title })` hiện **CHƯA escape title** — nếu truyền dữ liệu động vào `title`, tự escape tay trước khi có ai sửa `ui.js`.
- Mật khẩu hash bằng `bcrypt`, JWT ký bằng `JWT_SECRET` trong `.env`, lưu ở cookie `httpOnly` — không bao giờ đổi sang lưu token ở `localStorage`.
- Không thêm secrets/API key/mật khẩu thật vào bất kỳ file `.js`/`.html` nào. Chỉ vào `.env` (backend, không commit).
- Route khách hàng (`khach-hang.routes.js`) phải luôn kiểm tra `customer_id === req.user.id` trước khi trả dữ liệu — không tin `:id` trên URL.
- Không xóa `.gitignore`, không commit `node_modules/`, `backend/.env`, `backend/uploads/`.

## Nợ kỹ thuật đã biết — đừng coi là bug cần tự sửa nếu không được yêu cầu

- Backend chưa có API tạo đơn hàng thật (`orders` table thiếu cột giá/màu/ghi chú) — form đặt mẫu hiện chỉ demo (`console.log`), không lưu DB.
- Thanh toán chỉ là `setTimeout` giả lập — chưa có payment API thật.
- 3 trang mẫu website phụ (`mau-website/chi-tiet-cf.html`, `chi-tiet-gy.html`, `chi-tiet-vp.html`) **chưa nạp `chi-tiet.js`** — chọn màu/submit không hoạt động.
- 4 trang tĩnh hoàn toàn chưa có `<script>` nào: `khach-hang/du-an.html`, `quan-tri/du-an-chi-tiet.html`, `quan-tri/khach-hang-chi-tiet.html`, `quan-tri/mau-website.html`.
- Trang chi tiết dự án/khách hàng (admin) chưa nhận `id` qua URL — luôn hiển thị cùng 1 bộ dữ liệu tĩnh.
- Upload: kiểm tra quyền sở hữu project xảy ra **sau khi** file đã ghi xuống đĩa — biết trước, chưa fix.
- Quên mật khẩu: có UI, chưa có API.

## Trước khi báo "đã xong" với người dùng

- [ ] `npm run dev` không có lỗi trong log
- [ ] Test tay đúng luồng vừa sửa (xem mục Test ở trên)
- [ ] Không thêm file/thư mục ngoài phạm vi được yêu cầu
- [ ] Không đổi cấu trúc HTML/class hiện có nếu không được yêu cầu — nhiều trang phụ thuộc `styles.css` chung, đổi class ở 1 nơi dễ vỡ nơi khác
- [ ] Không tự thêm dependency mới vào `package.json` nếu không thật sự cần
