const mysql = require("mysql2");
const util = require("util");
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.query = util.promisify(pool.query);

module.exports = pool;
