import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  // 部署到 https://wuxian-hotel.online/h5/，所有静态资源走 /h5/ 前缀
  base: '/h5/',
  server: {
    port: 5173,
    // 开发代理：/api 转发到后端服务
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 构建产出到 h5/dist（对齐 admin/dist 模式，由 Nginx 直接托管）
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
