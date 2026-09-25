import { computed, shallowRef, type Ref } from 'vue';
import { drawStartCandidates, sixStarPool, START_PROFESSION_SLOTS, type CandidateDraw } from '../lib/candidate-start';
import { pickOne, type Rng } from '../lib/roll';
import type { Operator, RollSettings, Squad, Theme } from '../lib/types';

interface CandidateSession {
  themeId: string;
  professions: string[];
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
) {
  const session = shallowRef<CandidateSession | null>(null);
  const current = computed(() => session.value?.themeId === theme.value?.id ? session.value : null);
  const professions = computed(() => current.value?.professions ?? []);
  const squad = computed(() => current.value?.squad ?? null);
  const squadRandomized = computed(() => current.value?.squadRandomized ?? false);
  const draw = computed(() => current.value?.draw ?? null);
  const chosen = computed(() => draw.value?.candidates.find((operator) => operator.id === current.value?.selectedId) ?? null);
  const confirmed = computed(() => current.value?.confirmed ?? false);
  const available = computed(() => sixStarPool(operators, settings.value));
  const blockReason = computed(() => {
    if (!theme.value) return '当前主题尚未开放随机。';
    if (!available.value.length) return '请先为六星选择至少一名干员。';
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
      ...(current.value ?? { themeId: theme.value.id, professions: [], squad: null, squadRandomized: false, draw: null, selectedId: null, confirmed: false }),
      ...patch,
    };
  }
  function addProfession(profession: string) {
    if (draw.value || professions.value.length >= START_PROFESSION_SLOTS ||
      !operators.some((operator) => operator.profession === profession)) return;
    update({ professions: [...professions.value, profession] });
  }
  function removeProfession(index: number) {
    if (draw.value || !Number.isInteger(index) || index < 0 || index >= professions.value.length) return;
    update({ professions: professions.value.filter((_, i) => i !== index) });
  }
  function clearProfessions() {
    if (!draw.value) update({ professions: [] });
  }
  function rollCandidates() {
    if (!canDraw.value) return;
    update({ draw: drawStartCandidates(operators, settings.value, professions.value, rng), selectedId: null, confirmed: false });
  }
  function selectCandidate(id: string) {
    if (confirmed.value || !draw.value?.candidates.some((operator) => operator.id === id)) return;
    update({ selectedId: id });
  }
  function confirmChoice() {
    if (chosen.value) update({ confirmed: true });
  }
  function backToCandidates() {
    if (draw.value) update({ confirmed: false });
  }
  function editProfessions() {
    update({ draw: null, selectedId: null, confirmed: false });
  }
  function rollSquad() {
    if (theme.value?.squads.length) update({ squad: pickOne(theme.value.squads, rng), squadRandomized: true });
  }
  function selectSquad(id: string) {
    const next = theme.value?.squads.find((item) => item.id === id);
    if (next) update({ squad: next, squadRandomized: false });
  }
  return { professions, squad, squadRandomized, draw, chosen, confirmed, available, blockReason, canDraw,
    addProfession, removeProfession, clearProfessions, rollCandidates, selectCandidate, confirmChoice,
    backToCandidates, editProfessions, rollSquad, selectSquad };
}

export type CandidateStartController = ReturnType<typeof useCandidateStart>;
