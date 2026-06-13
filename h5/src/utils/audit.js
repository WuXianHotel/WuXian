/**
 * 审核模式检测工具
 *
 * 触发条件：服务端 /api/mp/config 返回 app_version = '0.0.1'（审核版本）
 * 审核模式下隐藏：底部 tabbar、首页搜索栏、首页快捷入口
 *
 * 检测优先级：API 返回 > localStorage 缓存（避免每次请求）
 */
import { ref } from 'vue';

const AUDIT_VERSION = '0.0.1';
const STORAGE_KEY = 'hotel_h5_audit';

const isAudit = ref(false);
let isFetched = false;

/**
 * 从服务端 /api/mp/config 获取 app_version 并判断审核模式
 * 应在 main.js 中尽早调用
 */
export function initAuditMode() {
  if (isFetched) return;

  // 先读 localStorage 缓存快速启动
  isAudit.value = localStorage.getItem(STORAGE_KEY) === '1';

  // 从 API 获取最新版本号
  const apiBase = import.meta.env.VITE_API_BASE || window.location.origin;
  const url = `${apiBase}/api/mp/config`;

  fetch(url)
    .then(res => res.json())
    .then(body => {
      const version = (body && body.data && body.data.app_version) || '';
      const audit = version === AUDIT_VERSION;

      if (audit) {
        localStorage.setItem(STORAGE_KEY, '1');
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      isAudit.value = audit;
      isFetched = true;
    })
    .catch(() => {
      // API 不可用时保持 localStorage 缓存值
      isFetched = true;
    });
}

/**
 * 响应式审核状态，组件中使用
 */
export function useAuditMode() {
  return { isAudit };
}
