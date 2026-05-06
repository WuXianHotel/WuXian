-- 为 status=5 (退款中) 但在 refunds 表中没有记录的订单补写 refunds 待审核记录
-- 背景：老版本 /cancel 接口只改 orders.status 不写 refunds，导致后台无法审核
INSERT INTO refunds (order_no, refund_no, user_id, amount, reason, status, created_at)
SELECT
  o.order_no,
  CONCAT('RF', DATE_FORMAT(IFNULL(o.cancel_at, o.updated_at), '%Y%m%d%H%i%s'), LPAD(FLOOR(RAND() * 10000), 4, '0')) AS refund_no,
  o.user_id,
  o.pay_amount,
  IFNULL(o.cancel_reason, '用户取消订单') AS reason,
  0 AS status,
  IFNULL(o.cancel_at, o.updated_at) AS created_at
FROM orders o
LEFT JOIN refunds r ON r.order_no = o.order_no
WHERE o.status = 5 AND r.id IS NULL;
