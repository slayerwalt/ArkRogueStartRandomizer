import { readonly, shallowRef } from 'vue';
import { DEFAULT_RECRUIT_COUNTS, isRecruitCounts, readRecruitCounts, RECRUIT_COUNTS_KEY, type RecruitCounts } from '../lib/recruit-counts';
import type { StorageLike } from '../lib/settings';

export function useRecruitCounts(getStorage: () => StorageLike = () => window.localStorage) {
  const counts = shallowRef<RecruitCounts>({ ...DEFAULT_RECRUIT_COUNTS });
  const storageNotice = shallowRef('');
  let storage: StorageLike | undefined;
  function storageFailed() {
    storageNotice.value = '抽取数量暂无法保存到浏览器，本次使用不受影响。';
  }
  try {
    storage = getStorage();
    counts.value = readRecruitCounts(storage.getItem(RECRUIT_COUNTS_KEY));
  } catch {
    storageFailed();
  }

  function updateCounts(next: RecruitCounts): boolean {
    if (!isRecruitCounts(next)) return false;
    counts.value = { six: next.six, five: next.five };
    try {
      if (storage) {
        storage.setItem(RECRUIT_COUNTS_KEY, JSON.stringify({ version: 1, counts: counts.value }));
        storageNotice.value = '';
      }
    } catch {
      storageFailed();
    }
    return true;
  }

  return { counts: readonly(counts), storageNotice: readonly(storageNotice), updateCounts };
}
