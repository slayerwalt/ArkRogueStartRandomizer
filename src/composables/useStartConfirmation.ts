import { computed, shallowRef, type Ref } from 'vue';
import type { CandidateStartController } from './useCandidateStart';
import type { CandidateDraw } from '../lib/candidate-start';
import type { Operator, RollResult, Theme } from '../lib/types';

export type ConfirmedStart = {
  operators: Operator[];
} & (
  | { mode: 'candidates'; source: CandidateDraw; chosenId: string }
  | { mode: 'quick'; source: RollResult }
);

interface ConfirmationSession {
  themeId: string;
  collapsed: boolean;
  start: ConfirmedStart | null;
}

/** 已招募名单取自最近一次确认；草稿调整不会改变已确认的快照。 */
export function useStartConfirmation(
  theme: Readonly<Ref<Theme | null>>,
  candidates: CandidateStartController,
  quickResult: Readonly<Ref<RollResult | null>>,
) {
  const session = shallowRef<ConfirmationSession | null>(null);
  const current = computed(() => session.value?.themeId === theme.value?.id ? session.value : null);
  const confirmedStart = computed(() => current.value?.start ?? null);
  const recruited = computed(() => confirmedStart.value?.operators.filter((operator) => operator.rarity === 6) ?? []);
  const hasConfirmed = computed(() => Boolean(current.value?.start));
  const collapsed = computed(() => current.value?.collapsed ?? false);
  const candidateRegistered = computed(() => {
    const start = current.value?.start;
    return start?.mode === 'candidates' && candidates.confirmed.value &&
      start.source === candidates.draw.value && start.chosenId === candidates.chosen.value?.id;
  });
  const quickRegistered = computed(() => current.value?.start?.mode === 'quick' &&
    current.value.start.source === quickResult.value);
  const canConfirmQuick = computed(() => Boolean(theme.value && quickResult.value?.slots.length &&
    quickResult.value.slots.every((slot) => slot.operator && !slot.empty)));

  function update(patch: Partial<ConfirmationSession>) {
    if (!theme.value) return;
    session.value = {
      ...(current.value ?? { themeId: theme.value.id, collapsed: false, start: null }),
      ...patch,
    };
  }
  function toggleCollapsed() {
    update({ collapsed: !collapsed.value });
  }
  function confirmCandidate() {
    const draw = candidates.draw.value;
    const chosen = candidates.chosen.value;
    if (!theme.value || !draw || !chosen || chosen.rarity !== 6) return false;
    candidates.confirmChoice();
    const previous = current.value?.start;
    if (previous?.mode === 'candidates' && previous.source === draw && previous.chosenId === chosen.id) {
      update({ collapsed: true });
      return true;
    }
    update({
      collapsed: true,
      start: { mode: 'candidates', source: draw, chosenId: chosen.id, operators: [chosen] },
    });
    return true;
  }
  function confirmQuick() {
    const result = quickResult.value;
    if (!canConfirmQuick.value || !result) return false;
    if (quickRegistered.value) {
      update({ collapsed: true });
      return true;
    }
    const operators = result.slots.flatMap((slot) => slot.operator ? [slot.operator] : []);
    const unique = [...new Map(operators.map((operator) => [operator.id, operator])).values()];
    update({ collapsed: true, start: { mode: 'quick', source: result, operators: unique } });
    return true;
  }
  return { confirmedStart, recruited, hasConfirmed, collapsed, candidateRegistered, quickRegistered,
    canConfirmQuick, toggleCollapsed, confirmCandidate, confirmQuick };
}
