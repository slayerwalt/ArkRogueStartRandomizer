import { effectScope, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { validateGameData } from '../src/lib/data';
import { createDefaultSettings, SETTINGS_KEY } from '../src/lib/settings';
import type { StorageLike } from '../src/lib/settings';
import type { Theme } from '../src/lib/types';
import { useRandomizer } from '../src/composables/useRandomizer';
import { useRollSettings } from '../src/composables/useRollSettings';

const data = validateGameData(rawData);
function setup() {
  const theme = ref<Theme | null>(data.themes[0]);
  const settings = ref(createDefaultSettings());
  const randomizer = useRandomizer(theme, data.operators, settings, () => 0.31);
  return { theme, settings, ...randomizer };
}

describe('随机会话', () => {
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
    app.settings.value = createDefaultSettings();
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
  const validIds = new Set(data.operators.map((o) => o.id));
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
      const state = scope.run(() => useRollSettings(validIds, getStorage))!;
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
    const state = scope.run(() => useRollSettings(validIds, () => storage))!;
    const six = data.operators.find((o) => o.rarity === 6)!.id;
    state.settings.value.pool[6] = [six];
    expect(JSON.parse(values[SETTINGS_KEY]).pool[6]).toEqual([six]);
    scope.stop();
    const saved = JSON.parse(values[SETTINGS_KEY]);
    saved.pool[6].push('removed-id');
    values[SETTINGS_KEY] = JSON.stringify(saved);
    const restoredScope = effectScope();
    const restored = restoredScope.run(() =>
      useRollSettings(validIds, () => storage),
    )!;
    expect(restored.settings.value.pool[6]).toEqual([six]);
    expect(restored.pruneNotice.value).toContain('1');
    expect(JSON.parse(values[SETTINGS_KEY]).pool[6]).toEqual([six]);
    restoredScope.stop();
  });
});
