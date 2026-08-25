// Quản lý kết nối tới PostgreSQL bằng 1 connection pool dùng chung cho cả app
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Lỗi không mong muốn từ PostgreSQL pool:', err);
});

module.exports = pool;
