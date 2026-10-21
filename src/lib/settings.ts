import { POOL_RARITIES, type Operator, type RollSettings } from './types';

export const SETTINGS_KEY = 'rogue-start-settings';
const SETTINGS_VERSION = 3;
type PoolOperator = Pick<Operator, 'id' | 'rarity'>;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 空黑名单对应当前数据全选；新加入的干员默认参与。 */
export function createDefaultSettings(operators: readonly PoolOperator[]): RollSettings {
  const pool: Record<number, string[]> = {};
  for (const r of POOL_RARITIES) pool[r] = operators.filter((operator) => operator.rarity === r).map((operator) => operator.id);
  return { pool };
}

export function loadSettings(
  storage: StorageLike,
  operators: readonly PoolOperator[],
): { settings: RollSettings; pruned: number; migrated: boolean } {
  const defaults = createDefaultSettings(operators);
  const fallback = (migrated = false) => ({ settings: defaults, pruned: 0, migrated });
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return fallback();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback();
    // 用户确认不保留旧范围：旧白名单统一重置为全选，并写回新版空黑名单。
    if (parsed.version === undefined || parsed.version === 1 || parsed.version === 2) return fallback(true);
    if (parsed.version !== SETTINGS_VERSION) return fallback();
    const pool = defaults.pool;
    let pruned = 0;
    for (const r of POOL_RARITIES) {
      const list = parsed.excluded?.[r];
      // 缺少该星级的黑名单视为没有排除项。
      if (!Array.isArray(list)) continue;
      const validIds = new Set(pool[r]);
      const excluded = new Set(list.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id)));
      pruned += list.length - excluded.size;
      pool[r] = pool[r].filter((id) => !excluded.has(id));
    }
    const settings: RollSettings = { pool };
    return { settings, pruned, migrated: false };
  } catch {
    return fallback();
  }
}

/** 仅保存当前数据中被取消勾选的干员，不固化已选名单。 */
export function saveSettings(storage: StorageLike, settings: RollSettings, operators: readonly PoolOperator[]): void {
  const excluded: Record<number, string[]> = {};
  for (const r of POOL_RARITIES) {
    const selected = new Set(settings.pool[r] ?? []);
    excluded[r] = operators.filter((operator) => operator.rarity === r && !selected.has(operator.id)).map((operator) => operator.id);
  }
  storage.setItem(SETTINGS_KEY, JSON.stringify({ version: SETTINGS_VERSION, excluded }));
}
