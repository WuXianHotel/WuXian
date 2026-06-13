/**
 * 审核模式检测工具
 *
 * 触发条件：URL 参数 version=0.0.1（小程序审核版本）
 * 审核模式下隐藏：底部 tabbar、首页搜索栏、首页快捷入口
 *
 * 检测优先级：URL 参数 > localStorage（跨页面导航保持状态）
 */
import { ref } from 'vue';

const AUDIT_VERSION = '0.0.1';
const STORAGE_KEY = 'hotel_h5_audit';

const isAudit = ref(false);

/**
 * 从 URL query 或 hash 中提取 version 参数
 */
function getVersionFromUrl() {
  // 优先从 search 读取（如 /h5/?version=0.0.1&token=xxx）
  const search = new URLSearchParams(window.location.search);
  const v = search.get('version');
  if (v) return v;

  // 兼容 hash 中的参数（如 /h5/#/?version=0.0.1）
  const hash = window.location.hash;
  if (hash) {
    const queryIdx = hash.indexOf('?');
    if (queryIdx > -1) {
      const hashParams = new URLSearchParams(hash.slice(queryIdx + 1));
      return hashParams.get('version');
    }
  }

  return null;
}

/**
 * 初始化审核模式检测，应在 main.js 中尽早调用
 */
export function initAuditMode() {
  const version = getVersionFromUrl();

  if (version === AUDIT_VERSION) {
    localStorage.setItem(STORAGE_KEY, '1');
    isAudit.value = true;
  } else if (version !== null) {
    // 明确传了非审核版本号，清除审核标记
    localStorage.removeItem(STORAGE_KEY);
    isAudit.value = false;
  } else {
    // URL 无 version 参数，读取 localStorage 保持跨页面一致性
    isAudit.value = localStorage.getItem(STORAGE_KEY) === '1';
  }
}

/**
 * 响应式审核状态，组件中使用
 */
export function useAuditMode() {
  return { isAudit };
}
