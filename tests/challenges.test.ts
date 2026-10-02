import { effectScope, ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import rawPools from '../src/data/challenge-pools.json';
import { drawChallenge, readChallengePools, type ChallengePool, type ChallengeTerm } from '../src/lib/challenges';
import { useChallenges } from '../src/composables/useChallenges';
import type { Theme } from '../src/lib/types';

const pools = readChallengePools(rawPools);
const theme = (): Theme => ({ id: 'rogue_6', name: '黑流树海', squads: [], recruitGroups: [] });

describe('全随机挑战词条', () => {
  it('加载现有161条和来源，保留禁用与仅限语义，不按原分组加权', () => {
    const pool = pools[0];
    expect(pool.terms).toHaveLength(161);
    expect(pool.sourceUrl).toBe('https://www.bilibili.com/toy/MRFZ/index.html');
    expect(pool.terms.find((term) => term.text === '医疗')?.restriction).toBe('forbid');
    expect(pool.terms.find((term) => term.text === '光着脚')?.restriction).toBe('allow');
    const selected = pool.terms.map((_, index) => drawChallenge(pool, [], () => (index + 0.5) / pool.terms.length)!.id);
    expect(new Set(selected).size).toBe(161);
  });
  it.each(pools)('$name 本轮去重，耗尽返回空；抽取不会修改池和历史', (pool) => {
    const before = JSON.stringify(pool);
    const selected: ChallengeTerm[] = [];
    for (let i = 0; i < pool.terms.length; i++) {
      const length = selected.length;
      const term = drawChallenge(pool, selected, () => 0)!;
      expect(selected).toHaveLength(length);
      selected.push(term);
    }
    expect(new Set(selected.map((term) => term.id)).size).toBe(pool.terms.length);
    expect(drawChallenge(pool, selected)).toBeNull();
    expect(JSON.stringify(pool)).toBe(before);
  });
  it('校验限制类型、重复标识与来源地址，并合并同含义重复词条', () => {
    const raw = { schemaVersion: 1, pools: [{ id: 'p', name: '池', source: { url: 'https://example.com' },
      groups: [{ id: 'g', restriction: 'forbid', terms: ['医疗', '医疗'] }] }] };
    expect(readChallengePools(raw)[0].terms).toHaveLength(1);
    const required = { ...raw, pools: [{ ...raw.pools[0], groups: [...raw.pools[0].groups,
      { id: 'requirements', restriction: 'require', terms: ['医疗', '医疗'] }] }] };
    expect(readChallengePools(required)[0].terms.map((term) => term.restriction)).toEqual(['forbid', 'require']);
    expect(() => readChallengePools({ ...raw, schemaVersion: 9 })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [raw.pools[0], raw.pools[0]] })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [{ ...raw.pools[0], source: { url: 'javascript:alert(1)' } }] })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [{ ...raw.pools[0], groups: [{ id: 'g', restriction: 'unknown', terms: ['医疗'] }] }] })).toThrow();
  });
});

describe('词条池会话', () => {
  afterEach(() => vi.useRealTimers());
  it('每次追加一条，移除恢复资格，清空后重新开始', () => {
    const app = useChallenges(ref(theme()), pools, () => 0);
    const first = app.draw()!;
    expect(app.selected.value).toEqual([first]);
    app.draw();
    expect(app.selected.value).toHaveLength(2);
    app.remove(first.id);
    expect(app.draw()).toEqual(first);
    app.clear();
    expect(app.selected.value).toEqual([]);
    expect(app.remaining.value).toBe(161);
  });
  it('不同词条池与主题分开保留记录，切换不清空也不串池', () => {
    const second: ChallengePool = { id: 'second', name: '另一词条池', sourceUrl: 'https://example.com',
      terms: [{ id: 'second:1', text: '医疗', restriction: 'allow' }] };
    const currentTheme = ref<Theme | null>(theme());
    const app = useChallenges(currentTheme, [...pools, second], () => 0);
    const first = app.draw();
    app.selectPool(second.id);
    expect(app.selected.value).toEqual([]);
    app.draw();
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    currentTheme.value = { ...theme(), id: 'another-theme' };
    expect(app.selected.value).toEqual([]);
    app.draw();
    currentTheme.value = null;
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    currentTheme.value = theme();
    expect(app.selected.value).toEqual(second.terms);
    app.selectPool(pools[0].id);
    expect(app.selected.value).toEqual([first]);
    app.selectPool('invalid');
    expect(app.pool.value?.id).toBe(pools[0].id);
  });
  it('空池和无可用池时禁用抽取', () => {
    const app = useChallenges(ref(theme()), []);
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    const empty = useChallenges(ref(theme()), [{ ...pools[0], terms: [] }]);
    expect(empty.canDraw.value).toBe(false);
    expect(empty.draw()).toBeNull();
  });
  it('撤销移除恢复原顺序与去重资格，撤销清空恢复整个列表', () => {
    const app = useChallenges(ref(theme()), pools, () => 0);
    const first = app.draw()!;
    const second = app.draw()!;
    app.remove(first.id);
    expect(app.selected.value).toEqual([second]);
    expect(app.canUndo.value).toBe(true);
    app.undo();
    expect(app.selected.value).toEqual([first, second]);
    expect(app.canUndo.value).toBe(false);
    const third = app.draw()!;
    expect([first.id, second.id]).not.toContain(third.id);
    app.clear();
    expect(app.selected.value).toEqual([]);
    expect(app.undoMessage.value).toBe('已清空 3 条词条');
    app.undo();
    expect(app.selected.value).toEqual([first, second, third]);
    expect(app.remaining.value).toBe(pools[0].terms.length - 3);
    expect(app.draw()!.id).not.toBe(first.id);
    expect(new Set(app.selected.value.map((term) => term.id)).size).toBe(4);
  });
  it('只撤销最近一次移除，满六秒后过期，销毁作用域时清理计时器', () => {
    vi.useFakeTimers();
    const scope = effectScope();
    const app = scope.run(() => useChallenges(ref(theme()), pools, () => 0))!;
    const first = app.draw()!;
    const second = app.draw()!;
    app.remove(first.id);
    vi.advanceTimersByTime(5000);
    app.remove(second.id);
    vi.advanceTimersByTime(1000);
    expect(app.canUndo.value).toBe(true);
    app.undo();
    expect(app.selected.value).toEqual([second]);
    app.undo();
    expect(app.selected.value).toEqual([second]);
    app.clear();
    vi.advanceTimersByTime(5999);
    expect(app.canUndo.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([]);
    app.draw();
    app.clear();
    expect(vi.getTimerCount()).toBe(1);
    scope.stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(app.canUndo.value).toBe(false);
  });
  it('后续抽取、切池与切主题都会立即使旧撤销失效', () => {
    const secondPool: ChallengePool = { ...pools[0], id: 'second' };
    const currentTheme = ref<Theme | null>(theme());
    const app = useChallenges(currentTheme, [...pools, secondPool], () => 0);
    const first = app.draw()!;
    app.clear();
    expect(app.canUndo.value).toBe(true);
    expect(app.draw()).toEqual(first);
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([first]);
    app.clear();
    app.selectPool(secondPool.id);
    expect(app.canUndo.value).toBe(false);
    app.selectPool(pools[0].id);
    app.undo();
    expect(app.selected.value).toEqual([]);
    app.draw();
    app.clear();
    currentTheme.value = { ...theme(), id: 'another-theme' };
    currentTheme.value = theme();
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([]);
  });
});
