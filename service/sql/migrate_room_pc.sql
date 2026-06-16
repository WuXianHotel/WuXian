-- 电竞酒店房型扩展：PC配置 + 床型改为自定义
ALTER TABLE `room_types`
  ADD COLUMN `pc_count`  INT           NOT NULL DEFAULT 1 COMMENT '电脑数量' AFTER `max_guests`,
  ADD COLUMN `pc_configs` JSON         DEFAULT NULL COMMENT '电脑配置JSON数组 [\"i7/RTX4060/32G\",\"i5/RTX3060/16G\"]' AFTER `pc_count`;
