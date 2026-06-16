-- 电脑配置改为 JSON 数组（每台电脑独立配置）
-- 如果 pc_config 已有数据，将其包装为数组迁移到 pc_configs
ALTER TABLE `room_types`
  ADD COLUMN `pc_configs` JSON DEFAULT NULL COMMENT '电脑配置JSON数组' AFTER `pc_config`;
