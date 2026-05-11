-- ────────────────────────────────────────────────────────────────
-- 清空业务数据（保留配置表和房型房间定义）
-- ────────────────────────────────────────────────────────────────
-- 保留表：admin_users、admin_logs、member_levels、settings、
--        points_products、room_types、rooms
-- 清空表：users、members、orders、payments、refunds、reviews、
--        points_logs、wallet_logs、points_exchanges、price_calendar
-- ────────────────────────────────────────────────────────────────

SET FOREIGN_KEY_CHECKS = 0;

-- 业务流水
TRUNCATE TABLE wallet_logs;
TRUNCATE TABLE points_logs;
TRUNCATE TABLE points_exchanges;

-- 退款 / 评价 / 支付 / 订单
TRUNCATE TABLE refunds;
TRUNCATE TABLE reviews;
TRUNCATE TABLE payments;
TRUNCATE TABLE orders;

-- 价格日历
TRUNCATE TABLE price_calendar;

-- 会员档案 + 用户主表
TRUNCATE TABLE members;
TRUNCATE TABLE users;

-- 还原房间状态为空闲（保留房间定义，只重置运营状态）
UPDATE rooms SET status = 0;

SET FOREIGN_KEY_CHECKS = 1;

-- 校验
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'refunds', COUNT(*) FROM refunds
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL SELECT 'points_logs', COUNT(*) FROM points_logs
UNION ALL SELECT 'points_exchanges', COUNT(*) FROM points_exchanges
UNION ALL SELECT 'wallet_logs', COUNT(*) FROM wallet_logs
UNION ALL SELECT 'price_calendar', COUNT(*) FROM price_calendar
UNION ALL SELECT '-- 保留表 --', NULL
UNION ALL SELECT 'admin_users', COUNT(*) FROM admin_users
UNION ALL SELECT 'member_levels', COUNT(*) FROM member_levels
UNION ALL SELECT 'settings', COUNT(*) FROM settings
UNION ALL SELECT 'room_types', COUNT(*) FROM room_types
UNION ALL SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'points_products', COUNT(*) FROM points_products;
