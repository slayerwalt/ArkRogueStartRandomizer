import { describe, expect, it } from 'vitest';
import {
  appendRecord,
  buildLeaderboard,
  loadStats,
  MAX_RECORDS,
  STATS_KEY,
  type StartRecord,
} from '../src/lib/stats';
import type { StorageLike } from '../src/lib/settings';

function memStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
}

function rec(outcome: StartRecord['outcome'], ops: { id: string; name: string; rarity: number }[]): StartRecord {
  return { time: '2026-08-20T00:00:00.000Z', outcome, squadName: '分队', groupName: '组合', operators: ops };
}

const A6 = { id: 'a6', name: '六星A', rarity: 6 };
const B6 = { id: 'b6', name: '六星B', rarity: 6 };
const C5 = { id: 'c5', name: '五星C', rarity: 5 };
const D3 = { id: 'd3', name: '三星D', rarity: 3 };

describe('loadStats', () => {
  it('无存储时返回空数组', () => {
    expect(loadStats(memStorage())).toEqual([]);
  });
  it('JSON 损坏或非数组时返回空数组', () => {
    expect(loadStats(memStorage({ [STATS_KEY]: '{oops' }))).toEqual([]);
    expect(loadStats(memStorage({ [STATS_KEY]: '{"a":1}' }))).toEqual([]);
  });
  it('过滤掉结构非法的记录', () => {
    const raw = JSON.stringify([rec('accepted', [A6]), { outcome: 'maybe' }, null]);
    expect(loadStats(memStorage({ [STATS_KEY]: raw }))).toEqual([rec('accepted', [A6])]);
  });
});

describe('appendRecord', () => {
  it('追加并持久化，可读回', () => {
    const storage = memStorage();
    const next = appendRecord(storage, [], rec('accepted', [A6]));
    expect(next).toHaveLength(1);
    expect(loadStats(storage)).toEqual(next);
  });
  it('超出上限时丢弃最旧的记录', () => {
    const storage = memStorage();
    const full = Array.from({ length: MAX_RECORDS }, (_, i) =>
      rec('accepted', [{ id: `op${i}`, name: `干员${i}`, rarity: 6 }]),
    );
    const next = appendRecord(storage, full, rec('accepted', [A6]));
    expect(next).toHaveLength(MAX_RECORDS);
    expect(next[0].operators[0].id).toBe('op1'); // 最旧的 op0 被丢弃
    expect(next[next.length - 1].operators[0].id).toBe('a6');
  });
});

describe('buildLeaderboard', () => {
  const records: StartRecord[] = [
    rec('accepted', [A6, C5, D3]),
    rec('accepted', [A6, B6]),
    rec('abandoned', [B6, C5]),
    rec('abandoned', [B6]),
  ];

  it('按星级与结果分别统计次数', () => {
    expect(buildLeaderboard(records, 6, 'accepted')).toEqual([
      { id: 'a6', name: '六星A', count: 2 },
      { id: 'b6', name: '六星B', count: 1 },
    ]);
    expect(buildLeaderboard(records, 6, 'abandoned')).toEqual([
      { id: 'b6', name: '六星B', count: 2 },
    ]);
    expect(buildLeaderboard(records, 5, 'accepted')).toEqual([
      { id: 'c5', name: '五星C', count: 1 },
    ]);
  });

  it('无匹配星级/结果时返回空数组', () => {
    expect(buildLeaderboard(records, 4, 'accepted')).toEqual([]);
    expect(buildLeaderboard([], 6, 'accepted')).toEqual([]);
  });

  it('次数相同按名称排序，并受 limit 限制', () => {
    const many: StartRecord[] = Array.from({ length: 12 }, (_, i) =>
      rec('accepted', [{ id: `x${i}`, name: `干员${String(i).padStart(2, '0')}`, rarity: 6 }]),
    );
    const board = buildLeaderboard(many, 6, 'accepted', 10);
    expect(board).toHaveLength(10);
    expect(board.every((e) => e.count === 1)).toBe(true);
    expect(board[0].name <= board[1].name).toBe(true);
  });
});
