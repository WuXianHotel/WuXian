'use strict';
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'hotel_miniprogram',
  connectionLimit:    parseInt(process.env.DB_POOL_LIMIT || '10', 10),
  waitForConnections: true,
  queueLimit:         0,
  timezone:           '+08:00',
  charset:            'utf8mb4',
  decimalNumbers:     true,
});

pool.on('connection', () => {
  require('./logger').info('MySQL 连接池已建立新连接');
});

/**
 * 执行单条 SQL
 * @param {string} sql
 * @param {any[]}  params
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
  // 统一使用 pool.query（非 prepared statement），兼容 MySQL 9.x LIMIT/OFFSET 参数类型限制
  const [rows] = await pool.query(sql, params);
  // INSERT/UPDATE/DELETE 返回 ResultSetHeader（非数组），包装成数组使调用方可以 const [{ insertId }] = query(...)
  if (rows && typeof rows === 'object' && !Array.isArray(rows) && 'affectedRows' in rows) {
    return [rows];
  }
  return rows;
}

/**
 * 事务辅助：传入回调，自动提交/回滚
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} callback
 * @returns {Promise<T>}
 */
async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, transaction };
