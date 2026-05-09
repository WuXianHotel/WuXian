// PM2 生产进程管理配置
// 使用方法：pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'hotel-service',
      script: './app.js',
      cwd: '/opt/hotel/service/current',

      // 进程模型：cluster 模式自动利用多核 CPU
      instances: 'max',          // 或指定具体数量，例如 2
      exec_mode: 'cluster',

      // 自动重启策略
      autorestart: true,
      watch: false,              // 生产环境关闭 watch
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,

      // 日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/hotel/service/logs/pm2-error.log',
      out_file:   '/opt/hotel/service/logs/pm2-out.log',
      merge_logs: true,

      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
