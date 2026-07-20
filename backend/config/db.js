const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test kết nối
pool.getConnection((err, connection) => {
  if (err) {
    console.log(" Lỗi kết nối MySQL:", err.message);
  } else {
    console.log(" MySQL kết nối thành công");
    connection.release();
  }
});

//  Quan trọng
module.exports = pool.promise();
