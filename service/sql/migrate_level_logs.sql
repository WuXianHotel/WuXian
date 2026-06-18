-- ============================================================
-- 会员等级调整日志表
-- 记录管理员手动调整会员等级的操作历史
-- ============================================================

USE `hotel_miniprogram`;

CREATE TABLE IF NOT EXISTS `member_level_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `member_id`   INT UNSIGNED    NOT NULL COMMENT 'members 表主键',
  `user_id`     INT UNSIGNED    NOT NULL COMMENT 'users 表主键',
  `old_level`   TINYINT         NOT NULL COMMENT '调整前等级值',
  `new_level`   TINYINT         NOT NULL COMMENT '调整后等级值',
  `admin_id`    INT UNSIGNED    NOT NULL COMMENT '操作管理员ID',
  `admin_name`  VARCHAR(50)     NOT NULL COMMENT '操作管理员用户名',
  `remark`      VARCHAR(200)    DEFAULT NULL COMMENT '调整原因',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_member`   (`member_id`),
  INDEX `idx_user`     (`user_id`),
  INDEX `idx_admin`    (`admin_id`),
  INDEX `idx_created`  (`created_at`)
) ENGINE=InnoDB COMMENT='会员等级手动调整日志';
