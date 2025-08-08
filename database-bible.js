const mysql = require("mysql");
const util = require("util");
const pool = mysql.createPool({
  connectionLimit: 10,
  database: "bible",
  host: process.env.INVITES_DB_HOST,
  user: process.env.INVITES_DB_USER,
  password: process.env.INVITES_DB_PASS,
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
