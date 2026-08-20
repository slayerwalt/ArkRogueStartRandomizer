import { describe, expect, it } from 'vitest';
import {
  createDefaultSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  type StorageLike,
} from '../src/lib/settings';
import { POOL_RARITIES } from '../src/lib/types';

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

const validIds = new Set(['c1', 'c2', 'c3']);

describe('loadSettings', () => {
  it('无存储时返回默认设置（范围为常见名单）', () => {
    const { settings, pruned } = loadSettings(memStorage(), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(pruned).toBe(0);
  });
  it('JSON 损坏时返回默认设置', () => {
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: '{oops' }), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
  it('读取各星级的范围，剔除数据中不存在的干员并计数', () => {
    const raw = JSON.stringify({
      pool: { 6: ['c1', 'ghost'], 5: ['c2'], 4: [] },
    });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.pool[6]).toEqual(['c1']);
    expect(settings.pool[5]).toEqual(['c2']);
    expect(settings.pool[4]).toEqual([]);
    expect(pruned).toBe(1);
  });
  it('存储中缺少某星级时该星级保留默认（常见名单）', () => {
    const raw = JSON.stringify({ pool: { 6: ['c1'] } });
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.pool[6]).toEqual(['c1']);
    expect(settings.pool[5]).toEqual(DEFAULT_SETTINGS.pool[5]);
    expect(settings.pool[4]).toEqual(DEFAULT_SETTINGS.pool[4]);
  });
  it('忽略旧版本的排除名单字段', () => {
    const raw = JSON.stringify({ excludes: ['c1'] });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(pruned).toBe(0);
  });
  it('返回全新对象且修改不污染默认设置', () => {
    const fresh = createDefaultSettings();
    const { settings } = loadSettings(memStorage(), validIds);
    expect(settings).not.toBe(DEFAULT_SETTINGS);
    settings.pool[6].push('c1');
    expect(DEFAULT_SETTINGS.pool[6]).toEqual(fresh.pool[6]);
  });
});

describe('saveSettings', () => {
  it('写入后可完整读回', () => {
    const storage = memStorage();
    const s = { pool: { 6: ['c1'], 5: ['c2'], 4: ['c3'] } };
    saveSettings(storage, s);
    const { settings } = loadSettings(storage, validIds);
    expect(settings).toEqual(s);
  });
});

describe('createDefaultSettings', () => {
  it('每次返回互不影响的新对象', () => {
    const a = createDefaultSettings();
    a.pool[6].push('c1');
    const b = createDefaultSettings();
    expect(b.pool[6]).not.toContain('c1');
    expect(b.pool[6]).toEqual(DEFAULT_SETTINGS.pool[6]);
    for (const r of POOL_RARITIES) expect(Array.isArray(b.pool[r])).toBe(true);
  });
});
