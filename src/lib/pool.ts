import { POOL_RARITIES, type Operator, type RollSettings } from './types';

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
