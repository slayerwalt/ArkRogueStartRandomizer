export interface RecruitCounts {
  six: number;
  five: number;
}

export const DEFAULT_RECRUIT_COUNTS: Readonly<RecruitCounts> = Object.freeze({ six: 5, five: 0 });
export const MAX_RECRUIT_COUNT = 99;
export const RECRUIT_COUNTS_KEY = 'rolllike-recruit-counts';

export function isRecruitCounts(value: unknown): value is RecruitCounts {
  if (!value || typeof value !== 'object') return false;
  const { six, five } = value as Partial<RecruitCounts>;
  return [six, five].every((count) => typeof count === 'number' && Number.isInteger(count) &&
    count >= 0 && count <= MAX_RECRUIT_COUNT) && (six! + five!) > 0;
}

export function readRecruitCounts(raw: string | null): RecruitCounts {
  try {
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.version === 1 && isRecruitCounts(saved.counts)) {
      return { six: saved.counts.six, five: saved.counts.five };
    }
  } catch {
    // 失效的浏览器数据不影响使用默认数量。
  }
  return { ...DEFAULT_RECRUIT_COUNTS };
}
