import { effectScope, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { validateGameData } from '../src/lib/data';
import { createDefaultSettings, SETTINGS_KEY } from '../src/lib/settings';
import type { StorageLike } from '../src/lib/settings';
import type { Theme } from '../src/lib/types';
import { useRandomizer } from '../src/composables/useRandomizer';
import { useRollSettings } from '../src/composables/useRollSettings';
import { LEGACY_DEFAULT_POOL } from '../src/lib/legacy-settings';
import { effectiveHopeCost } from '../src/lib/roll';

const data = validateGameData(rawData);
function setup() {
  const theme = ref<Theme | null>(data.themes[0]);
  const settings = ref(createDefaultSettings(data.operators));
  const randomizer = useRandomizer(theme, data.operators, settings, () => 0.31);
  return { theme, settings, ...randomizer };
}

describe('随机会话', () => {
  it('首次开局使用手选条件，全部重随机重新抽取条件', () => {
    const app = setup();
    const squad = app.theme.value!.squads[0];
    const group = app.theme.value!.recruitGroups[0];
    app.selectSquad(squad.id);
    app.selectGroup(group.id);
    expect(app.result.value).toBeNull();
    expect(app.squad.value).toBe(squad);
    expect(app.group.value).toBe(group);
    expect(app.squadRandomized.value).toBe(false);
    app.roll();
    expect(app.result.value!.squad).toBe(squad);
    expect(app.result.value!.group).toBe(group);
    app.roll();
    expect(app.squad.value).not.toBe(squad);
    expect(app.group.value).not.toBe(group);
    expect(app.squadRandomized.value).toBe(true);
    expect(app.groupRandomized.value).toBe(true);
  });
  it('开局前单项随机不提前生成阵容，开始时只补齐未选项目', () => {
    for (const field of ['squad', 'group'] as const) {
      const app = setup();
      if (field === 'squad') app.rollSquad();
      else app.rollGroup();
      const selected = app[field].value;
      expect(selected).not.toBeNull();
      expect(app.result.value).toBeNull();
      expect(app[field === 'squad' ? 'group' : 'squad'].value).toBeNull();
      app.roll();
      expect(app.result.value![field]).toBe(selected);
      expect(app.result.value!.slots).toHaveLength(3);
      expect(app.remainingHope.value).toBeGreaterThanOrEqual(0);
    }
  });
  it('手选分队或组合重建干员并保留另一项，使用新希望预算与券位限制', () => {
    const app = setup();
    const highHope = app.theme.value!.squads.find((s) => s.initialHopeBonus > 0)!;
    const lowHope = app.theme.value!.squads.find((s) => s.initialHopeBonus === 0)!;
    app.selectSquad(highHope.id);
    app.roll();
    const before = app.result.value!;
    app.selectSquad(lowHope.id);
    expect(app.result.value!.squad).toBe(lowHope);
    expect(app.result.value!.group).toBe(before.group);
    expect(app.result.value!.initialHope).toBeLessThan(before.initialHope);
    expect(app.result.value!.slots).not.toBe(before.slots);
    const group = app.theme.value!.recruitGroups.find((g) => g.id !== before.group.id)!;
    app.selectGroup(group.id);
    const after = app.result.value!;
    expect(after.squad).toBe(lowHope);
    expect(after.group).toBe(group);
    expect(after.slots.map((s) => s.slot)).toEqual(group.slots);
    expect(app.remainingHope.value).toBeGreaterThanOrEqual(0);
    for (const slot of after.slots) {
      if (!slot.operator) continue;
      expect(slot.slot.classes).toContain(slot.operator.profession);
      expect(slot.operator.rarity).toBeLessThanOrEqual(slot.slot.rarityCap ?? 6);
      expect(slot.hopeCost).toBe(effectiveHopeCost(slot.operator, lowHope));
    }
  });
  it('无效选择、重复选择、空范围及不可用主题不会覆盖当前结果', () => {
    const app = setup();
    app.roll();
    const before = app.result.value!;
    app.selectSquad('invalid');
    app.selectGroup('invalid');
    app.selectSquad(before.squad.id);
    app.selectGroup(before.group.id);
    expect(app.result.value).toBe(before);
    app.settings.value.pool[6] = [];
    app.selectSquad(data.themes[0].squads[0].id);
    app.selectGroup(data.themes[0].recruitGroups[0].id);
    expect(app.result.value).toBe(before);
    app.theme.value = null;
    app.selectSquad(data.themes[0].squads[0].id);
    app.selectGroup(data.themes[0].recruitGroups[0].id);
    app.theme.value = data.themes[0];
    expect(app.result.value).toBe(before);
  });
  it('尚未随机和主题不可用时均无结果，返回原主题恢复开局', () => {
    const app = setup();
    expect(app.result.value).toBeNull();
    app.theme.value = null;
    expect(app.result.value).toBeNull();
    app.roll();
    expect(app.result.value).toBeNull();
    app.theme.value = data.themes[0];
    app.roll();
    const before = app.result.value;
    app.theme.value = { ...data.themes[0], id: 'different-theme' };
    expect(app.result.value).toBeNull();
    app.rollSlot(0);
    app.theme.value = null;
    app.rollGroup();
    app.rollSquad();
    app.theme.value = data.themes[0];
    expect(app.result.value).toBe(before);
  });
  it('空范围阻止四种动作，恢复范围后立即解除', () => {
    const app = setup();
    app.roll();
    const before = app.result.value;
    app.settings.value.pool[6] = [];
    expect(app.blockReason.value).toContain('6');
    app.roll();
    app.rollSquad();
    app.rollGroup();
    app.rollSlot(0);
    expect(app.result.value).toBe(before);
    app.settings.value = createDefaultSettings(data.operators);
    expect(app.blockReason.value).toBe('');
    app.roll();
    expect(app.result.value).not.toBe(before);
  });
  it('局部重抽遵守保留规则和希望预算，非法索引不改变结果', () => {
    const app = setup();
    app.roll();
    const before = app.result.value!;
    app.rollSlot(1);
    const after = app.result.value!;
    expect(after.squad).toBe(before.squad);
    expect(after.group).toBe(before.group);
    expect(after.slots[0]).toBe(before.slots[0]);
    expect(after.slots[2]).toBe(before.slots[2]);
    expect(after.slots[1]).not.toBe(before.slots[1]);
    expect(app.usedHope.value).toBeLessThanOrEqual(after.initialHope);
    expect(app.remainingHope.value).toBe(
      after.initialHope - app.usedHope.value,
    );
    app.rollSlot(-1);
    app.rollSlot(99);
    app.rollSlot(0.5);
    expect(app.result.value).toBe(after);
    app.rollSquad();
    expect(app.result.value!.group).toBe(after.group);
    expect(
      app.result.value!.slots.every((slot, i) => slot !== after.slots[i]),
    ).toBe(true);
    const squad = app.result.value!.squad;
    app.rollGroup();
    expect(app.result.value!.squad).toBe(squad);
    expect(app.remainingHope.value).toBeGreaterThanOrEqual(0);
  });
  it('修改范围不改旧阵容，后续重抽使用新的范围', () => {
    const app = setup();
    app.roll();
    const before = app.result.value!;
    for (const rarity of [4, 5, 6]) {
      app.settings.value.pool[rarity] = data.operators
        .filter(
          (o) =>
            o.rarity === rarity &&
            !before.slots.some((s) => s.operator?.id === o.id),
        )
        .map((o) => o.id);
    }
    expect(app.result.value).toBe(before);
    app.roll();
    for (const slot of app.result.value!.slots) {
      if (slot.operator && slot.operator.rarity > 3)
        expect(app.settings.value.pool[slot.operator.rarity]).toContain(
          slot.operator.id,
        );
    }
  });
});

describe('设置持久化边界', () => {
  it('存储获取、读取、写入失败时保留可用的会话设置', () => {
    const failure = () => {
      throw new Error('storage unavailable');
    };
    const stores: (() => StorageLike)[] = [
      failure,
      () => ({ getItem: failure, setItem: failure }),
      () => ({ getItem: () => null, setItem: failure }),
    ];
    for (const getStorage of stores) {
      const scope = effectScope();
      const state = scope.run(() => useRollSettings(data.operators, getStorage))!;
      state.settings.value.pool[6] = ['test-session-value'];
      expect(state.settings.value.pool[6]).toEqual(['test-session-value']);
      expect(state.storageNotice.value).toContain('本次使用不受影响');
      scope.stop();
    }
  });
  it('立即保存选择，重新加载后恢复，失效 ID 被移除并写回', () => {
    const values: Record<string, string> = {};
    const storage: StorageLike = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => {
        values[key] = value;
      },
    };
    const scope = effectScope();
    const state = scope.run(() => useRollSettings(data.operators, () => storage))!;
    const six = data.operators.find((o) => o.rarity === 6)!.id;
    const excludedSix = data.operators.filter((o) => o.rarity === 6 && o.id !== six).map((o) => o.id);
    state.settings.value.pool[6] = [six];
    expect(JSON.parse(values[SETTINGS_KEY]).excluded[6]).toEqual(excludedSix);
    scope.stop();
    const saved = JSON.parse(values[SETTINGS_KEY]);
    saved.excluded[6].push('removed-id');
    values[SETTINGS_KEY] = JSON.stringify(saved);
    const restoredScope = effectScope();
    const restored = restoredScope.run(() =>
      useRollSettings(data.operators, () => storage),
    )!;
    expect(restored.settings.value.pool[6]).toEqual([six]);
    expect(restored.pruneNotice.value).toContain('1');
    expect(JSON.parse(values[SETTINGS_KEY]).excluded[6]).toEqual(excludedSix);
    restoredScope.stop();
  });
  it.each([{ pool: LEGACY_DEFAULT_POOL }, { version: 2, pool: { 6: [], 5: [], 4: [] } }])
  ('旧范围重置后立即保存黑名单，再次加载保留新排除且不影响其他设置：%o', (oldSettings) => {
    const countSettings = '{"version":1,"counts":{"six":7,"five":1}}';
    const values: Record<string, string> = {
      [SETTINGS_KEY]: JSON.stringify(oldSettings),
      'rolllike-recruit-counts': countSettings,
      'rolllike-usage-guide-seen': '1',
    };
    const storage: StorageLike = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => { values[key] = value; },
    };
    const scope = effectScope();
    const state = scope.run(() => useRollSettings(data.operators, () => storage))!;
    expect(state.settings.value).toEqual(createDefaultSettings(data.operators));
    expect(JSON.parse(values[SETTINGS_KEY])).toEqual({ version: 3, excluded: { 6: [], 5: [], 4: [] } });
    const excluded = state.settings.value.pool[6].shift()!;
    expect(JSON.parse(values[SETTINGS_KEY]).excluded[6]).toEqual([excluded]);
    scope.stop();
    const restoredScope = effectScope();
    const restored = restoredScope.run(() => useRollSettings(data.operators, () => storage))!;
    expect(restored.settings.value).toEqual(state.settings.value);
    expect(restored.settings.value.pool[6]).not.toContain(excluded);
    expect(values['rolllike-recruit-counts']).toBe(countSettings);
    expect(values['rolllike-usage-guide-seen']).toBe('1');
    restoredScope.stop();
  });

  it('重新加载更新后的干员数据时，新增自动参与，原手动排除继续生效', () => {
    const values: Record<string, string> = {};
    const storage: StorageLike = {
      getItem: (key) => values[key] ?? null,
      setItem: (key, value) => { values[key] = value; },
    };
    const scope = effectScope();
    const state = scope.run(() => useRollSettings(data.operators, () => storage))!;
    const excluded = state.settings.value.pool[6].shift()!;
    scope.stop();
    const added = { ...data.operators.find((o) => o.rarity === 6)!, id: 'new-operator', name: '新增干员' };
    const restoredScope = effectScope();
    const restored = restoredScope.run(() => useRollSettings([...data.operators, added], () => storage))!;
    expect(restored.settings.value.pool[6]).toContain(added.id);
    expect(restored.settings.value.pool[6]).not.toContain(excluded);
    expect(restored.pruneNotice.value).toBe('');
    restoredScope.stop();
  });
});
