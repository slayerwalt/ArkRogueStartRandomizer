import type { Operator, RecruitGroup, RecruitSlot, RollResult, RollSettings, SlotResult, Squad, Theme } from './types';

export type Rng = () => number;

/** 开局基础初始希望 */
const BASE_HOPE = 6;

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: 数组为空');
  return items[Math.min(Math.floor(rng() * items.length), items.length - 1)];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 计算一名干员在当前分队下的实际希望消耗（基础消耗 + 分队减免 + 干员自身减免，下限 0） */
export function effectiveHopeCost(operator: Operator, squad: Squad): number {
  let cost = operator.hopeCost + operator.charDiscount;
  const d = squad.recruitDiscount;
  if (d && operator.rarity >= d.minRarity) {
    const match =
      (d.professions && d.professions.includes(operator.profession)) ||
      (d.subProfessions && d.subProfessions.includes(operator.subProfession));
    if (match) cost += d.delta;
  }
  return Math.max(0, cost);
}

/** 随机范围（白名单）：3 星及以下不受限制，4/5/6 星必须在范围内 */
function allowedByPool(operator: Operator, settings: RollSettings): boolean {
  if (operator.rarity <= 3) return true;
  return (settings.pool[operator.rarity] ?? []).includes(operator.id);
}

/** 候选池：职业在券位允许范围内 ∧ 星级符合 rarityCap ∧ 在随机范围内 ∧ 实际消耗不超预算 */
function buildPool(
  operators: readonly Operator[],
  slot: RecruitSlot,
  settings: RollSettings,
  squad: Squad,
  budget: number,
): Operator[] {
  return operators.filter(
    (o) =>
      slot.classes.includes(o.profession) &&
      (slot.rarityCap === null || o.rarity <= slot.rarityCap) &&
      allowedByPool(o, settings) &&
      effectiveHopeCost(o, squad) <= budget,
  );
}

function rollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  squad: Squad,
  budget: number,
  rng: Rng,
): SlotResult {
  if (!settings.withOperators) return { slot, operator: null, hopeCost: 0, empty: false };
  const pool = buildPool(operators, slot, settings, squad, budget);
  if (pool.length === 0) return { slot, operator: null, hopeCost: 0, empty: true };
  // 尽量高星：取候选池中最高星级的一档，从中随机一名
  const maxRarity = Math.max(...pool.map((o) => o.rarity));
  const topTier = pool.filter((o) => o.rarity === maxRarity);
  const operator = pickOne(topTier, rng);
  return { slot, operator, hopeCost: effectiveHopeCost(operator, squad), empty: false };
}

export function rollStart(
  theme: Theme,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng = Math.random,
): RollResult {
  const squad = pickOne(theme.squads, rng);
  const group = pickOne(theme.recruitGroups, rng);
  return rollSlotsFor(operators, settings, squad, group, rng);
}

/** 给定分队与组合，随机打乱券位顺序并按「尽量高星 + 硬约束」随机所有券位 */
export function rollSlotsFor(
  operators: readonly Operator[],
  settings: RollSettings,
  squad: Squad,
  group: RecruitGroup,
  rng: Rng = Math.random,
): RollResult {
  const initialHope = BASE_HOPE + squad.initialHopeBonus;
  const order = shuffle(group.slots.map((_, i) => i), rng);
  const results = new Array<SlotResult>(group.slots.length);
  let remaining = initialHope;
  for (const i of order) {
    const r = rollSlot(group.slots[i], operators, settings, squad, remaining, rng);
    results[i] = r;
    if (r.operator) remaining -= r.hopeCost;
  }
  return { squad, group, initialHope, slots: results };
}

export function rerollSquad(theme: Theme, rng: Rng = Math.random): Squad {
  return pickOne(theme.squads, rng);
}

export function rerollGroup(theme: Theme, rng: Rng = Math.random): RecruitGroup {
  return pickOne(theme.recruitGroups, rng);
}

export function rerollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  squad: Squad,
  budget: number,
  rng: Rng = Math.random,
): SlotResult {
  return rollSlot(slot, operators, settings, squad, budget, rng);
}
