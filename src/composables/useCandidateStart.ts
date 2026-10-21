import { computed, shallowRef, type Ref } from 'vue';
import { CANDIDATES_PER_SLOT, drawStartCandidates, sixStarPool, START_PROFESSION_SLOTS, type CandidateDraw } from '../lib/candidate-start';
import { operatorIdentity } from '../lib/pool';
import { pickOne, type Rng } from '../lib/roll';
import type { Operator, RollSettings, Squad, Theme } from '../lib/types';

interface CandidateSession {
  themeId: string;
  professions: string[];
  professionSlot: number | null;
  squad: Squad | null;
  squadRandomized: boolean;
  draw: CandidateDraw | null;
  selectedId: string | null;
  confirmed: boolean;
}

/** 与全随机开局独立；候选固定到下次抽取，设置变更仅用于后续抽取。 */
export function useCandidateStart(
  theme: Readonly<Ref<Theme | null>>,
  operators: readonly Operator[],
  settings: Readonly<Ref<RollSettings>>,
  rng: Rng = Math.random,
  excluded: Readonly<Ref<readonly Operator[]>> = shallowRef([]),
) {
  const session = shallowRef<CandidateSession | null>(null);
  const current = computed(() => session.value?.themeId === theme.value?.id ? session.value : null);
  const professions = computed(() => current.value?.professions ?? []);
  const squad = computed(() => current.value?.squad ?? null);
  const squadRandomized = computed(() => current.value?.squadRandomized ?? false);
  const draw = computed(() => current.value?.draw ?? null);
  const professionSlot = computed(() => draw.value ? null : current.value?.professionSlot ??
    (professions.value.length < START_PROFESSION_SLOTS ? professions.value.length : null));
  const confirmed = computed(() => current.value?.confirmed ?? false);
  const excludedKeys = computed(() => new Set(excluded.value.map(operatorIdentity)));
  const candidates = computed(() => draw.value?.candidates.filter((operator) => !excludedKeys.value.has(operatorIdentity(operator))) ?? []);
  const chosen = computed(() => (confirmed.value ? draw.value?.candidates : candidates.value)
    ?.find((operator) => operator.id === current.value?.selectedId) ?? null);
  const shortages = computed(() => {
    const quotas = new Map<string, number>();
    for (const profession of professions.value) quotas.set(profession, (quotas.get(profession) ?? 0) + CANDIDATES_PER_SLOT);
    return [...quotas].flatMap(([profession, requested]) => {
      const actual = candidates.value.filter((operator) => operator.profession === profession).length;
      return actual < requested ? [{ profession, requested, actual }] : [];
    });
  });
  const available = computed(() => sixStarPool(operators, settings.value, excluded.value));
  const blockReason = computed(() => {
    if (!theme.value) return '当前主题尚未开放随机。';
    if (!available.value.length) return (settings.value.pool[6] ?? []).length
      ? '当前范围内的六星均已选取，请移除已选干员或调整范围。'
      : '请先为六星选择至少一名干员。';
    if (professions.value.length === START_PROFESSION_SLOTS &&
      !available.value.some((operator) => professions.value.includes(operator.profession))) {
      return '所选职业中暂无可用六星干员，请核对招募券或调整范围。';
    }
    return '';
  });
  const canDraw = computed(() => professions.value.length === START_PROFESSION_SLOTS && !blockReason.value);

  function update(patch: Partial<CandidateSession>) {
    if (!theme.value) return;
    session.value = {
      ...(current.value ?? { themeId: theme.value.id, professions: [], professionSlot: null, squad: null, squadRandomized: false, draw: null, selectedId: null, confirmed: false }),
      ...patch,
    };
  }
  function addProfession(profession: string) {
    if (draw.value || professions.value.length >= START_PROFESSION_SLOTS ||
      !operators.some((operator) => operator.profession === profession)) return;
    update({ professions: [...professions.value, profession], professionSlot: null });
  }
  function selectProfessionSlot(index: number) {
    if (draw.value || !Number.isInteger(index) || index < 0 || index >= professions.value.length) return;
    update({ professionSlot: current.value?.professionSlot === index ? null : index });
  }
  function fillProfession(profession: string) {
    const index = professionSlot.value;
    if (index === null || !operators.some((operator) => operator.profession === profession)) return;
    if (index === professions.value.length) {
      addProfession(profession);
      return;
    }
    update({ professions: professions.value.map((item, i) => i === index ? profession : item), professionSlot: null });
  }
  function removeProfession(index: number) {
    if (draw.value || !Number.isInteger(index) || index < 0 || index >= professions.value.length) return;
    update({ professions: professions.value.filter((_, i) => i !== index), professionSlot: null });
  }
  function clearProfessions() {
    if (!draw.value) update({ professions: [], professionSlot: null });
  }
  function rollCandidates() {
    if (!canDraw.value) return;
    update({ draw: drawStartCandidates(operators, settings.value, professions.value, rng, excluded.value), selectedId: null, confirmed: false, professionSlot: null });
  }
  function selectCandidate(id: string) {
    if (confirmed.value || !candidates.value.some((operator) => operator.id === id)) return;
    update({ selectedId: id });
  }
  function confirmChoice() {
    if (chosen.value) update({ confirmed: true });
  }
  function backToCandidates() {
    if (draw.value) update({ confirmed: false });
  }
  function editProfessions() {
    update({ draw: null, selectedId: null, confirmed: false, professionSlot: null });
  }
  function rollSquad() {
    if (theme.value?.squads.length) update({ squad: pickOne(theme.value.squads, rng), squadRandomized: true });
  }
  function selectSquad(id: string) {
    const next = theme.value?.squads.find((item) => item.id === id);
    if (next) update({ squad: next, squadRandomized: false });
  }
  function resetDraft() {
    if (current.value) session.value = null;
  }
  return { professions, professionSlot, squad, squadRandomized, draw, candidates, shortages, chosen, confirmed, available, blockReason, canDraw,
    addProfession, selectProfessionSlot, fillProfession, removeProfession, clearProfessions, rollCandidates, selectCandidate, confirmChoice,
    backToCandidates, editProfessions, rollSquad, selectSquad, resetDraft };
}

export type CandidateStartController = ReturnType<typeof useCandidateStart>;
