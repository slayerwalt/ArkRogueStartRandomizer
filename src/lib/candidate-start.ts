import { pickOne, type Rng } from './roll';
import { availableOperatorPool } from './pool';
import type { Operator, RollSettings } from './types';

export const START_PROFESSION_SLOTS = 3;
export const CANDIDATES_PER_SLOT = 3;

export interface CandidateDraw {
  candidates: Operator[];
  expectedCount: number;
  shortages: { profession: string; requested: number; actual: number }[];
}

export function sixStarPool(operators: readonly Operator[], settings: RollSettings, excluded: readonly Operator[] = []): Operator[] {
  return availableOperatorPool(operators, settings, excluded).filter((operator) => operator.rarity === 6);
}

/** 重复职业位累加配额；每轮候选不重复，人数不足时保留实际结果。 */
export function drawStartCandidates(
  operators: readonly Operator[],
  settings: RollSettings,
  professions: readonly string[],
  rng: Rng = Math.random,
  excluded: readonly Operator[] = [],
): CandidateDraw {
  const pool = sixStarPool(operators, settings, excluded);
  const quotas = new Map<string, number>();
  for (const profession of professions) {
    quotas.set(profession, (quotas.get(profession) ?? 0) + CANDIDATES_PER_SLOT);
  }
  const candidates: Operator[] = [];
  const shortages: CandidateDraw['shortages'] = [];
  const used = new Set<string>();
  for (const [profession, requested] of quotas) {
    let available = pool.filter((operator) => operator.profession === profession && !used.has(operator.id));
    let actual = 0;
    while (actual < requested && available.length) {
      const operator = pickOne(available, rng);
      candidates.push(operator);
      used.add(operator.id);
      actual++;
      available = available.filter((item) => item.id !== operator.id);
    }
    if (actual < requested) shortages.push({ profession, requested, actual });
  }
  return { candidates, expectedCount: professions.length * CANDIDATES_PER_SLOT, shortages };
}
