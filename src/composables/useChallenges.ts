import { computed, ref, shallowRef, type Ref } from 'vue';
import { drawChallenge, type ChallengePool, type ChallengeTerm } from '../lib/challenges';
import type { Rng } from '../lib/roll';
import type { Theme } from '../lib/types';

export function useChallenges(theme: Readonly<Ref<Theme | null>>, pools: readonly ChallengePool[], rng: Rng = Math.random) {
  const selectedPoolId = ref(pools[0]?.id ?? '');
  const records = shallowRef<Record<string, ChallengeTerm[]>>({});
  const pool = computed(() => pools.find((item) => item.id === selectedPoolId.value) ?? null);
  const key = computed(() => theme.value && pool.value ? JSON.stringify([theme.value.id, pool.value.id]) : null);
  const selected = computed(() => key.value ? records.value[key.value] ?? [] : []);
  const remaining = computed(() => pool.value ? pool.value.terms.length - selected.value.length : 0);
  const canDraw = computed(() => Boolean(key.value && remaining.value));
  const lastDrawn = computed(() => selected.value.at(-1) ?? null);
  function update(terms: ChallengeTerm[]) {
    if (key.value) records.value = { ...records.value, [key.value]: terms };
  }
  function selectPool(id: string) {
    if (pools.some((item) => item.id === id)) selectedPoolId.value = id;
  }
  function draw() {
    if (!canDraw.value || !pool.value) return null;
    const term = drawChallenge(pool.value, selected.value, rng);
    if (term) update([...selected.value, term]);
    return term;
  }
  function remove(id: string) { update(selected.value.filter((term) => term.id !== id)); }
  function clear() { update([]); }
  return { selectedPoolId, pool, selected, remaining, canDraw, lastDrawn, selectPool, draw, remove, clear };
}

export type ChallengeController = ReturnType<typeof useChallenges>;
