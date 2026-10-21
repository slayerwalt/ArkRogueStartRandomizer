import { describe, expect, it } from 'vitest';
import { createDefaultSettings, loadSettings, saveSettings, SETTINGS_KEY, type StorageLike } from '../src/lib/settings';
import { POOL_RARITIES } from '../src/lib/types';
import { LEGACY_DEFAULT_POOL } from '../src/lib/legacy-settings';
import rawData from '../src/data/rogue-data.json';

function memStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = value; },
  };
}

const operators = [
  { id: 'c1', rarity: 6 }, { id: 'c2', rarity: 5 },
  { id: 'c3', rarity: 4 }, { id: 'c4', rarity: 6 }, { id: 'c5', rarity: 3 },
];
const newOperators = [{ id: 'new6', rarity: 6 }, { id: 'new5', rarity: 5 }, { id: 'new4', rarity: 4 }];
const defaults = createDefaultSettings(operators);

describe('黑名单范围保存与加载', () => {
  it('无设置时全选四、五、六星，保存全选后新增干员仍自动选中', () => {
    const storage = memStorage();
    const loaded = loadSettings(storage, operators);
    expect(loaded.settings.pool).toEqual({ 6: ['c1', 'c4'], 5: ['c2'], 4: ['c3'] });
    expect(loaded.pruned).toBe(0);
    expect(loaded.migrated).toBe(false);
    saveSettings(storage, loaded.settings, operators);
    expect(JSON.parse(storage.store[SETTINGS_KEY])).toEqual({ version: 3, excluded: { 6: [], 5: [], 4: [] } });
    expect(loadSettings(storage, [...operators, ...newOperators]).settings)
      .toEqual(createDefaultSettings([...operators, ...newOperators]));
  });

  it('只保存手动排除项，数据更新后保留排除并选中新干员', () => {
    const storage = memStorage();
    const settings = { pool: { 6: ['c1'], 5: [], 4: ['c3'] } };
    saveSettings(storage, settings, operators);
    expect(JSON.parse(storage.store[SETTINGS_KEY])).toEqual({ version: 3, excluded: { 6: ['c4'], 5: ['c2'], 4: [] } });
    expect(loadSettings(storage, operators).settings).toEqual(settings);
    const expanded = [...operators, ...newOperators];
    const updated = loadSettings(storage, expanded);
    expect(updated.settings.pool).toEqual({ 6: ['c1', 'new6'], 5: ['new5'], 4: ['c3', 'new4'] });
    expect(updated.migrated).toBe(false);
    // 新干员也能手动排除；再次加载不会被“自动选中”覆盖。
    updated.settings.pool[6] = ['c1'];
    saveSettings(storage, updated.settings, expanded);
    expect(loadSettings(storage, expanded).settings.pool[6]).toEqual(['c1']);
    expect(loadSettings(storage, [...expanded, { id: 'later6', rarity: 6 }]).settings.pool[6]).toEqual(['c1', 'later6']);
  });

  it('清空只排除当前已有干员，后续新增仍默认选中；重新全选可清除排除项', () => {
    const storage = memStorage();
    saveSettings(storage, { pool: { 6: [], 5: [], 4: [] } }, operators);
    expect(loadSettings(storage, operators).settings.pool).toEqual({ 6: [], 5: [], 4: [] });
    expect(loadSettings(storage, [...operators, ...newOperators]).settings.pool)
      .toEqual({ 6: ['new6'], 5: ['new5'], 4: ['new4'] });
    saveSettings(storage, createDefaultSettings(operators), operators);
    expect(loadSettings(storage, operators).settings).toEqual(defaults);
  });

  it('缺少某星级黑名单或存入了旧 pool 字段，都不限制该星级的新数据', () => {
    const raw = JSON.stringify({ version: 3, excluded: { 6: ['c1'] }, pool: { 5: [], 4: [] } });
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators);
    expect(settings.pool).toEqual({ 6: ['c4'], 5: ['c2'], 4: ['c3'] });
  });

  it('剔除黑名单中失效、重复、星级错误和非字符串的记录', () => {
    const raw = JSON.stringify({ version: 3, excluded: { 6: ['c1', 'ghost', 'c1', 'c2', null], 5: ['c2'] } });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators);
    expect(settings.pool).toEqual({ 6: ['c4'], 5: [], 4: ['c3'] });
    expect(pruned).toBe(4);
  });

  it.each(['{oops', 'null', '42', '[]', '{"version":99,"excluded":{"6":["c1"]}}'])
  ('损坏或不支持的数据安全回退为全选：%s', (raw) => {
    expect(loadSettings(memStorage({ [SETTINGS_KEY]: raw }), operators)).toEqual({ settings: defaults, pruned: 0, migrated: false });
  });

  it('写入时只生成当前有效的排除项，不保存无效或错星级的参与 ID', () => {
    const storage = memStorage();
    saveSettings(storage, { pool: { 6: ['c1', 'ghost', 'c2'], 5: ['c2', 'c2'], 4: ['c3'] } }, operators);
    expect(JSON.parse(storage.store[SETTINGS_KEY])).toEqual({ version: 3, excluded: { 6: ['c4'], 5: [], 4: [] } });
  });
});

describe('旧范围一次性重置', () => {
  it.each([undefined, 1, 2])('旧版 %s 的手动白名单及清空状态统一重置为全选', (version) => {
    const storage = memStorage({ [SETTINGS_KEY]: JSON.stringify({ version, pool: { 6: ['c1'], 5: [], 4: [] }, excludes: ['c4'] }) });
    const loaded = loadSettings(storage, operators);
    expect(loaded).toEqual({ settings: defaults, pruned: 0, migrated: true });
    saveSettings(storage, loaded.settings, operators);
    expect(JSON.parse(storage.store[SETTINGS_KEY])).toEqual({ version: 3, excluded: { 6: [], 5: [], 4: [] } });
    expect(loadSettings(storage, operators).migrated).toBe(false);
  });

  it('历史常见范围也恢复为当前全选，新版本主动选出同样范围时不会再重置', () => {
    const storage = memStorage({ [SETTINGS_KEY]: JSON.stringify({ pool: LEGACY_DEFAULT_POOL }) });
    expect(loadSettings(storage, rawData.operators).settings).toEqual(createDefaultSettings(rawData.operators));
    saveSettings(storage, { pool: LEGACY_DEFAULT_POOL }, rawData.operators);
    const loaded = loadSettings(storage, rawData.operators);
    for (const rarity of POOL_RARITIES) {
      expect(new Set(loaded.settings.pool[rarity])).toEqual(new Set(LEGACY_DEFAULT_POOL[rarity]));
    }
    expect(loaded.migrated).toBe(false);
  });
});

describe('createDefaultSettings', () => {
  it('默认对象及每次加载的参与名单彼此独立', () => {
    const first = createDefaultSettings(operators);
    first.pool[6].push('temporary-id');
    const loaded = loadSettings(memStorage(), operators);
    loaded.settings.pool[5] = [];
    expect(createDefaultSettings(operators)).toEqual(defaults);
    expect(defaults.pool[6]).toEqual(['c1', 'c4']);
    expect(defaults.pool[5]).toEqual(['c2']);
  });
});
