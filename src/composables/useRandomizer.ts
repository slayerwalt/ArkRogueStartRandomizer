import { computed, shallowRef, type Ref } from 'vue';
import { emptyPoolRarities } from '../lib/pool';
import {
  rerollGroup,
  rerollSlot,
  rerollSquad,
  rollSlotsFor,
  rollStart,
  type Rng,
} from '../lib/roll';
import type { Operator, RollResult, RollSettings, Theme } from '../lib/types';

/** 一个会话只保留最近的开局，主题不匹配时既不展示也不允许重抽。 */
export function useRandomizer(
  theme: Readonly<Ref<Theme | null>>,
  operators: readonly Operator[],
  settings: Readonly<Ref<RollSettings>>,
  rng: Rng = Math.random,
) {
  const session = shallowRef<{ themeId: string; result: RollResult } | null>(
    null,
  );
  const result = computed(() =>
    session.value && session.value.themeId === theme.value?.id
      ? session.value.result
      : null,
  );
  const blockReason = computed(() => {
    if (!theme.value) return '当前主题尚未开放随机。';
    const missing = emptyPoolRarities(settings.value);
    return missing.length
      ? `请先为 ${missing.join('、')} 星选择至少一名干员。`
      : '';
  });
  const usedHope = computed(
    () =>
      result.value?.slots.reduce((sum, slot) => sum + slot.hopeCost, 0) ?? 0,
  );
  const remainingHope = computed(
    () => (result.value?.initialHope ?? 0) - usedHope.value,
  );
  function commit(next: RollResult) {
    session.value = { themeId: theme.value!.id, result: next };
  }
  function roll() {
    if (blockReason.value || !theme.value) return;
    commit(rollStart(theme.value, operators, settings.value, rng));
  }
  function rollSquad() {
    if (blockReason.value || !theme.value || !result.value) return;
    commit(
      rollSlotsFor(
        operators,
        settings.value,
        rerollSquad(theme.value, rng),
        result.value.group,
        rng,
      ),
    );
  }
  function rollGroup() {
    if (blockReason.value || !theme.value || !result.value) return;
    commit(
      rollSlotsFor(
        operators,
        settings.value,
        result.value.squad,
        rerollGroup(theme.value, rng),
        rng,
      ),
    );
  }
  function rollSlot(index: number) {
    if (
      blockReason.value ||
      !result.value ||
      !Number.isInteger(index) ||
      !result.value.slots[index]
    )
      return;
    const current = result.value;
    const budget =
      current.initialHope -
      current.slots.reduce(
        (sum, slot, i) => sum + (i === index ? 0 : slot.hopeCost),
        0,
      );
    const slots = current.slots.slice();
    slots[index] = rerollSlot(
      slots[index].slot,
      operators,
      settings.value,
      current.squad,
      budget,
      rng,
    );
    commit({ ...current, slots });
  }
  return {
    result,
    blockReason,
    usedHope,
    remainingHope,
    roll,
    rollSquad,
    rollGroup,
    rollSlot,
  };
}
