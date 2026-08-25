-- ============================================================
-- PM STUDIO — DATABASE SCHEMA (PostgreSQL)
-- Chạy file này 1 lần để tạo toàn bộ bảng
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  ho_ten         VARCHAR(255) NOT NULL,
  ten_doanh_nghiep VARCHAR(255),
  email          VARCHAR(255) UNIQUE NOT NULL,
  mat_khau_hash  VARCHAR(255) NOT NULL,
  vai_tro        VARCHAR(20) NOT NULL DEFAULT 'khach_hang' CHECK (vai_tro IN ('khach_hang', 'coder', 'admin')), -- 'khach_hang' | 'coder' | 'admin'
  wallet_balance NUMERIC(15,2) DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ten_du_an      VARCHAR(255) NOT NULL,
  loai           VARCHAR(50),          -- quan-an | ca-phe | gym | doanh-nghiep
  trang_thai     VARCHAR(50) DEFAULT 'dang_thuc_hien', -- dang_thuc_hien | hoan_thanh | tam_dung
  ngay_bat_dau   DATE DEFAULT CURRENT_DATE,
  deadline       TIMESTAMP,            -- Hạn chót dự án
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_steps (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ten_buoc       VARCHAR(255) NOT NULL,
  mo_ta          TEXT,
  trang_thai     VARCHAR(20) DEFAULT 'cho_xu_ly', -- cho_xu_ly | dang_lam | hoan_thanh
  thu_tu         INTEGER DEFAULT 0,
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dot_so         INTEGER NOT NULL DEFAULT 1,
  so_tien        NUMERIC(14,0) NOT NULL,
  trang_thai     VARCHAR(20) DEFAULT 'cho_thanh_toan', -- cho_thanh_toan | da_thanh_toan
  ngay_thanh_toan TIMESTAMP,
  ghi_chu        TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id             SERIAL PRIMARY KEY,
  project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  ten_file       VARCHAR(255) NOT NULL,
  duong_dan      VARCHAR(500) NOT NULL,
  kich_thuoc     BIGINT NOT NULL DEFAULT 0, -- dung lượng file (byte) — dùng để tính quota theo user/dự án
  loai           VARCHAR(30) DEFAULT 'da_tai_len', -- can_khach_hang_tai_len | da_tai_len
  tai_len_boi    INTEGER REFERENCES users(id) ON DELETE SET NULL, -- xóa user không xóa tài liệu họ từng tải lên
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultations (
  id             SERIAL PRIMARY KEY,
  ho_ten         VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  so_dien_thoai  VARCHAR(30),
  thoi_gian_hen  TIMESTAMP NOT NULL,
  trang_thai     VARCHAR(20) DEFAULT 'cho_xac_nhan', -- cho_xac_nhan | da_xac_nhan | da_huy
  ghi_chu        TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ten_mau        VARCHAR(255),
  goi_dich_vu    VARCHAR(100),
  trang_thai     VARCHAR(30) DEFAULT 'moi',
  final_price    NUMERIC(15,2),        -- Giá cuối cùng (tùy biến)
  is_custom_price BOOLEAN DEFAULT FALSE, -- Cờ đánh dấu đơn hàng có giá tùy chỉnh
  color          VARCHAR(50),          -- Màu sắc tùy biến
  notes          TEXT,                 -- Ghi chú cho đơn hàng
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mau_website (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coder_id INT NOT NULL,
    ten_mau VARCHAR(255) NOT NULL,
    mo_ta TEXT,
    gia_ban DECIMAL(15,2) DEFAULT 0,
    thumbnail_url VARCHAR(255),
    link_demo VARCHAR(255),
    trang_thai ENUM('cho_duyet', 'dang_hien_thi', 'tu_choi') DEFAULT 'cho_duyet',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coder_id) REFERENCES users(id)
);  

CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_steps_project ON project_steps(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_consultations_thoi_gian ON consultations(thoi_gian_hen);

-- ============================================================
-- MIGRATION cho DB đã tạo trước đây (schema.sql dùng CREATE TABLE IF NOT
-- EXISTS nên sửa ở trên KHÔNG tự áp dụng cho bảng đã tồn tại sẵn).
-- Nếu bạn ĐÃ TẠO DATABASE TỪ TRƯỚC, hãy chạy khối lệnh bên dưới 1 lần:
-- ============================================================

-- 1. Migration cũ (Giữ nguyên)
-- ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_tai_len_boi_fkey;
-- ALTER TABLE documents ADD CONSTRAINT documents_tai_len_boi_fkey
--   FOREIGN KEY (tai_len_boi) REFERENCES users(id) ON DELETE SET NULL;
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS kich_thuoc BIGINT NOT NULL DEFAULT 0;

-- 2. Migration mới bổ sung (Cập nhật role, wallet, order, project deadline)
-- Xóa ràng buộc role cũ và cập nhật thêm 'coder'
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vai_tro_check;
-- ALTER TABLE users ADD CONSTRAINT users_vai_tro_check 
--   CHECK (vai_tro IN ('khach_hang', 'coder', 'admin'));

-- Thêm cột số dư ví cho users
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(15,2) DEFAULT 0;

-- Thêm cấu hình giá, màu, ghi chú cho orders
-- ALTER TABLE orders 
--   ADD COLUMN IF NOT EXISTS final_price NUMERIC(15,2),
--   ADD COLUMN IF NOT EXISTS is_custom_price BOOLEAN DEFAULT FALSE,
--   ADD COLUMN IF NOT EXISTS color VARCHAR(50),
--   ADD COLUMN IF NOT EXISTS notes TEXT;

-- Thêm hạn chót cho projects
-- ALTER TABLE projects ADD COLUMN IF NOT EXISTS deadline TIMESTAMP;