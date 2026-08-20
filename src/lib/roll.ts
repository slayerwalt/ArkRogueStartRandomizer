import type { Operator, RecruitSlot, RollResult, RollSettings, SlotResult, Squad, Theme } from './types';

export type Rng = () => number;

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: 数组为空');
  return items[Math.floor(rng() * items.length)];
}

export function buildPool(
  operators: readonly Operator[],
  slot: RecruitSlot,
  settings: RollSettings,
): Operator[] {
  return operators.filter(
    (o) =>
      slot.classes.includes(o.profession) &&
      settings.rarities.includes(o.rarity) &&
      (slot.rarityCap === null || o.rarity <= slot.rarityCap) &&
      !settings.excludes.includes(o.id),
  );
}

/** 多职业券位先均匀随机职业、再从该职业池随机（模拟游戏内先抽券种）；池空返回 null */
export function rollSlotOperator(
  operators: readonly Operator[],
  slot: RecruitSlot,
  settings: RollSettings,
  rng: Rng,
): Operator | null {
  const classes = slot.classes.length > 1 ? [pickOne(slot.classes, rng)] : slot.classes;
  const pool = buildPool(operators, { ...slot, classes }, settings);
  if (pool.length === 0) return null;
  return pickOne(pool, rng);
}

function rollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng,
): SlotResult {
  if (!settings.withOperators) return { slot, operator: null, empty: false };
  const operator = rollSlotOperator(operators, slot, settings, rng);
  return { slot, operator, empty: operator === null };
}

export function rollStart(
  theme: Theme,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng = Math.random,
): RollResult {
  const squad = pickOne(theme.squads, rng);
  const group = pickOne(theme.recruitGroups, rng);
  return {
    squad,
    group,
    slots: group.slots.map((slot) => rollSlot(slot, operators, settings, rng)),
  };
}

export function rerollSquad(theme: Theme, rng: Rng = Math.random): Squad {
  return pickOne(theme.squads, rng);
}

export function rerollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng = Math.random,
): SlotResult {
  return rollSlot(slot, operators, settings, rng);
}
