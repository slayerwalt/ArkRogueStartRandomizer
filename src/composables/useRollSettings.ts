import { ref, watch } from 'vue';
import {
  createDefaultSettings,
  loadSettings,
  saveSettings,
  type StorageLike,
} from '../lib/settings';
import type { RollSettings } from '../lib/types';

/** 浏览器存储仅是持久化边界；不可用时仍保留本次会话的设置。 */
export function useRollSettings(
  validIds: ReadonlySet<string>,
  getStorage: () => StorageLike = () => window.localStorage,
) {
  const settings = ref<RollSettings>(createDefaultSettings());
  const storageNotice = ref('');
  const pruneNotice = ref('');
  let storage: StorageLike | undefined;
  const failed = () => {
    storageNotice.value = '设置暂无法保存到浏览器，本次使用不受影响。';
  };
  const persist = () => {
    if (!storage) return;
    try {
      saveSettings(storage, settings.value);
    } catch {
      failed();
    }
  };
  try {
    storage = getStorage();
    const loaded = loadSettings(storage, validIds);
    settings.value = loaded.settings;
    if (loaded.pruned) {
      pruneNotice.value = `已移除 ${loaded.pruned} 个数据中不存在的干员。`;
      persist();
    }
  } catch {
    failed();
  }
  watch(settings, persist, { deep: true, flush: 'sync' });
  return { settings, storageNotice, pruneNotice };
}
