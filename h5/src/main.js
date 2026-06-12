// H5 入口
import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { getToken } from './utils/auth.js';

// 初始化：从 URL 参数或 localStorage 读取 token
getToken();

const app = createApp(App);
app.use(router);
app.mount('#app');
