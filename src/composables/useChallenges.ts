import { computed, getCurrentScope, onScopeDispose, shallowRef, watch, type Ref } from 'vue';
import { availableChallengeTerms, drawChallenge, mergeChallengeTerms, type ChallengePool, type ChallengeTerm } from '../lib/challenges';
import type { Rng } from '../lib/roll';
import type { Theme } from '../lib/types';

export function useChallenges(theme: Readonly<Ref<Theme | null>>, pools: readonly ChallengePool[], rng: Rng = Math.random) {
  const selectedPoolIds = shallowRef<string[]>(pools.length ? [pools[0].id] : []);
  const records = shallowRef<Record<string, ChallengeTerm[]>>({});
  const selectedPools = computed(() => pools.filter((item) => selectedPoolIds.value.includes(item.id)));
  const terms = computed(() => mergeChallengeTerms(selectedPools.value));
  const total = computed(() => terms.value.length);
  const key = computed(() => theme.value?.id ?? null);
  const selected = computed(() => key.value ? records.value[key.value] ?? [] : []);
  const remaining = computed(() => availableChallengeTerms(terms.value, selected.value).length);
  const canDraw = computed(() => Boolean(key.value && remaining.value));
  const lastDrawn = computed(() => selected.value.at(-1) ?? null);
  const undoRecord = shallowRef<{ key: string; terms: ChallengeTerm[]; message: string } | null>(null);
  const canUndo = computed(() => undoRecord.value?.key === key.value && undoRecord.value !== null);
  const undoMessage = computed(() => canUndo.value ? undoRecord.value!.message : '');
  let undoTimer: ReturnType<typeof setTimeout> | undefined;
  function dismissUndo() {
    if (undoTimer !== undefined) clearTimeout(undoTimer);
    undoTimer = undefined;
    undoRecord.value = null;
  }
  function rememberRemoval(message: string) {
    dismissUndo();
    if (!key.value) return;
    undoRecord.value = { key: key.value, terms: [...selected.value], message };
    undoTimer = setTimeout(dismissUndo, 6000);
  }
  watch(key, dismissUndo, { flush: 'sync' });
  if (getCurrentScope()) onScopeDispose(dismissUndo);
  function update(terms: ChallengeTerm[]) {
    if (key.value) records.value = { ...records.value, [key.value]: terms };
  }
  function togglePool(id: string) {
    if (!pools.some((item) => item.id === id)) return;
    selectedPoolIds.value = selectedPoolIds.value.includes(id)
      ? selectedPoolIds.value.filter((item) => item !== id)
      : [...selectedPoolIds.value, id];
  }
  function draw() {
    if (!canDraw.value) return null;
    const term = drawChallenge(terms.value, selected.value, rng);
    if (!term) return null;
    dismissUndo();
    update([...selected.value, term]);
    return term;
  }
  function remove(id: string) {
    if (!selected.value.some((term) => term.id === id)) return;
    rememberRemoval('已移除词条');
    update(selected.value.filter((term) => term.id !== id));
  }
  function clear() {
    if (!selected.value.length) return;
    rememberRemoval(`已清空 ${selected.value.length} 条词条`);
    update([]);
  }
  function undo() {
    if (!canUndo.value || !undoRecord.value) return;
    update(undoRecord.value.terms);
    dismissUndo();
  }
  return { selectedPoolIds, selectedPools, selected, total, remaining, canDraw, lastDrawn, canUndo, undoMessage, togglePool, draw, remove, clear, undo };
}

export type ChallengeController = ReturnType<typeof useChallenges>;
