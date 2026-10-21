import { describe, expect, it, vi } from 'vitest';
import { USAGE_GUIDE_SEEN_KEY, useUsageGuide } from '../src/composables/useUsageGuide';
import type { StorageLike } from '../src/lib/settings';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = { ...initial };
  const storage: StorageLike = {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = value; },
  };
  return { values, storage };
}

describe('首次使用说明', () => {
  it('首次访问自动打开，关闭后记住，再次访问不自动弹出', () => {
    const { values, storage } = memoryStorage();
    const guide = useUsageGuide(() => storage);
    expect(guide.isOpen.value).toBe(true);
    expect(values[USAGE_GUIDE_SEEN_KEY]).toBeUndefined();
    guide.close();
    expect(guide.isOpen.value).toBe(false);
    expect(values[USAGE_GUIDE_SEEN_KEY]).toBe('1');
    expect(useUsageGuide(() => storage).isOpen.value).toBe(false);
  });

  it('看过后仍可手动打开，阅读状态与已有设置分开保存', () => {
    const { values, storage } = memoryStorage({
      [USAGE_GUIDE_SEEN_KEY]: '1',
      'rogue-start-settings': '{"version":2,"pool":{"6":[]}}',
    });
    const originalSettings = values['rogue-start-settings'];
    const guide = useUsageGuide(() => storage);
    expect(guide.isOpen.value).toBe(false);
    guide.open();
    expect(guide.isOpen.value).toBe(true);
    guide.close();
    expect(guide.isOpen.value).toBe(false);
    expect(values['rogue-start-settings']).toBe(originalSettings);
  });

  it('无法获取或读取存储时仍可关闭并重新打开说明', () => {
    const failure = () => { throw new Error('Storage unavailable'); };
    for (const getStorage of [failure, () => ({ getItem: failure, setItem: failure })]) {
      const guide = useUsageGuide(getStorage);
      expect(guide.isOpen.value).toBe(true);
      expect(() => guide.close()).not.toThrow();
      expect(guide.isOpen.value).toBe(false);
      guide.open();
      expect(guide.isOpen.value).toBe(true);
    }
  });

  it('写入失败不会阻止关闭；当前页面内可继续手动查看', () => {
    const setItem = vi.fn(() => { throw new Error('Quota exceeded'); });
    const guide = useUsageGuide(() => ({ getItem: () => null, setItem }));
    expect(() => guide.close()).not.toThrow();
    expect(guide.isOpen.value).toBe(false);
    expect(setItem).toHaveBeenCalledWith(USAGE_GUIDE_SEEN_KEY, '1');
    guide.open();
    expect(guide.isOpen.value).toBe(true);
  });
});
