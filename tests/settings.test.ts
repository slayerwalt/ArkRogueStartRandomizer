import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY, type StorageLike } from '../src/lib/settings';

function memStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
}

const validIds = new Set(['c1', 'c2']);

describe('loadSettings', () => {
  it('无存储时返回默认设置', () => {
    const { settings, pruned } = loadSettings(memStorage(), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(pruned).toBe(0);
  });
  it('JSON 损坏时返回默认设置', () => {
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: '{oops' }), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
  it('剔除数据中不存在的干员并计数', () => {
    const raw = JSON.stringify({ withOperators: false, rarities: [5, 6], excludes: ['c1', 'ghost'] });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.withOperators).toBe(false);
    expect(settings.rarities).toEqual([5, 6]);
    expect(settings.excludes).toEqual(['c1']);
    expect(pruned).toBe(1);
  });
  it('非法字段回退默认值', () => {
    const raw = JSON.stringify({ withOperators: 'yes', rarities: [0, 7, 'x', 5], excludes: 'nope' });
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.withOperators).toBe(DEFAULT_SETTINGS.withOperators);
    expect(settings.rarities).toEqual([5]);
    expect(settings.excludes).toEqual([]);
  });
});

describe('saveSettings', () => {
  it('写入后可完整读回', () => {
    const storage = memStorage();
    const s = { withOperators: false, rarities: [6], excludes: ['c2'] };
    saveSettings(storage, s);
    const { settings } = loadSettings(storage, validIds);
    expect(settings).toEqual(s);
  });
});
