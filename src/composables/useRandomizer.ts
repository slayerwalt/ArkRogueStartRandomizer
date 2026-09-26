import { computed, shallowRef, type Ref } from 'vue';
import { emptyPoolRarities } from '../lib/pool';
import {
  rerollGroup,
  rerollSlot,
  rerollSquad,
  rollSlotsFor,
  type Rng,
} from '../lib/roll';
import type { Operator, RecruitGroup, RollResult, RollSettings, Squad, Theme } from '../lib/types';

interface RandomSession {
  themeId: string;
  squad: Squad | null;
  group: RecruitGroup | null;
  squadRandomized: boolean;
  groupRandomized: boolean;
  result: RollResult | null;
}

/** 一个会话只保留最近的开局，主题不匹配时既不展示也不允许重抽。 */
export function useRandomizer(
  theme: Readonly<Ref<Theme | null>>,
  operators: readonly Operator[],
  settings: Readonly<Ref<RollSettings>>,
  rng: Rng = Math.random,
) {
  const session = shallowRef<RandomSession | null>(null);
  const current = computed(() => session.value?.themeId === theme.value?.id ? session.value : null);
  const result = computed(() => current.value?.result ?? null);
  const squad = computed(() => current.value?.squad ?? null);
  const group = computed(() => current.value?.group ?? null);
  const squadRandomized = computed(() => current.value?.squadRandomized ?? false);
  const groupRandomized = computed(() => current.value?.groupRandomized ?? false);
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
  function update(patch: Partial<RandomSession>) {
    if (!theme.value) return;
    session.value = {
      ...(current.value ?? { themeId: theme.value.id, squad: null, group: null, squadRandomized: false, groupRandomized: false, result: null }),
      ...patch,
    };
  }
  function roll() {
    if (blockReason.value || !theme.value) return;
    // 首次开局采用已选条件；“重新随机全部”重新抽取分队和组合。
    const keepSquad = !result.value && squad.value;
    const keepGroup = !result.value && group.value;
    const nextSquad = keepSquad || rerollSquad(theme.value, rng);
    const nextGroup = keepGroup || rerollGroup(theme.value, rng);
    update({
      squad: nextSquad,
      group: nextGroup,
      squadRandomized: keepSquad ? squadRandomized.value : true,
      groupRandomized: keepGroup ? groupRandomized.value : true,
      result: rollSlotsFor(operators, settings.value, nextSquad, nextGroup, rng),
    });
  }
  function changeSquad(next: Squad, randomized: boolean) {
    const nextResult = result.value && group.value
      ? rollSlotsFor(operators, settings.value, next, group.value, rng)
      : null;
    update({ squad: next, squadRandomized: randomized, result: nextResult });
  }
  function changeGroup(next: RecruitGroup, randomized: boolean) {
    const nextResult = result.value && squad.value
      ? rollSlotsFor(operators, settings.value, squad.value, next, rng)
      : null;
    update({ group: next, groupRandomized: randomized, result: nextResult });
  }
  function selectSquad(id: string) {
    if (blockReason.value || !theme.value) return;
    const next = theme.value.squads.find((item) => item.id === id);
    if (next && next.id !== squad.value?.id) changeSquad(next, false);
  }
  function selectGroup(id: string) {
    if (blockReason.value || !theme.value) return;
    const next = theme.value.recruitGroups.find((item) => item.id === id);
    if (next && next.id !== group.value?.id) changeGroup(next, false);
  }
  function rollSquad() {
    if (blockReason.value || !theme.value) return;
    changeSquad(rerollSquad(theme.value, rng), true);
  }
  function rollGroup() {
    if (blockReason.value || !theme.value) return;
    changeGroup(rerollGroup(theme.value, rng), true);
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
    update({ result: { ...current, slots } });
  }
  function resetDraft() {
    if (current.value) session.value = null;
  }
  return {
    result,
    squad,
    group,
    squadRandomized,
    groupRandomized,
    blockReason,
    usedHope,
    remainingHope,
    roll,
    rollSquad,
    rollGroup,
    rollSlot,
    selectSquad,
    selectGroup,
    resetDraft,
  };
}
