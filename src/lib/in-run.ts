import { CLASS_CN } from './constants';
import { availableOperatorPool, operatorIdentity } from './pool';
import { pickOne, type Rng } from './roll';
import { DEFAULT_RECRUIT_COUNTS, isRecruitCounts, type RecruitCounts } from './recruit-counts';
import type { Operator, RollSettings } from './types';

export interface RecruitRecipe {
  professions: readonly string[];
  rarity: 5 | 6;
  count: number;
}

export interface InRunTicket {
  id: string;
  name: string;
  professions: readonly string[];
}

/** 招募券仅限制职业范围；六星、五星分别从合并职业池中按用户设置的总人数抽取。 */
export const IN_RUN_TICKETS: InRunTicket[] = [
  ...Object.entries(CLASS_CN).map(([profession, name]): InRunTicket => ({
    id: `single-${profession}`, name, professions: [profession],
  })),
  ...[
    { id: 'guard-vanguard', name: '近锋', professions: ['WARRIOR', 'PIONEER'] },
    { id: 'sniper-medic', name: '狙医', professions: ['SNIPER', 'MEDIC'] },
    { id: 'caster-specialist', name: '术特', professions: ['CASTER', 'SPECIAL'] },
    { id: 'defender-supporter', name: '重辅', professions: ['TANK', 'SUPPORT'] },
  ],
  { id: 'ground', name: '地面', professions: ['WARRIOR', 'PIONEER', 'SPECIAL', 'TANK'] },
  { id: 'ranged', name: '高台', professions: ['SNIPER', 'MEDIC', 'CASTER', 'SUPPORT'] },
  { id: 'any', name: '任意', professions: Object.keys(CLASS_CN) },
];

export { operatorIdentity } from './pool';

export interface InRunDraw {
  ticket: InRunTicket;
  candidates: Operator[];
  expectedCount: number;
  shortages: { professions: readonly string[]; rarity: number; requested: number; actual: number }[];
}

export function drawInRunCandidates(
  operators: readonly Operator[],
  settings: RollSettings,
  ticket: InRunTicket,
  excluded: readonly Operator[],
  counts: Readonly<RecruitCounts> = DEFAULT_RECRUIT_COUNTS,
  rng: Rng = Math.random,
): InRunDraw {
  if (!isRecruitCounts(counts)) throw new RangeError('抽取数量必须是 0 至 99 的整数，且合计至少 1 名。');
  const used = new Set(excluded.map(operatorIdentity));
  const pool = availableOperatorPool(operators, settings, excluded);
  const candidates: Operator[] = [];
  const shortages: InRunDraw['shortages'] = [];
  let expectedCount = 0;
  const recipes: RecruitRecipe[] = [
    { professions: ticket.professions, rarity: 6, count: counts.six },
    { professions: ticket.professions, rarity: 5, count: counts.five },
  ];
  for (const recipe of recipes) {
    expectedCount += recipe.count;
    let available = pool.filter((operator) => operator.rarity === recipe.rarity &&
      recipe.professions.includes(operator.profession) && !used.has(operatorIdentity(operator)));
    let actual = 0;
    while (actual < recipe.count && available.length) {
      const operator = pickOne(available, rng);
      candidates.push(operator);
      used.add(operatorIdentity(operator));
      available = available.filter((item) => !used.has(operatorIdentity(item)));
      actual++;
    }
    if (actual < recipe.count) shortages.push({ ...recipe, requested: recipe.count, actual });
  }
  return { ticket, candidates: candidates.sort((a, b) => b.rarity - a.rarity), expectedCount, shortages };
}
