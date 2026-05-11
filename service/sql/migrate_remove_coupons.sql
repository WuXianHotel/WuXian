-- ════════════════════════════════════════════════════════════════════
-- 迁移脚本：移除优惠券模块（直接删除，不备份）
-- 适用环境：生产 / 开发
-- 执行方式：mysql -u hotel -p hotel_miniprogram < migrate_remove_coupons.sql
-- ════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

-- Step 1: 删除优惠券两张表
DROP TABLE IF EXISTS `user_coupons`;
DROP TABLE IF EXISTS `coupon_templates`;

-- Step 2: orders 表删除优惠券相关字段
ALTER TABLE `orders`
  DROP COLUMN IF EXISTS `coupon_discount`,
  DROP COLUMN IF EXISTS `coupon_id`;

-- Step 3: points_products 表删除 type 与 coupon_template_id
--         （业务决策：积分商城仅保留实物兑换）
--         先把存量"优惠券类商品"清掉，避免后续脏数据
DELETE FROM `points_products` WHERE `type` = 0;

ALTER TABLE `points_products`
  DROP COLUMN IF EXISTS `coupon_template_id`,
  DROP COLUMN IF EXISTS `type`;

SET FOREIGN_KEY_CHECKS = 1;

-- 校验
SELECT 'orders' AS tbl, COUNT(*) AS cnt FROM orders
UNION ALL SELECT 'points_products', COUNT(*) FROM points_products
UNION ALL SELECT 'points_exchanges', COUNT(*) FROM points_exchanges;

-- 结构核对
SHOW COLUMNS FROM orders;
SHOW COLUMNS FROM points_products;
