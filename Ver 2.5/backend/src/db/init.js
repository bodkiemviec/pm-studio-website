// Chạy lệnh: npm run init-db
// Đọc file sql/schema.sql và thực thi để tạo toàn bộ bảng trong database
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function main() {
  const sqlPath = path.join(__dirname, '..', '..', 'sql', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Đang tạo bảng trong database...');
  await pool.query(sql);
  console.log('✅ Xong! Database đã sẵn sàng.');
  await pool.end();
}

main().catch((err) => {
  console.error('❌ Lỗi khi khởi tạo database:', err.message);
  process.exit(1);
});
