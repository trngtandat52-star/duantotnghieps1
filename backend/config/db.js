const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lunihome',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Kiểm tra kết nối ban đầu
pool.getConnection()
  .then(conn => {
    console.log(`[Database] Đã kết nối thành công tới MySQL database: ${process.env.DB_NAME || 'lunihome'}`);
    conn.release();
  })
  .catch(err => {
    console.error('[Database] Lỗi kết nối MySQL:');
    console.error(`- Mã lỗi: ${err.code}`);
    console.error(`- Chi tiết: ${err.message}`);
    console.error('LƯU Ý: Vui lòng đảm bảo XAMPP MySQL đã được bấm Start trên cổng 3306, và đã chạy `npm run db:init` để tạo database.');
  });

module.exports = pool;
