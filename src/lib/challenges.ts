import { pickOne, type Rng } from './roll';

export interface ChallengeTerm {
  id: string;
  text: string;
  restriction: 'forbid' | 'allow';
}
export interface ChallengePool {
  id: string;
  name: string;
  sourceUrl: string;
  terms: ChallengeTerm[];
}

/** 原始分组仅用于定位词条；全部词条展平，不按分组设置难度或权重。 */
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
    const sourceUrl = nonempty(record(pool.source).url);
    if (!/^https?:\/\//.test(sourceUrl)) throw new Error('词条池来源地址无效');
    if (!Array.isArray(pool.groups)) throw new Error('词条分组错误');
    const groupIds = new Set<string>();
    const terms = pool.groups.flatMap((value): ChallengeTerm[] => {
      const group = record(value);
      const groupId = nonempty(group.id);
      if (groupIds.has(groupId)) throw new Error('词条分组标识重复');
      groupIds.add(groupId);
      const restriction = group.restriction;
      if (restriction !== 'forbid' && restriction !== 'allow') throw new Error('词条限制类型错误');
      if (!Array.isArray(group.terms)) throw new Error('词条列表错误');
      return group.terms.map((text, index) => ({ id: `${id}:${groupId}:${index}`, text: nonempty(text), restriction }));
    });
    const unique = [...new Map(terms.map((term) => [`${term.restriction}:${term.text}`, term])).values()];
    return { id, name: nonempty(pool.name), sourceUrl, terms: unique };
  });
}

export function drawChallenge(pool: ChallengePool, selected: readonly ChallengeTerm[], rng: Rng = Math.random): ChallengeTerm | null {
  const used = new Set(selected.map((term) => term.id));
  const available = pool.terms.filter((term) => !used.has(term.id));
  return available.length ? pickOne(available, rng) : null;
}
