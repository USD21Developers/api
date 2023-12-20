const mysql = require("mysql");
const util = require("util");
const pool = mysql.createPool({
  connectionLimit: 10,
  database: process.env.UPSIDEDOWN21_DB,
  host: process.env.UPSIDEDOWN21_HOST,
  user: process.env.UPSIDEDOWN21_USER,
  password: process.env.UPSIDEDOWN21_PASS,
});

pool.getConnection((err, connection) => {
  if (err && err.code) {
    switch (err.code) {
      case "PROTOCOL_CONNECTION_LOST":
        console.error("Database connection was closed.");
        break;
      case "PROTOCOL_CONNECTION_LOST":
        console.error("Database connection was closed.");
        break;
      case "ER_CON_COUNT_ERROR":
        console.error("Database has too many connections.");
        break;
      case "ECONNREFUSED":
        console.error("Database connection was refused.");
        break;
      default:
        console.error(err);
    }
  }
  if (connection) connection.release();
  return;
});

pool.query = util.promisify(pool.query);

module.exports = pool;
