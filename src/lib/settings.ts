import { COMMON_OPERATORS } from './common-operators';
import { POOL_RARITIES, type RollSettings } from './types';

export const SETTINGS_KEY = 'rogue-start-settings';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 默认随机范围：各星级取「常见」名单 */
function defaultPool(): Record<number, string[]> {
  const pool: Record<number, string[]> = {};
  for (const r of POOL_RARITIES) pool[r] = [...(COMMON_OPERATORS[r] ?? [])];
  return pool;
}

export function createDefaultSettings(): RollSettings {
  return { withOperators: true, pool: defaultPool() };
}

export const DEFAULT_SETTINGS: RollSettings = createDefaultSettings();

export function loadSettings(
  storage: StorageLike,
  validOperatorIds: ReadonlySet<string>,
): { settings: RollSettings; pruned: number } {
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return { settings: createDefaultSettings(), pruned: 0 };
  try {
    const parsed = JSON.parse(raw);
    const pool = defaultPool();
    let pruned = 0;
    for (const r of POOL_RARITIES) {
      const list = parsed?.pool?.[r];
      // 存储中缺少该星级时保留默认（常见名单）
      if (!Array.isArray(list)) continue;
      const ids = list.filter((id: unknown) => typeof id === 'string');
      const valid = ids.filter((id) => validOperatorIds.has(id));
      pruned += ids.length - valid.length;
      pool[r] = valid;
    }
    const settings: RollSettings = {
      withOperators:
        typeof parsed.withOperators === 'boolean' ? parsed.withOperators : DEFAULT_SETTINGS.withOperators,
      pool,
    };
    return { settings, pruned };
  } catch {
    return { settings: createDefaultSettings(), pruned: 0 };
  }
}

export function saveSettings(storage: StorageLike, settings: RollSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
