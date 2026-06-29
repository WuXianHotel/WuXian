'use strict';

/**
 * 定时任务：待支付订单15分钟后自动取消
 * 每分钟执行一次，扫描 status=0(待支付) 且 pay_status=0(未支付) 的订单
 */
const { query } = require('../config/db');
const logger = require('../config/logger');

const CANCEL_MINUTES = 15; // 取消超时分钟数
const SCAN_INTERVAL = 60 * 1000; // 扫描间隔（毫秒），1分钟

async function cancelExpiredOrders() {
  try {
    const [{ count }] = await query(
      `SELECT COUNT(*) AS count FROM orders
       WHERE status = 0 AND pay_status = 0
         AND created_at < NOW() - INTERVAL ${CANCEL_MINUTES} MINUTE`,
    );

    if (count > 0) {
      await query(
        `UPDATE orders
         SET status = 4, cancel_reason = '超时未支付，系统自动取消', cancel_at = NOW()
         WHERE status = 0 AND pay_status = 0
           AND created_at < NOW() - INTERVAL ${CANCEL_MINUTES} MINUTE`,
      );

      logger.info(`[autoCancel] 已自动取消 ${count} 个超时未支付订单`);
    }
  } catch (err) {
    logger.error(`[autoCancel] 执行失败: ${err.message}`);
  }
}

function start() {
  // 启动后立即执行一次
  cancelExpiredOrders();

  // 定时执行
  setInterval(cancelExpiredOrders, SCAN_INTERVAL);

  logger.info(`[autoCancel] 定时任务已启动，扫描间隔 ${SCAN_INTERVAL / 1000}s，超时时间 ${CANCEL_MINUTES}min`);
}

module.exports = { start };
