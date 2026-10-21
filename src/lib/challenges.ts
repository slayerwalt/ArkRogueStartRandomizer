import { pickOne, type Rng } from './roll';

export const CHALLENGE_RESTRICTION_LABELS = { forbid: '禁用', allow: '仅限', require: '要求' } as const;

export interface ChallengeTerm {
  id: string;
  text: string;
  restriction: keyof typeof CHALLENGE_RESTRICTION_LABELS;
}
export interface ChallengePool {
  id: string;
  name: string;
  sourceName?: string;
  sourceUrl: string;
  terms: ChallengeTerm[];
}

export interface ChallengePoolSource {
  name: string;
  sourceUrl: string;
  pools: ChallengePool[];
}

/** 每个池可对应一种难度；池内原始分组展平，不设置抽取权重。 */
export function readChallengePools(raw: unknown): ChallengePool[] {
  const record = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('词条池格式错误');
    return value as Record<string, unknown>;
  };
  const nonempty = (value: unknown): string => {
    if (typeof value !== 'string' || !value.trim()) throw new Error('词条池字段为空');
    return value.trim();
  };
  const root = record(raw);
  if (root.schemaVersion !== 1 || !Array.isArray(root.pools)) throw new Error('词条池版本或列表错误');
  const ids = new Set<string>();
  return root.pools.map((value): ChallengePool => {
    const pool = record(value);
    const id = nonempty(pool.id);
    if (ids.has(id)) throw new Error('词条池标识重复');
    ids.add(id);
    const source = record(pool.source);
    const sourceUrl = nonempty(source.url);
    if (!/^https?:\/\//.test(sourceUrl)) throw new Error('词条池来源地址无效');
    const name = nonempty(pool.name);
    const sourceName = source.name === undefined ? name : nonempty(source.name);
    if (!Array.isArray(pool.groups)) throw new Error('词条分组错误');
    const groupIds = new Set<string>();
    const terms = pool.groups.flatMap((value): ChallengeTerm[] => {
      const group = record(value);
      const groupId = nonempty(group.id);
      if (groupIds.has(groupId)) throw new Error('词条分组标识重复');
      groupIds.add(groupId);
      const restriction = group.restriction;
      if (restriction !== 'forbid' && restriction !== 'allow' && restriction !== 'require') throw new Error('词条限制类型错误');
      if (!Array.isArray(group.terms)) throw new Error('词条列表错误');
      return group.terms.map((text, index) => ({ id: `${id}:${groupId}:${index}`, text: nonempty(text), restriction }));
    });
    const unique = [...new Map(terms.map((term) => [`${term.restriction}:${term.text}`, term])).values()];
    return { id, name, sourceName, sourceUrl, terms: unique };
  });
}

/** 同一来源的不同难度共用来源名称与脚注，保留首次出现的顺序。 */
export function groupChallengePoolsBySource(pools: readonly ChallengePool[]): ChallengePoolSource[] {
  const sources = new Map<string, ChallengePoolSource>();
  for (const pool of pools) {
    let source = sources.get(pool.sourceUrl);
    if (!source) {
      source = { name: pool.sourceName ?? pool.name, sourceUrl: pool.sourceUrl, pools: [] };
      sources.set(pool.sourceUrl, source);
    }
    source.pools.push(pool);
  }
  return [...sources.values()];
}

/** 同一限制类型与正文视为同一词条，不因来源池不同增加抽取权重。 */
export function challengeTermKey(term: ChallengeTerm): string {
  return JSON.stringify([term.restriction, term.text]);
}

export function mergeChallengeTerms(pools: readonly ChallengePool[]): ChallengeTerm[] {
  const unique = new Map<string, ChallengeTerm>();
  for (const pool of pools) {
    for (const term of pool.terms) {
      const key = challengeTermKey(term);
      if (!unique.has(key)) unique.set(key, term);
    }
  }
  return [...unique.values()];
}

export function availableChallengeTerms(terms: readonly ChallengeTerm[], selected: readonly ChallengeTerm[]): ChallengeTerm[] {
  const used = new Set(selected.map(challengeTermKey));
  return terms.filter((term) => !used.has(challengeTermKey(term)));
}

export function drawChallenge(terms: readonly ChallengeTerm[], selected: readonly ChallengeTerm[], rng: Rng = Math.random): ChallengeTerm | null {
  const available = availableChallengeTerms(terms, selected);
  return available.length ? pickOne(available, rng) : null;
}
