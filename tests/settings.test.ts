import { describe, expect, it } from 'vitest';
import {
  createDefaultSettings,
  loadSettings,
  saveSettings,
  SETTINGS_KEY,
  type StorageLike,
} from '../src/lib/settings';
import { POOL_RARITIES } from '../src/lib/types';
import { LEGACY_DEFAULT_POOL } from '../src/lib/legacy-settings';
import rawData from '../src/data/rogue-data.json';

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

const operators = [
  { id: 'c1', rarity: 6 }, { id: 'c2', rarity: 5 },
  { id: 'c3', rarity: 4 }, { id: 'c4', rarity: 6 }, { id: 'c5', rarity: 3 },
];
const defaults = createDefaultSettings(operators);

describe('loadSettings', () => {
  it('无存储时按当前数据全选四、五、六星', () => {
    const { settings, pruned } = loadSettings(memStorage(), operators);
    expect(settings.pool).toEqual({ 6: ['c1', 'c4'], 5: ['c2'], 4: ['c3'] });
    expect(pruned).toBe(0);
  });
  it('JSON 损坏时返回默认设置', () => {
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: '{oops' }), operators);
    expect(settings).toEqual(defaults);
  });
  it('保留手动范围，剔除失效、重复和星级不匹配的干员', () => {
    const raw = JSON.stringify({
      pool: { 6: ['c1', 'ghost', 'c1', 'c2'], 5: ['c2'], 4: [] },
    });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators);
    expect(settings.pool[6]).toEqual(['c1']);
    expect(settings.pool[5]).toEqual(['c2']);
    expect(settings.pool[4]).toEqual([]);
    expect(pruned).toBe(3);
  });
  it('存储中缺少某星级时全选该星级', () => {
    const raw = JSON.stringify({ pool: { 6: ['c1'] } });
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators);
    expect(settings.pool[6]).toEqual(['c1']);
    expect(settings.pool[5]).toEqual(['c2']);
    expect(settings.pool[4]).toEqual(['c3']);
  });
  it('忽略旧版本的排除名单字段', () => {
    const raw = JSON.stringify({ excludes: ['c1'] });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators);
    expect(settings).toEqual(defaults);
    expect(pruned).toBe(0);
  });
  it('返回全新对象且修改不污染默认设置', () => {
    const fresh = createDefaultSettings(operators);
    const { settings } = loadSettings(memStorage(), operators);
    expect(settings).not.toBe(defaults);
    settings.pool[6].push('temporary-id');
    expect(defaults.pool[6]).toEqual(fresh.pool[6]);
  });

  it('旧版各星级默认名单迁移为完整数据池', () => {
    const storage = memStorage({ [SETTINGS_KEY]: JSON.stringify({ pool: LEGACY_DEFAULT_POOL }) });
    const loaded = loadSettings(storage, rawData.operators);
    expect(loaded.migrated).toBe(true);
    for (const rarity of POOL_RARITIES) {
      expect(loaded.settings.pool[rarity]).toEqual(rawData.operators.filter((o) => o.rarity === rarity).map((o) => o.id));
      expect(loaded.settings.pool[rarity].length).toBeGreaterThan(LEGACY_DEFAULT_POOL[rarity].length);
    }
  });

  it('按星级迁移旧默认，保留其他星级的手动范围和清空设置', () => {
    const storage = memStorage({ [SETTINGS_KEY]: JSON.stringify({ pool: {
      6: [...LEGACY_DEFAULT_POOL[6]].reverse(), 5: ['char_002_amiya'], 4: [],
    } }) });
    const loaded = loadSettings(storage, rawData.operators);
    expect(loaded.migrated).toBe(true);
    expect(loaded.settings.pool[6]).toEqual(createDefaultSettings(rawData.operators).pool[6]);
    expect(loaded.settings.pool[5]).toEqual(['char_002_amiya']);
    expect(loaded.settings.pool[4]).toEqual([]);
  });
});

describe('saveSettings', () => {
  it('写入后可完整读回', () => {
    const storage = memStorage();
    const s = { pool: { 6: ['c1'], 5: ['c2'], 4: ['c3'] } };
    saveSettings(storage, s);
    const { settings } = loadSettings(storage, operators);
    expect(settings).toEqual(s);
    expect(JSON.parse(storage.store[SETTINGS_KEY]).version).toBe(2);
  });
  it('新版本手动选出与旧默认相同的范围时，不再触发迁移', () => {
    const storage = memStorage();
    saveSettings(storage, { pool: LEGACY_DEFAULT_POOL });
    const loaded = loadSettings(storage, rawData.operators);
    expect(loaded.settings.pool).toEqual(LEGACY_DEFAULT_POOL);
    expect(loaded.migrated).toBe(false);
  });
});

describe('createDefaultSettings', () => {
  it('每次返回互不影响的新对象', () => {
    const a = createDefaultSettings(operators);
    a.pool[6].push('temporary-id');
    const b = createDefaultSettings(operators);
    expect(b.pool[6]).not.toContain('temporary-id');
    expect(b.pool[6]).toEqual(defaults.pool[6]);
    for (const r of POOL_RARITIES) expect(Array.isArray(b.pool[r])).toBe(true);
  });
});
