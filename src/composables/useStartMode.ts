import { computed, shallowRef, type Ref } from 'vue';
import type { Theme } from '../lib/types';

export type StartMode = 'candidates' | 'quick';

/** 方式首次选择后锁定；显式重新开局时才允许更换。 */
export function useStartMode(theme: Readonly<Ref<Theme | null>>) {
  const session = shallowRef<{ themeId: string; mode: StartMode } | null>(null);
  const mode = computed(() => session.value?.themeId === theme.value?.id ? session.value?.mode ?? null : null);

  function restart(nextMode: StartMode) {
    if (!theme.value || (nextMode !== 'candidates' && nextMode !== 'quick')) return false;
    session.value = { themeId: theme.value.id, mode: nextMode };
    return true;
  }
  function choose(nextMode: StartMode) {
    return mode.value === null && restart(nextMode);
  }
  return { mode, choose, restart };
}
