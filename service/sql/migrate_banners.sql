-- Banner 轮播图模块
CREATE TABLE IF NOT EXISTS `banners` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `image`       VARCHAR(500)  NOT NULL COMMENT '图片地址（COS URL 或 CDN 地址）',
  `title`       VARCHAR(100)  DEFAULT NULL COMMENT '标题（可选）',
  `link_url`    VARCHAR(500)  DEFAULT NULL COMMENT '跳转链接（可选）',
  `sort_order`  INT           NOT NULL DEFAULT 0 COMMENT '排序（越小越前）',
  `status`      TINYINT       NOT NULL DEFAULT 1 COMMENT '0隐藏 1显示',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status_sort` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='首页Banner轮播图';
