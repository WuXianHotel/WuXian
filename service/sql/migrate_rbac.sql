-- ============================================================
-- RBAC 角色权限体系迁移脚本
-- 创建 roles / permissions / role_permissions 三张表
-- 迁移现有 ENUM 角色到新的角色体系
-- ============================================================

USE `hotel_miniprogram`;

-- ── 1. 角色表 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(30)   NOT NULL COMMENT '角色标识（英文key）',
  `label`       VARCHAR(30)   NOT NULL COMMENT '角色显示名称',
  `description` VARCHAR(200)  DEFAULT NULL,
  `is_system`   TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '是否系统内置角色（内置不可删除）',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB COMMENT='角色定义';

-- ── 2. 权限表 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(50)   NOT NULL COMMENT '权限标识符（如 orders:checkin）',
  `label`       VARCHAR(50)   NOT NULL COMMENT '权限显示名称',
  `module`      VARCHAR(30)   NOT NULL COMMENT '所属模块（dashboard/rooms/orders/members/reports/mall/banners/system/roles）',
  `description` VARCHAR(200)  DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`key`),
  INDEX `idx_module` (`module`)
) ENGINE=InnoDB COMMENT='权限定义';

-- ── 3. 角色-权限关联表 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id`       INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`),
  INDEX `idx_role` (`role_id`),
  INDEX `idx_permission` (`permission_id`)
) ENGINE=InnoDB COMMENT='角色-权限关联';

-- ── 4. 为 admin_users 增加 role_id 字段（保留原 role 字段以兼容过渡） ──
ALTER TABLE `admin_users`
  ADD COLUMN `role_id` INT UNSIGNED DEFAULT NULL AFTER `role`,
  ADD INDEX `idx_role_id` (`role_id`);

-- ============================================================
-- 种子数据：4 个系统内置角色
-- ============================================================
INSERT INTO `roles` (`id`, `name`, `label`, `description`, `is_system`) VALUES
(1, 'super',       '超级管理员', '拥有系统所有权限，不受任何模块访问限制', 1),
(2, 'front_desk',  '前台',       '负责订单入住/退房/取消操作，可查看房型信息', 1),
(3, 'finance',     '财务',       '负责财务报表查看、退款审核、余额调整', 1),
(4, 'operation',   '运营',       '负责房型管理、积分商城、Banner管理等运营工作', 1)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `description` = VALUES(`description`);

-- ============================================================
-- 种子数据：权限定义（模块.操作 粒度）
-- ============================================================
INSERT INTO `permissions` (`id`, `key`, `label`, `module`, `description`) VALUES
-- 仪表盘
(1,  'dashboard:view',   '查看仪表盘',     'dashboard', '查看首页KPI统计与快捷操作'),

-- 房型管理
(10, 'rooms:view',       '查看房型',       'rooms',     '查看房型列表与详情'),
(11, 'rooms:manage',     '管理房型',       'rooms',     '新增/编辑/上下架房型与价格日历'),
(12, 'rooms:delete',     '删除房型',       'rooms',     '删除房型'),

-- 订单管理
(20, 'orders:view',      '查看订单',       'orders',    '查看订单列表与详情'),
(21, 'orders:checkin',   '办理入住',       'orders',    '为待入住订单办理入住'),
(22, 'orders:checkout',  '办理退房',       'orders',    '为入住中订单办理退房'),
(23, 'orders:cancel',    '取消订单',       'orders',    '后台取消订单'),
(24, 'orders:refund',    '审核退款',       'orders',    '审核退款申请'),

-- 会员管理
(30, 'members:view',     '查看会员',       'members',   '查看会员列表与详情'),
(31, 'members:manage',   '管理会员',       'members',   '人工调整积分/封禁解封'),
(32, 'members:delete',   '删除会员',       'members',   '删除会员账号'),
(33, 'members:wallet',   '调整余额',       'members',   '人工调整会员钱包余额'),

-- 财务报表
(40, 'reports:view',     '查看报表',       'reports',   '查看财务报表与收入趋势'),
(41, 'reports:export',   '导出报表',       'reports',   '导出CSV报表'),

-- 积分商城
(50, 'mall:view',        '查看商城',       'mall',      '查看积分商城商品与兑换记录'),
(51, 'mall:manage',      '管理商品',       'mall',      '新增/编辑/删除积分商品'),
(52, 'mall:exchange',    '处理兑换',       'mall',      '处理用户积分兑换订单'),

-- Banner管理
(60, 'banners:view',     '查看Banner',     'banners',   '查看Banner列表'),
(61, 'banners:manage',   '管理Banner',     'banners',   '新增/编辑/删除Banner'),

-- 系统设置
(70, 'system:settings',  '系统设置',       'system',    '修改酒店信息与政策配置'),
(71, 'system:admins',    '管理员管理',     'system',    '新增/编辑/禁用/删除管理员'),
(72, 'system:logs',      '操作日志',       'system',    '查看管理员操作日志'),

-- 角色管理
(80, 'roles:manage',     '角色权限管理',   'roles',     '管理角色与权限分配')
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `module` = VALUES(`module`), `description` = VALUES(`description`);

-- ============================================================
-- 种子数据：角色-权限关联
-- ============================================================

-- super（超级管理员）：所有权限
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `permissions`;

-- front_desk（前台）：仪表盘 + 房型查看 + 订单查看/入住/退房/取消
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(2, 1),  -- dashboard:view
(2, 10), -- rooms:view
(2, 20), -- orders:view
(2, 21), -- orders:checkin
(2, 22), -- orders:checkout
(2, 23); -- orders:cancel

-- finance（财务）：仪表盘 + 财务报表 + 退款审核 + 会员查看 + 余额调整
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3, 1),  -- dashboard:view
(3, 20), -- orders:view
(3, 24), -- orders:refund
(3, 30), -- members:view
(3, 33), -- members:wallet
(3, 40), -- reports:view
(3, 41); -- reports:export

-- operation（运营）：仪表盘 + 房型管理/删除 + 商城管理 + Banner管理 + 会员查看/管理
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(4, 1),  -- dashboard:view
(4, 10), -- rooms:view
(4, 11), -- rooms:manage
(4, 12), -- rooms:delete
(4, 30), -- members:view
(4, 31), -- members:manage
(4, 50), -- mall:view
(4, 51), -- mall:manage
(4, 52), -- mall:exchange
(4, 60), -- banners:view
(4, 61); -- banners:manage

-- ============================================================
-- 迁移现有管理员：根据 role ENUM 值设置 role_id
-- ============================================================
UPDATE `admin_users` SET `role_id` = 1 WHERE `role` = 'super';
UPDATE `admin_users` SET `role_id` = 2 WHERE `role` = 'front_desk';
UPDATE `admin_users` SET `role_id` = 3 WHERE `role` = 'finance';
UPDATE `admin_users` SET `role_id` = 4 WHERE `role` = 'operation';
