import { describe, expect, it } from 'vitest';
import { useRecruitCounts } from '../src/composables/useRecruitCounts';
import { DEFAULT_RECRUIT_COUNTS, RECRUIT_COUNTS_KEY, type RecruitCounts } from '../src/lib/recruit-counts';
import type { StorageLike } from '../src/lib/settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = value; },
  };
  return { values, storage };
}

describe('抽取数量设置', () => {
  it('默认六星5名、五星0名，保存后可重新读取且不覆盖干员范围', () => {
    const pool = '{"version":2,"pool":{"6":["selected"]}}';
    const { values, storage } = memoryStorage({ 'rogue-start-settings': pool });
    const settings = useRecruitCounts(() => storage);
    expect(settings.counts.value).toEqual({ six: 5, five: 0 });
    const draft = { six: 7, five: 0 };
    expect(settings.updateCounts(draft)).toBe(true);
    draft.six = 30;
    expect(settings.counts.value).toEqual({ six: 7, five: 0 });
    expect(useRecruitCounts(() => storage).counts.value).toEqual({ six: 7, five: 0 });
    expect(values['rogue-start-settings']).toBe(pool);
    expect(settings.updateCounts({ ...DEFAULT_RECRUIT_COUNTS })).toBe(true);
    expect(useRecruitCounts(() => storage).counts.value).toEqual(DEFAULT_RECRUIT_COUNTS);
  });

  it.each([
    { six: 0, five: 0 }, { six: -1, five: 2 }, { six: 2, five: 0.5 },
    { six: 100, five: 1 }, { six: 2, five: Number.NaN }, { six: Number.POSITIVE_INFINITY, five: 2 },
    { six: '2', five: 3 }, { six: '', five: 3 }, { six: 2 }, null,
  ])('无效输入不覆盖当前设置或已保存数量：%o', (invalid) => {
    const { values, storage } = memoryStorage();
    const settings = useRecruitCounts(() => storage);
    settings.updateCounts({ six: 3, five: 1 });
    const before = values[RECRUIT_COUNTS_KEY];
    expect(settings.updateCounts(invalid as RecruitCounts)).toBe(false);
    expect(settings.counts.value).toEqual({ six: 3, five: 1 });
    expect(values[RECRUIT_COUNTS_KEY]).toBe(before);
  });

  it.each(['broken-json', 'null', '{"version":2,"counts":{"six":7,"five":3}}',
    '{"version":1,"counts":{"six":-1,"five":2}}', '{"version":1,"counts":{"six":0,"five":0}}'])
  ('无效存储恢复默认数量：%s', (raw) => {
    const { storage } = memoryStorage({ [RECRUIT_COUNTS_KEY]: raw });
    expect(useRecruitCounts(() => storage).counts.value).toEqual(DEFAULT_RECRUIT_COUNTS);
  });

  it('读取或写入浏览器失败仍可在本次会话调整数量', () => {
    const failure = () => { throw new Error('Storage unavailable'); };
    for (const getStorage of [failure, () => ({ getItem: failure, setItem: failure }),
      () => ({ getItem: () => null, setItem: failure })]) {
      const settings = useRecruitCounts(getStorage);
      expect(settings.updateCounts({ six: 0, five: 8 })).toBe(true);
      expect(settings.counts.value).toEqual({ six: 0, five: 8 });
      expect(settings.storageNotice.value).toContain('本次使用不受影响');
    }
  });
});
