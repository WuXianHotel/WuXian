-- 会员等级表新增积分抵扣倍率字段
ALTER TABLE `member_levels`
  ADD COLUMN `deduct_rate` DECIMAL(4,2) NOT NULL DEFAULT 1.00 COMMENT '积分抵扣倍率（乘以基础汇率）' AFTER `points_rate`;

-- 扩展图标字段为 VARCHAR(500) 以支持 CDN 图片 URL
ALTER TABLE `member_levels`
  MODIFY COLUMN `icon` VARCHAR(500) NOT NULL DEFAULT '⭐' COMMENT '等级图标（emoji 或图片 URL）';

-- 清空旧数据，插入 5 级会员体系
DELETE FROM `member_levels`;
INSERT INTO `member_levels` (`id`, `level`, `name`, `min_nights`, `min_points`, `discount`, `points_rate`, `deduct_rate`, `icon`, `color`) VALUES
(1, 1, '铜牌会员',  0,     0,    1.00, 1.0, 1.0, '🥉', '#cd7f32'),
(2, 2, '银牌会员',  5,   500,    0.97, 1.2, 1.0, '🥈', '#c0c0c0'),
(3, 3, '金牌会员', 15,  2000,    0.95, 1.5, 1.2, '🥇', '#ffd700'),
(4, 4, '黑金会员', 30,  5000,    0.90, 2.0, 1.5, '🖤', '#1a1a1a'),
(5, 5, '钻石会员', 60, 10000,    0.85, 3.0, 2.0, '💎', '#b8860b');
