-- 新增 vConsole 调试面板控制开关
INSERT IGNORE INTO settings (`key`, `value`, `type`, `label`, `group`) 
VALUES ('vconsole_enabled', 'false', 'string', 'H5调试面板', 'system');
