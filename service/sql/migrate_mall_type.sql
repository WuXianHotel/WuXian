-- 积分商城商品表新增 type 字段（0=虚拟 1=实物）
ALTER TABLE `points_products`
  ADD COLUMN `type` TINYINT NOT NULL DEFAULT 0 COMMENT '0虚拟 1实物' AFTER `sort_order`;
