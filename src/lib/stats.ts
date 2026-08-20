import type { StorageLike } from './settings';

export const STATS_KEY = 'rogue-start-stats';
/** 本地最多保留的记录条数，超出后丢弃最旧的 */
export const MAX_RECORDS = 1000;
/** 排行榜支持的星级（下拉选择，默认 6 星） */
export const LEADERBOARD_RARITIES = [6, 5, 4] as const;
/** 榜单最多展示的干员数 */
export const LEADERBOARD_LIMIT = 10;

export type Outcome = 'accepted' | 'abandoned';

export interface RecordedOperator {
  id: string;
  name: string;
  rarity: number;
}

/** 一次开局决策的记录：「接受」当前阵容，或「放弃」（整体重 roll / 重摇时被换掉的干员） */
export interface StartRecord {
  /** ISO 时间戳 */
  time: string;
  outcome: Outcome;
  squadName: string;
  groupName: string;
  operators: RecordedOperator[];
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  count: number;
}

function isRecordedOperator(o: unknown): o is RecordedOperator {
  if (typeof o !== 'object' || o === null) return false;
  const op = o as Record<string, unknown>;
  return typeof op.id === 'string' && typeof op.name === 'string' && typeof op.rarity === 'number';
}

function isStartRecord(r: unknown): r is StartRecord {
  if (typeof r !== 'object' || r === null) return false;
  const rec = r as Record<string, unknown>;
  return (
    typeof rec.time === 'string' &&
    (rec.outcome === 'accepted' || rec.outcome === 'abandoned') &&
    typeof rec.squadName === 'string' &&
    typeof rec.groupName === 'string' &&
    Array.isArray(rec.operators) &&
    rec.operators.every(isRecordedOperator)
  );
}

export function loadStats(storage: StorageLike): StartRecord[] {
  const raw = storage.getItem(STATS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStartRecord);
  } catch {
    return [];
  }
}

/** 追加一条记录并持久化；超出上限时丢弃最旧的记录。返回新的记录数组 */
export function appendRecord(
  storage: StorageLike,
  records: readonly StartRecord[],
  record: StartRecord,
): StartRecord[] {
  const next = [...records, record].slice(-MAX_RECORDS);
  storage.setItem(STATS_KEY, JSON.stringify(next));
  return next;
}

/** 按星级与结果（接受/放弃）统计干员出现次数，降序取前 limit 名 */
export function buildLeaderboard(
  records: readonly StartRecord[],
  rarity: number,
  outcome: Outcome,
  limit: number = LEADERBOARD_LIMIT,
): LeaderboardEntry[] {
  const counts = new Map<string, LeaderboardEntry>();
  for (const rec of records) {
    if (rec.outcome !== outcome) continue;
    for (const op of rec.operators) {
      if (op.rarity !== rarity) continue;
      const entry = counts.get(op.id);
      if (entry) entry.count += 1;
      else counts.set(op.id, { id: op.id, name: op.name, count: 1 });
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .slice(0, limit);
}
