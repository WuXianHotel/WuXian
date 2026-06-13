-- ============================================================
-- 柳州无限电竞酒店小程序 · 数据库建表脚本
-- MySQL 8.0+   charset: utf8mb4   engine: InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS `hotel_miniprogram`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `hotel_miniprogram`;

-- ────────────────────────────────────────────────────────────
-- 1. 后台管理员
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `username`    VARCHAR(50)    NOT NULL UNIQUE COMMENT '登录账号',
  `password`    VARCHAR(100)   NOT NULL       COMMENT 'bcrypt 哈希',
  `real_name`   VARCHAR(50)    DEFAULT NULL,
  `role`        ENUM('super','front_desk','finance','operation') NOT NULL DEFAULT 'front_desk'
                               COMMENT 'super=超级管理员 front_desk=前台 finance=财务 operation=运营',
  `status`      TINYINT(1)     NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
  `last_login`  DATETIME       DEFAULT NULL,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role` (`role`)
) ENGINE=InnoDB COMMENT='后台管理员';

-- 默认超管账号 (密码: Admin@123，请登录后立即修改)
INSERT IGNORE INTO `admin_users` (`username`, `password`, `real_name`, `role`)
VALUES ('admin', '$2a$10$za0ncKqZVdTtRPw6r3EOIuWdkKTaVkvyPuAzl5Jmu/93me4iSzPwW', '超级管理员', 'super');

-- ────────────────────────────────────────────────────────────
-- 2. 操作日志
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id`    INT UNSIGNED    NOT NULL,
  `admin_name`  VARCHAR(50)     NOT NULL,
  `action`      VARCHAR(100)    NOT NULL COMMENT '操作描述',
  `method`      VARCHAR(10)     NOT NULL,
  `path`        VARCHAR(200)    NOT NULL,
  `body`        JSON            DEFAULT NULL COMMENT '脱敏后的请求体',
  `ip`          VARCHAR(50)     DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_admin`   (`admin_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB COMMENT='管理员操作日志';

-- ────────────────────────────────────────────────────────────
-- 3. 小程序用户
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `openid`        VARCHAR(64)   NOT NULL UNIQUE COMMENT '微信 openid',
  `unionid`       VARCHAR(64)   DEFAULT NULL,
  `nickname`      VARCHAR(60)   DEFAULT NULL,
  `avatar_url`    VARCHAR(500)  DEFAULT NULL,
  `phone`         VARCHAR(20)   DEFAULT NULL COMMENT '绑定手机号',
  `real_name`     VARCHAR(50)   DEFAULT NULL COMMENT '实名',
  `id_type`       TINYINT       DEFAULT 1    COMMENT '1=身份证 2=护照 3=港澳通行证 4=台湾通行证',
  `id_number`     VARCHAR(30)   DEFAULT NULL COMMENT '证件号',
  `gender`        TINYINT       DEFAULT 0    COMMENT '0未知 1男 2女',
  `wallet_balance` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '钱包余额',
  `status`        TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '1正常 0封禁',
  `last_login`    DATETIME      DEFAULT NULL,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_phone` (`phone`)
) ENGINE=InnoDB COMMENT='小程序用户';

-- ────────────────────────────────────────────────────────────
-- 4. 会员等级配置
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `member_levels` (
  `id`            TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `level`         TINYINT          NOT NULL UNIQUE COMMENT '等级值 1铜 2银 3金 4黑金 5钻石',
  `name`          VARCHAR(20)      NOT NULL COMMENT '等级名称',
  `min_nights`    INT              NOT NULL DEFAULT 0  COMMENT '最低累计入住晚数',
  `min_points`    INT              NOT NULL DEFAULT 0  COMMENT '最低积分',
  `discount`      DECIMAL(4,2)     NOT NULL DEFAULT 1.00 COMMENT '折扣率 0.95=九五折',
  `points_rate`   DECIMAL(4,2)     NOT NULL DEFAULT 1.00 COMMENT '积分倍率',
  `deduct_rate`   DECIMAL(4,2)     NOT NULL DEFAULT 1.00 COMMENT '积分抵扣倍率（乘以基础汇率）',
  `icon`          VARCHAR(500)     DEFAULT '🥉',
  `color`         VARCHAR(20)      DEFAULT '#cd7f32',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT='会员等级配置';

INSERT IGNORE INTO `member_levels` (`id`, `level`, `name`, `min_nights`, `min_points`, `discount`, `points_rate`, `deduct_rate`, `icon`, `color`) VALUES
(1, 1, '铜牌会员',  0,     0,    1.00, 1.0, 1.0, '🥉', '#cd7f32'),
(2, 2, '银牌会员',  5,   500,    0.97, 1.2, 1.0, '🥈', '#c0c0c0'),
(3, 3, '金牌会员', 15,  2000,    0.95, 1.5, 1.2, '🥇', '#ffd700'),
(4, 4, '黑金会员', 30,  5000,    0.90, 2.0, 1.5, '🖤', '#1a1a1a'),
(5, 5, '钻石会员', 60, 10000,    0.85, 3.0, 2.0, '💎', '#b8860b');

-- ────────────────────────────────────────────────────────────
-- 5. 会员信息（与用户 1:1）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `members` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED NOT NULL UNIQUE,
  `member_no`       VARCHAR(20)  NOT NULL UNIQUE COMMENT '会员编号 M+年月+6位序号',
  `level`           TINYINT      NOT NULL DEFAULT 1,
  `points`          INT          NOT NULL DEFAULT 0 COMMENT '当前可用积分',
  `points_total`    INT          NOT NULL DEFAULT 0 COMMENT '历史累计积分',
  `total_nights`    INT          NOT NULL DEFAULT 0 COMMENT '累计入住晚数',
  `total_amount`    DECIMAL(12,2)NOT NULL DEFAULT 0 COMMENT '累计消费金额',
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_level` (`level`)
) ENGINE=InnoDB COMMENT='用户会员信息';

-- ────────────────────────────────────────────────────────────
-- 6. 积分流水
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `points_logs` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED    NOT NULL,
  `type`        ENUM('earn','use','adjust','expire') NOT NULL COMMENT 'earn=消费获取 use=消费抵扣 adjust=人工调整 expire=过期',
  `points`      INT             NOT NULL COMMENT '正数增加 负数减少',
  `balance`     INT             NOT NULL COMMENT '操作后余额',
  `remark`      VARCHAR(200)    DEFAULT NULL,
  `ref_id`      VARCHAR(40)     DEFAULT NULL COMMENT '关联单据号',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB COMMENT='积分流水';

-- ────────────────────────────────────────────────────────────
-- 7. 房型
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `room_types` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(60)   NOT NULL COMMENT '房型名称',
  `area`          DECIMAL(6,1)  DEFAULT NULL COMMENT '面积㎡',
  `bed_type`      VARCHAR(30)   DEFAULT NULL COMMENT '床型描述',
  `floor_info`    VARCHAR(30)   DEFAULT NULL COMMENT '楼层说明',
  `view`          VARCHAR(30)   DEFAULT NULL COMMENT '景观',
  `max_guests`    TINYINT       NOT NULL DEFAULT 2,
  `smoke`         TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '0禁烟 1可吸烟',
  `breakfast`     TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '0不含早 1含早',
  `base_price`    DECIMAL(10,2) NOT NULL COMMENT '平日基础价格',
  `holiday_price` DECIMAL(10,2) DEFAULT NULL COMMENT '节假日价格',
  `total_rooms`   SMALLINT      NOT NULL DEFAULT 0 COMMENT '总间数',
  `images`        JSON          DEFAULT NULL COMMENT '图片URL数组',
  `facilities`    JSON          DEFAULT NULL COMMENT '设施列表',
  `description`   TEXT          DEFAULT NULL,
  `sort_order`    SMALLINT      NOT NULL DEFAULT 0,
  `status`        TINYINT       NOT NULL DEFAULT 1 COMMENT '1上架 0下架',
  `rating`        DECIMAL(3,1)  NOT NULL DEFAULT 5.0,
  `review_count`  INT           NOT NULL DEFAULT 0,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`, `sort_order`)
) ENGINE=InnoDB COMMENT='房型';

-- ────────────────────────────────────────────────────────────
-- 10. 房间（具体房间号，属于某个房型）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `rooms` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_type_id`  INT UNSIGNED NOT NULL,
  `room_no`       VARCHAR(10)  NOT NULL UNIQUE COMMENT '房间号',
  `floor`         TINYINT      NOT NULL DEFAULT 1,
  `status`        TINYINT      NOT NULL DEFAULT 0
                  COMMENT '0空闲 1入住中 2已预订 3维修 4清洁',
  `remark`        VARCHAR(200) DEFAULT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_type_status` (`room_type_id`, `status`)
) ENGINE=InnoDB COMMENT='具体房间';

-- ────────────────────────────────────────────────────────────
-- 11. 价格日历（特殊日期覆盖）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `price_calendar` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `room_type_id`  INT UNSIGNED  NOT NULL,
  `date`          DATE          NOT NULL,
  `price`         DECIMAL(10,2) NOT NULL,
  `type`          TINYINT       NOT NULL DEFAULT 1 COMMENT '1平日 2节假日 3活动价',
  `available`     SMALLINT      NOT NULL DEFAULT 0 COMMENT '当日可售间数',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_date` (`room_type_id`, `date`),
  INDEX `idx_date` (`date`)
) ENGINE=InnoDB COMMENT='价格日历';

-- ────────────────────────────────────────────────────────────
-- 12. 订单
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`        VARCHAR(40)     NOT NULL UNIQUE COMMENT '订单号 HT+日期+8位随机',
  `user_id`         INT UNSIGNED    NOT NULL,
  `room_type_id`    INT UNSIGNED    NOT NULL,
  `room_id`         INT UNSIGNED    DEFAULT NULL COMMENT '分配的具体房间，入住时确定',
  `check_in_date`   DATE            NOT NULL,
  `check_out_date`  DATE            NOT NULL,
  `nights`          TINYINT         NOT NULL,
  `room_count`      TINYINT         NOT NULL DEFAULT 1,
  `guests_info`     JSON            DEFAULT NULL COMMENT '入住人信息数组',
  `special_request` VARCHAR(500)    DEFAULT NULL,
  `room_price`      DECIMAL(10,2)   NOT NULL COMMENT '房费合计（折前）',
  `member_discount` DECIMAL(10,2)   NOT NULL DEFAULT 0 COMMENT '会员折扣金额',
  `pay_amount`      DECIMAL(10,2)   NOT NULL COMMENT '实付金额',
  `refund_amount`   DECIMAL(10,2)   NOT NULL DEFAULT 0,
  `status`          TINYINT         NOT NULL DEFAULT 0
                    COMMENT '0待支付 1待入住 2入住中 3已退房 4已取消 5退款中 6已退款',
  `pay_status`      TINYINT         NOT NULL DEFAULT 0 COMMENT '0未支付 1已支付',
  `cancel_reason`   VARCHAR(200)    DEFAULT NULL,
  `cancel_at`       DATETIME        DEFAULT NULL,
  `check_in_at`     DATETIME        DEFAULT NULL COMMENT '实际入住时间',
  `check_out_at`    DATETIME        DEFAULT NULL COMMENT '实际退房时间',
  `deposit`         DECIMAL(10,2)   DEFAULT NULL COMMENT '押金',
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user`   (`user_id`, `status`),
  INDEX `idx_room`   (`room_type_id`),
  INDEX `idx_date`   (`check_in_date`, `check_out_date`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='订单';

-- ────────────────────────────────────────────────────────────
-- 13. 支付记录
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `payments` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`      VARCHAR(40)     NOT NULL,
  `transaction_id`VARCHAR(64)     DEFAULT NULL COMMENT '微信支付单号',
  `user_id`       INT UNSIGNED    NOT NULL,
  `amount`        DECIMAL(10,2)   NOT NULL,
  `method`        VARCHAR(20)     NOT NULL DEFAULT 'wechat' COMMENT '支付方式',
  `status`        TINYINT         NOT NULL DEFAULT 0 COMMENT '0处理中 1成功 2失败',
  `pay_at`        DATETIME        DEFAULT NULL,
  `raw_notify`    JSON            DEFAULT NULL COMMENT '微信回调原文',
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order`       (`order_no`),
  INDEX `idx_transaction` (`transaction_id`)
) ENGINE=InnoDB COMMENT='支付记录';

-- ────────────────────────────────────────────────────────────
-- 14. 退款记录
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `refunds` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`      VARCHAR(40)     NOT NULL,
  `refund_no`     VARCHAR(40)     NOT NULL UNIQUE COMMENT '退款单号',
  `wx_refund_id`  VARCHAR(64)     DEFAULT NULL,
  `user_id`       INT UNSIGNED    NOT NULL,
  `amount`        DECIMAL(10,2)   NOT NULL,
  `reason`        VARCHAR(200)    DEFAULT NULL,
  `status`        TINYINT         NOT NULL DEFAULT 0 COMMENT '0待审核 1审核通过 2退款中 3已退款 4已拒绝',
  `auditor_id`    INT UNSIGNED    DEFAULT NULL,
  `audit_remark`  VARCHAR(200)    DEFAULT NULL,
  `audit_at`      DATETIME        DEFAULT NULL,
  `refund_at`     DATETIME        DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_order`  (`order_no`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB COMMENT='退款记录';

-- ────────────────────────────────────────────────────────────
-- 15. 评价
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `reviews` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no`      VARCHAR(40)     NOT NULL UNIQUE COMMENT '一单只能评一次',
  `user_id`       INT UNSIGNED    NOT NULL,
  `room_type_id`  INT UNSIGNED    NOT NULL,
  `score`         TINYINT         NOT NULL COMMENT '1-5分',
  `content`       VARCHAR(1000)   DEFAULT NULL,
  `images`        JSON            DEFAULT NULL,
  `is_anonymous`  TINYINT(1)      NOT NULL DEFAULT 0,
  `status`        TINYINT         NOT NULL DEFAULT 1 COMMENT '1显示 0隐藏',
  `reply`         VARCHAR(500)    DEFAULT NULL COMMENT '酒店回复',
  `reply_at`      DATETIME        DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_room` (`room_type_id`, `status`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB COMMENT='房型评价';

-- ────────────────────────────────────────────────────────────
-- 16. 系统设置（key-value）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `id`          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(60)       NOT NULL UNIQUE,
  `value`       TEXT              DEFAULT NULL,
  `type`        VARCHAR(20)       NOT NULL DEFAULT 'string' COMMENT 'string|number|bool|json',
  `label`       VARCHAR(100)      DEFAULT NULL COMMENT '前端显示标签',
  `group`       VARCHAR(40)       DEFAULT 'general',
  `updated_at`  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_group` (`group`)
) ENGINE=InnoDB COMMENT='系统全局设置';

INSERT IGNORE INTO `settings` (`key`, `value`, `type`, `label`, `group`) VALUES
('hotel_name',       '柳州无限电竞酒店',                       'string', '酒店名称',     'hotel'),
('hotel_address',    '示例市示例路1号',                  'string', '酒店地址',     'hotel'),
('hotel_phone',      '400-000-0000',                   'string', '联系电话',     'hotel'),
('hotel_logo',       '',                               'string', 'Logo URL',    'hotel'),
('check_in_time',    '14:00',                          'string', '入住时间',     'policy'),
('check_out_time',   '12:00',                          'string', '退房时间',     'policy'),
('cancel_policy',    '入住前24小时免费取消',              'string', '取消政策',     'policy'),
('deposit_enabled',  '1',                              'bool',   '是否收押金',   'policy'),
('deposit_amount',   '500',                            'number', '押金金额(元)', 'policy'),
('points_per_yuan',  '1',                              'number', '每消费1元得积分','points'),
('points_to_yuan',   '100',                            'number', '100积分抵1元', 'points'),
('points_deduct_enabled','1',                          'number', '是否开启积分抵扣','points'),
('hotel_latitude',   '24.3282',                        'number', '酒店纬度',     'hotel'),
('hotel_longitude',  '109.2622',                       'number', '酒店经度',     'hotel'),
('app_version',      '0.0.1',                          'string', '小程序版本控制','system');

-- ────────────────────────────────────────────────────────────
-- 18. 钱包流水
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `wallet_logs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED    NOT NULL,
  `type`         ENUM('recharge','consume','refund','bonus') NOT NULL,
  `amount`       DECIMAL(10,2)   NOT NULL COMMENT '变动金额（正/负）',
  `balance`      DECIMAL(10,2)   NOT NULL COMMENT '变动后余额',
  `remark`       VARCHAR(200)    DEFAULT NULL,
  `ref_order_no` VARCHAR(40)     DEFAULT NULL,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB COMMENT='钱包流水';

-- ────────────────────────────────────────────────────────────
-- 19. 积分商品
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `points_products` (
  `id`                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`                VARCHAR(100) NOT NULL,
  `description`         TEXT,
  `image`               VARCHAR(500),
  `points_cost`         INT          NOT NULL,
  `stock`               INT          NOT NULL DEFAULT 999,
  `status`              TINYINT      NOT NULL DEFAULT 1,
  `sort_order`          INT          DEFAULT 0,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB COMMENT='积分商城商品（仅实物兑换）';

-- ────────────────────────────────────────────────────────────
-- 20. 积分兑换记录
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `points_exchanges` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`      INT UNSIGNED    NOT NULL,
  `product_id`   INT UNSIGNED    NOT NULL,
  `points_spent` INT             NOT NULL,
  `status`       TINYINT         NOT NULL DEFAULT 0 COMMENT '0待处理 1已完成 2已取消',
  `address`      VARCHAR(500)    DEFAULT NULL,
  `phone`        VARCHAR(20)     DEFAULT NULL,
  `receiver`     VARCHAR(50)     DEFAULT NULL,
  `remark`       VARCHAR(200)    DEFAULT NULL,
  `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB COMMENT='积分兑换记录';
