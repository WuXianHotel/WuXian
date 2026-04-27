'use strict';
/**
 * 一键初始化数据库
 * 用法: node scripts/initDb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs    = require('fs');
const path  = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  console.log('✅ 数据库连接成功');
  const sql = fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf-8');
  await conn.query(sql);
  console.log('✅ 数据库表初始化完成');
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ 初始化失败:', err.message);
  process.exit(1);
});
