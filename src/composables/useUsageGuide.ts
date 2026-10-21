import { readonly, shallowRef } from 'vue';
import type { StorageLike } from '../lib/settings';

export const USAGE_GUIDE_SEEN_KEY = 'rolllike-usage-guide-seen';

/** 首次访问显示说明，关闭后记住；存储不可用时仍可正常关闭和重新打开。 */
export function useUsageGuide(getStorage: () => StorageLike = () => window.localStorage) {
  const isOpen = shallowRef(true);
  let storage: StorageLike | undefined;
  try {
    storage = getStorage();
    isOpen.value = storage.getItem(USAGE_GUIDE_SEEN_KEY) !== '1';
  } catch {
    // 浏览器未开放存储时，当前页面仍提供首次指引。
  }

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
    try {
      storage?.setItem(USAGE_GUIDE_SEEN_KEY, '1');
    } catch {
      // 记录阅读状态失败不妨碍用户继续使用页面。
    }
  }

  return { isOpen: readonly(isOpen), open, close };
}
