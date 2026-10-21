import { POOL_RARITIES, type Operator, type RollSettings } from './types';

/** 升变共用干员身份，其他异格按各自 ID 处理。 */
export function operatorIdentity(operator: Pick<Operator, 'id' | 'name'>): string {
  return /^阿米娅(?:[（(].*[）)])?$/.test(operator.name) ? 'amiya' : operator.id;
}

/** 所有抽取共用：先应用星级参与范围，再排除已选身份。 */
export function availableOperatorPool(
  operators: readonly Operator[],
  settings: RollSettings,
  excluded: readonly Operator[] = [],
): Operator[] {
  const excludedKeys = new Set(excluded.map(operatorIdentity));
  return operators.filter((operator) =>
    (operator.rarity <= 3 || (settings.pool[operator.rarity] ?? []).includes(operator.id)) &&
    !excludedKeys.has(operatorIdentity(operator)));
}

/** 范围预设：全选 / 全不选；部分选择时为「自定义」。 */
export type PoolPreset = 'all' | 'none' | 'custom';

/** 判断某星级当前的选择对应哪个预设 */
export function detectPreset(
  selected: readonly string[],
  allIds: readonly string[],
): PoolPreset {
  if (selected.length === 0) return 'none';
  const sel = new Set(selected);
  if (sel.size === allIds.length && allIds.every((id) => sel.has(id))) return 'all';
  return 'custom';
}

/** 应用预设，返回该星级新的选择列表（custom 不对应任何操作，不应传入） */
export function applyPreset(
  preset: Exclude<PoolPreset, 'custom'>,
  allIds: readonly string[],
): string[] {
  if (preset === 'all') return [...allIds];
  return [];
}

/** 返回随机范围为空的星级列表；这些星级需要先设置范围才能随机 */
export function emptyPoolRarities(settings: RollSettings): number[] {
  return POOL_RARITIES.filter((r) => (settings.pool[r] ?? []).length === 0);
}

/** 数据中某星级的全部干员 id */
export function idsOfRarity(operators: readonly Operator[], rarity: number): string[] {
  return operators.filter((o) => o.rarity === rarity).map((o) => o.id);
}

/** 数量按有效参与名单统计；头像预览按数据顺序选取，首个姓名与首张头像共用数据。 */
export function summarizeOperatorPools(operators: readonly Operator[], settings: RollSettings) {
  return POOL_RARITIES.map((rarity) => {
    const selectedIds = new Set(settings.pool[rarity] ?? []);
    const selected = operators.filter((operator) => operator.rarity === rarity && selectedIds.has(operator.id));
    return { rarity, count: selected.length, preview: selected.slice(0, 6) };
  });
}
