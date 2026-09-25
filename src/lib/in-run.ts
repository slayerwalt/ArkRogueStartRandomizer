import { CLASS_CN } from './constants';
import { pickOne, type Rng } from './roll';
import type { Operator, RollSettings } from './types';

export interface RecruitRecipe {
  professions: readonly string[];
  rarity: 5 | 6;
  count: number;
}

export interface InRunTicket {
  id: string;
  name: string;
  category: '单职业券' | '双职业券' | '定向券' | '任意券';
  recipes: RecruitRecipe[];
}

function professionRecipes(professions: readonly string[], six = 2, five = 3): RecruitRecipe[] {
  return [{ professions, rarity: 6, count: six }, { professions, rarity: 5, count: five }];
}

/** 沿用参考抽取器 1.2 的普通档配额；定向券合并职业池，任意券只提供六星。 */
export const IN_RUN_TICKETS: InRunTicket[] = [
  ...Object.entries(CLASS_CN).map(([profession, name]): InRunTicket => ({
    id: `single-${profession}`, name, category: '单职业券', recipes: professionRecipes([profession]),
  })),
  ...[
    { id: 'guard-vanguard', name: '近锋', professions: ['WARRIOR', 'PIONEER'] },
    { id: 'sniper-medic', name: '狙医', professions: ['SNIPER', 'MEDIC'] },
    { id: 'caster-specialist', name: '术特', professions: ['CASTER', 'SPECIAL'] },
    { id: 'defender-supporter', name: '重辅', professions: ['TANK', 'SUPPORT'] },
  ].map(({ id, name, professions }): InRunTicket => ({
    id, name, category: '双职业券', recipes: professions.flatMap((profession) => professionRecipes([profession])),
  })),
  { id: 'ground', name: '地面', category: '定向券', recipes: professionRecipes(['WARRIOR', 'PIONEER', 'SPECIAL', 'TANK'], 6, 8) },
  { id: 'ranged', name: '高台', category: '定向券', recipes: professionRecipes(['SNIPER', 'MEDIC', 'CASTER', 'SUPPORT'], 6, 8) },
  { id: 'any', name: '任意招募', category: '任意券', recipes: [{ professions: Object.keys(CLASS_CN), rarity: 6, count: 16 }] },
];

/** 升变共用干员身份；其他异格继续按各自 ID 处理。当前数据中的阿米娅已合并为医疗形态。 */
export function operatorIdentity(operator: Pick<Operator, 'id' | 'name'>): string {
  return /^阿米娅(?:[（(].*[）)])?$/.test(operator.name) ? 'amiya' : operator.id;
}

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
  rng: Rng = Math.random,
): InRunDraw {
  const used = new Set(excluded.map(operatorIdentity));
  const allowed = new Set([...(settings.pool[6] ?? []), ...(settings.pool[5] ?? [])]);
  const pool = operators.filter((operator) => allowed.has(operator.id) && !used.has(operatorIdentity(operator)));
  const candidates: Operator[] = [];
  const shortages: InRunDraw['shortages'] = [];
  let expectedCount = 0;
  for (const recipe of ticket.recipes) {
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
