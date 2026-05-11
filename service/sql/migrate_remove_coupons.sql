-- ════════════════════════════════════════════════════════════════════
-- 迁移脚本：移除优惠券模块（兼容 MySQL 5.7 / 8.x）
-- 适用环境：生产 / 开发
-- 执行方式：mysql -u hotel -p hotel_miniprogram < migrate_remove_coupons.sql
-- 特性：幂等（重复执行不会报错），不依赖 IF EXISTS 子句
-- ════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────────────────────────
-- Step 1: 删除优惠券两张表（DROP TABLE IF EXISTS 全版本兼容）
-- ────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_coupons`;
DROP TABLE IF EXISTS `coupon_templates`;

-- ────────────────────────────────────────────────────────────────────
-- Step 2: orders 表 → 删 coupon_discount 与 coupon_id
-- 用动态 SQL + INFORMATION_SCHEMA 判断字段是否存在
-- ────────────────────────────────────────────────────────────────────
SET @db := DATABASE();

-- orders.coupon_discount
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'coupon_discount'),
    'ALTER TABLE `orders` DROP COLUMN `coupon_discount`',
    'SELECT ''[skip] orders.coupon_discount already removed'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- orders.coupon_id
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'coupon_id'),
    'ALTER TABLE `orders` DROP COLUMN `coupon_id`',
    'SELECT ''[skip] orders.coupon_id already removed'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ────────────────────────────────────────────────────────────────────
-- Step 3: 清理积分商城里 type=0 的优惠券类商品
-- ────────────────────────────────────────────────────────────────────
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'points_products' AND COLUMN_NAME = 'type'),
    'DELETE FROM `points_products` WHERE `type` = 0',
    'SELECT ''[skip] points_products.type already removed; nothing to delete'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ────────────────────────────────────────────────────────────────────
-- Step 4: points_products 表 → 删 coupon_template_id 与 type
-- ────────────────────────────────────────────────────────────────────
-- points_products.coupon_template_id
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'points_products' AND COLUMN_NAME = 'coupon_template_id'),
    'ALTER TABLE `points_products` DROP COLUMN `coupon_template_id`',
    'SELECT ''[skip] points_products.coupon_template_id already removed'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- points_products.type
SET @sql := (
  SELECT IF(
    EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'points_products' AND COLUMN_NAME = 'type'),
    'ALTER TABLE `points_products` DROP COLUMN `type`',
    'SELECT ''[skip] points_products.type already removed'' AS info'
  )
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ────────────────────────────────────────────────────────────────────
-- 校验
-- ────────────────────────────────────────────────────────────────────
SELECT '✓ 优惠券表是否还存在' AS check_item;
SHOW TABLES LIKE '%coupon%';

SELECT '✓ orders 表当前字段（应无 coupon_*）' AS check_item;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME LIKE '%coupon%';

SELECT '✓ points_products 表当前字段（应无 type / coupon_*）' AS check_item;
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'points_products'
  AND (COLUMN_NAME = 'type' OR COLUMN_NAME LIKE '%coupon%');

SELECT 'orders' AS tbl, COUNT(*) AS cnt FROM orders
UNION ALL SELECT 'points_products', COUNT(*) FROM points_products
UNION ALL SELECT 'points_exchanges', COUNT(*) FROM points_exchanges;
