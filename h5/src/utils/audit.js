import { ref } from 'vue';

const AUDIT_VERSION = '0.0.1';
const STORAGE_KEY = 'hotel_h5_audit';

const isAudit = ref(false);
let isFetched = false;

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

export function useAuditMode() {
  return { isAudit };
}
