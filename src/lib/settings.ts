import { LEGACY_DEFAULT_POOL } from './legacy-settings';
import { POOL_RARITIES, type Operator, type RollSettings } from './types';

export const SETTINGS_KEY = 'rogue-start-settings';
const SETTINGS_VERSION = 2;
type PoolOperator = Pick<Operator, 'id' | 'rarity'>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 默认随机范围始终从当前游戏数据生成，各星级全部参与。 */
export function createDefaultSettings(operators: readonly PoolOperator[]): RollSettings {
  const pool: Record<number, string[]> = {};
  for (const r of POOL_RARITIES) pool[r] = operators.filter((operator) => operator.rarity === r).map((operator) => operator.id);
  return { pool };
}

function matchesLegacyDefault(rarity: number, ids: readonly string[]): boolean {
  const legacy = LEGACY_DEFAULT_POOL[rarity];
  const selected = new Set(ids);
  return selected.size === legacy.length && legacy.every((id) => selected.has(id));
}

export function loadSettings(
  storage: StorageLike,
  operators: readonly PoolOperator[],
): { settings: RollSettings; pruned: number; migrated: boolean } {
  const defaults = createDefaultSettings(operators);
  const fallback = () => ({ settings: defaults, pruned: 0, migrated: false });
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return fallback();
  try {
    const parsed = JSON.parse(raw);
    const pool = defaults.pool;
    const legacy = parsed?.version === undefined || parsed?.version === 1;
    let pruned = 0;
    let migrated = false;
    for (const r of POOL_RARITIES) {
      const list = parsed?.pool?.[r];
      // 缺少该星级时使用全选；手动清空的数组仍然保留。
      if (!Array.isArray(list)) continue;
      const ids: string[] = list.filter((id: unknown) => typeof id === 'string');
      if (legacy && matchesLegacyDefault(r, ids)) {
        migrated = true;
        continue;
      }
      const validIds = new Set(defaults.pool[r]);
      const valid = [...new Set(ids.filter((id) => validIds.has(id)))];
      pruned += ids.length - valid.length;
      pool[r] = valid;
    }
    const settings: RollSettings = { pool };
    return { settings, pruned, migrated };
  } catch {
    return fallback();
  }
}

export function saveSettings(storage: StorageLike, settings: RollSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, pool: settings.pool }));
}
