import { effectScope, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import rawPools from '../src/data/challenge-pools.json';
import { drawChallenge, groupChallengePoolsBySource, mergeChallengeTerms, readChallengePools, type ChallengePool, type ChallengeTerm } from '../src/lib/challenges';
import { useChallenges } from '../src/composables/useChallenges';
import type { Theme } from '../src/lib/types';

const pools = readChallengePools(rawPools);
const theme = (): Theme => ({ id: 'rogue_6', name: '黑流树海', squads: [], recruitGroups: [] });
const mixedPools: ChallengePool[] = [
  {
    id: 'first', name: '第一个池', sourceUrl: 'https://example.com/first',
    terms: [
      { id: 'first:medical', text: '医疗', restriction: 'forbid' },
      { id: 'first:level', text: 'N15', restriction: 'require' },
    ],
  },
  {
    id: 'second', name: '第二个池', sourceUrl: 'https://example.com/second',
    terms: [
      { id: 'second:medical', text: '医疗', restriction: 'forbid' },
      { id: 'second:medical-only', text: '医疗', restriction: 'allow' },
      { id: 'second:pioneer', text: '先锋', restriction: 'forbid' },
    ],
  },
];

describe('全随机挑战词条', () => {
  it('按最新原站拆分朝阳三个难度池，保留禁用与仅限的区别', () => {
    const standard = pools.find((pool) => pool.id === 'chaoyang-standard')!;
    const hard = pools.find((pool) => pool.id === 'chaoyang-hard')!;
    const insane = pools.find((pool) => pool.id === 'chaoyang-insane')!;
    expect([standard.name, hard.name, insane.name]).toEqual(['朝阳随机挑战-普通', '朝阳随机挑战-困难', '朝阳随机挑战-变态']);
    expect([standard.terms.length, hard.terms.length, insane.terms.length]).toEqual([93, 55, 17]);
    expect(pools.find((pool) => pool.id === 'blackforest-personal-2026-10-02')?.terms).toHaveLength(5);
    expect(mergeChallengeTerms(pools)).toHaveLength(170);
    for (const pool of [standard, hard, insane]) {
      expect(pool.sourceName).toBe('朝阳随机挑战');
      expect(pool.sourceUrl).toBe('https://www.bilibili.com/toy/MRFZ/index.html');
    }
    expect(standard.terms.every((term) => term.restriction === 'forbid')).toBe(true);
    expect(hard.terms.every((term) => term.restriction === 'allow')).toBe(true);
    expect(insane.terms.every((term) => term.restriction === 'allow')).toBe(true);
    expect(standard.terms.find((term) => term.text === '医疗')?.restriction).toBe('forbid');
    expect(insane.terms.find((term) => term.text === '光着脚')?.restriction).toBe('allow');
    for (const text of ['吃过', '开服']) {
      expect(standard.terms.find((term) => term.text === text)?.restriction).toBe('forbid');
      expect(hard.terms.find((term) => term.text === text)?.restriction).toBe('allow');
      expect(insane.terms.some((term) => term.text === text)).toBe(false);
    }
    expect(standard.terms.some((term) => term.text === '蓝色居多')).toBe(false);
    expect(hard.terms.find((term) => term.text === '蓝色居多')?.restriction).toBe('allow');
  });
  it('每个难度池中的独立词条占相同的随机区间', () => {
    for (const pool of pools) {
      const selected = pool.terms.map((_, index) => drawChallenge(pool.terms, [], () => (index + 0.5) / pool.terms.length)!.id);
      expect(new Set(selected).size).toBe(pool.terms.length);
    }
  });
  it.each(pools)('$name 本轮去重，耗尽返回空；抽取不会修改池和历史', (pool) => {
    const before = JSON.stringify(pool);
    const selected: ChallengeTerm[] = [];
    for (let i = 0; i < pool.terms.length; i++) {
      const length = selected.length;
      const term = drawChallenge(pool.terms, selected, () => 0)!;
      expect(selected).toHaveLength(length);
      selected.push(term);
    }
    expect(new Set(selected.map((term) => term.id)).size).toBe(pool.terms.length);
    expect(drawChallenge(pool.terms, selected)).toBeNull();
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
  it('读取独立来源名称，并兼容未提供来源名称的旧词条池', () => {
    const raw = { schemaVersion: 1, pools: [{ id: 'normal', name: '普通', source: { url: 'https://example.com' },
      groups: [{ id: 'g', restriction: 'forbid', terms: ['医疗'] }] }] };
    expect(readChallengePools(raw)[0].sourceName).toBe('普通');
    const named = { ...raw, pools: [{ ...raw.pools[0], source: { ...raw.pools[0].source, name: '挑战来源' } }] };
    expect(readChallengePools(named)[0]).toMatchObject({ name: '普通', sourceName: '挑战来源' });
  });
});

describe('按来源展示词条池', () => {
  it('同源难度只产生一个来源入口，交错输入仍保留来源与池的顺序', () => {
    const normal = { ...mixedPools[0], name: '普通', sourceName: '同一来源' };
    const hard = { ...mixedPools[0], id: 'hard', name: '困难', sourceName: '同一来源' };
    const input = [normal, mixedPools[1], hard];
    const before = JSON.stringify(input);
    expect(groupChallengePoolsBySource(input)).toEqual([
      { name: '同一来源', sourceUrl: normal.sourceUrl, pools: [normal, hard] },
      { name: mixedPools[1].name, sourceUrl: mixedPools[1].sourceUrl, pools: [mixedPools[1]] },
    ]);
    expect(JSON.stringify(input)).toBe(before);
    expect(groupChallengePoolsBySource([])).toEqual([]);
  });
  it('真实难度池仍只展示朝阳和仙术杯两个来源', () => {
    const sources = groupChallengePoolsBySource(pools);
    expect(sources.map(({ name, sourceUrl, pools: sourcePools }) => ({ name, sourceUrl, poolIds: sourcePools.map((pool) => pool.id) }))).toEqual([
      {
        name: '朝阳随机挑战', sourceUrl: 'https://www.bilibili.com/toy/MRFZ/index.html',
        poolIds: ['chaoyang-standard', 'chaoyang-hard', 'chaoyang-insane'],
      },
      {
        name: '仙术杯#9', sourceUrl: 'https://live.bilibili.com/blackboard/era/5sWSFsRb4xZZ2hHC.html',
        poolIds: ['blackforest-personal-2026-10-02'],
      },
    ]);
  });
});

describe('合并多个词条池', () => {
  it('跨难度保留同文不同限制，已抽禁用词条不会排除其仅限版本', () => {
    const chaoyang = pools.filter((pool) => pool.sourceName === '朝阳随机挑战');
    const terms = mergeChallengeTerms([...chaoyang, ...chaoyang]);
    const singleMerge = mergeChallengeTerms(chaoyang);
    expect(terms).toEqual(singleMerge);
    for (const text of ['吃过', '开服']) {
      const matching = terms.filter((term) => term.text === text);
      expect(matching.map((term) => term.restriction)).toEqual(['forbid', 'allow']);
      expect(drawChallenge(matching, [matching[0]], () => 0)).toEqual(matching[1]);
      expect(drawChallenge(matching, matching, () => 0)).toBeNull();
    }
  });
  it('按限制类型和文本合并重复项，同文不同限制仍分别保留，且不修改原池', () => {
    const before = JSON.stringify(mixedPools);
    const terms = mergeChallengeTerms(mixedPools);
    expect(terms.map(({ restriction, text }) => [restriction, text])).toEqual([
      ['forbid', '医疗'], ['require', 'N15'], ['allow', '医疗'], ['forbid', '先锋'],
    ]);
    expect(mergeChallengeTerms([])).toEqual([]);
    expect(JSON.stringify(mixedPools)).toBe(before);
  });
  it('合并池的随机数两端可命中两个池，各独立词条占相同的随机区间', () => {
    const terms = mergeChallengeTerms(mixedPools);
    expect(drawChallenge(terms, [], () => 0)).toMatchObject({ text: '医疗', restriction: 'forbid' });
    expect(drawChallenge(terms, [], () => 1 - Number.EPSILON)).toMatchObject({ text: '先锋', restriction: 'forbid' });
    const drawn = [0.125, 0.375, 0.625, 0.875].map((value) => {
      const term = drawChallenge(terms, [], () => value)!;
      return [term.restriction, term.text];
    });
    expect(drawn).toEqual([
      ['forbid', '医疗'], ['require', 'N15'], ['allow', '医疗'], ['forbid', '先锋'],
    ]);
  });
  it('已抽词条即使来自另一个池且id不同也不能重复抽，同文不同限制仍可抽', () => {
    const used = [mixedPools[0].terms[0]];
    const terms = mixedPools[1].terms;
    expect(drawChallenge(terms, used, () => 0)).toEqual(mixedPools[1].terms[1]);
    expect(drawChallenge([terms[0]], used)).toBeNull();
    expect(drawChallenge([], used)).toBeNull();
    expect(used).toEqual([mixedPools[0].terms[0]]);
  });
});

describe('词条池会话', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('默认选第一个池，支持多选与取消，忽略无效池标识', () => {
    const app = useChallenges(ref(theme()), mixedPools, () => 0);
    expect(app.selectedPoolIds.value).toEqual(['first']);
    expect(app.selectedPools.value).toEqual([mixedPools[0]]);
    expect(app.total.value).toBe(2);
    app.togglePool('second');
    expect(app.selectedPoolIds.value).toEqual(['first', 'second']);
    expect(app.selectedPools.value).toEqual(mixedPools);
    expect(app.total.value).toBe(4);
    app.togglePool('invalid');
    expect(app.selectedPoolIds.value).toEqual(['first', 'second']);
    app.togglePool('first');
    expect(app.selectedPoolIds.value).toEqual(['second']);
    expect(app.selectedPools.value).toEqual([mixedPools[1]]);
    expect(app.total.value).toBe(3);
  });
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
    expect(app.remaining.value).toBe(pools[0].terms.length);
  });
  it('切换选池保留全部已抽列表并继续去重，耗尽按当前合并池计算', () => {
    const app = useChallenges(ref(theme()), mixedPools, () => 0);
    const first = app.draw()!;
    app.togglePool('second');
    app.togglePool('first');
    expect(app.selected.value).toEqual([first]);
    expect(app.lastDrawn.value).toEqual(first);
    expect(app.total.value).toBe(3);
    expect(app.remaining.value).toBe(2);
    const second = app.draw()!;
    expect(second).toEqual(mixedPools[1].terms[1]);
    app.togglePool('first');
    expect(app.selected.value).toEqual([first, second]);
    expect(app.total.value).toBe(4);
    expect(app.remaining.value).toBe(2);
    const third = app.draw()!;
    const fourth = app.draw()!;
    expect(third).toEqual(mixedPools[0].terms[1]);
    expect(fourth).toEqual(mixedPools[1].terms[2]);
    expect(app.remaining.value).toBe(0);
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    app.togglePool('second');
    expect(app.total.value).toBe(2);
    expect(app.remaining.value).toBe(0);
    expect(app.selected.value).toEqual([first, second, third, fourth]);
    app.togglePool('second');
    expect(app.draw()).toBeNull();
    expect(app.selected.value).toHaveLength(4);
  });
  it('主题之间独立保留混池记录，未开放主题不能抽取', () => {
    const currentTheme = ref<Theme | null>(theme());
    const app = useChallenges(currentTheme, mixedPools, () => 0);
    const first = app.draw()!;
    app.togglePool('second');
    const second = app.draw()!;
    currentTheme.value = { ...theme(), id: 'another-theme' };
    expect(app.selected.value).toEqual([]);
    expect(app.lastDrawn.value).toBeNull();
    expect(app.remaining.value).toBe(4);
    const otherThemeTerm = app.draw()!;
    currentTheme.value = null;
    expect(app.selected.value).toEqual([]);
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    currentTheme.value = theme();
    expect(app.selected.value).toEqual([first, second]);
    expect(app.lastDrawn.value).toEqual(second);
    expect(app.remaining.value).toBe(2);
    currentTheme.value = { ...theme(), id: 'another-theme' };
    expect(app.selected.value).toEqual([otherThemeTerm]);
  });
  it('全部取消选池时禁抽但不隐藏历史，重新选池后仍排除已抽项', () => {
    const rng = vi.fn(() => 0);
    const app = useChallenges(ref(theme()), mixedPools, rng);
    const first = app.draw()!;
    app.togglePool('first');
    expect(app.selectedPoolIds.value).toEqual([]);
    expect(app.selectedPools.value).toEqual([]);
    expect(app.total.value).toBe(0);
    expect(app.remaining.value).toBe(0);
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    expect(rng).toHaveBeenCalledTimes(1);
    expect(app.selected.value).toEqual([first]);
    expect(app.lastDrawn.value).toEqual(first);
    app.togglePool('first');
    expect(app.remaining.value).toBe(1);
    expect(app.draw()).toEqual(mixedPools[0].terms[1]);
  });
  it('空池和无可用池时禁用抽取，数量为零', () => {
    const app = useChallenges(ref(theme()), []);
    expect(app.selectedPoolIds.value).toEqual([]);
    expect(app.selectedPools.value).toEqual([]);
    expect(app.total.value).toBe(0);
    expect(app.remaining.value).toBe(0);
    expect(app.canDraw.value).toBe(false);
    expect(app.draw()).toBeNull();
    const empty = useChallenges(ref(theme()), [{ ...pools[0], terms: [] }]);
    expect(empty.total.value).toBe(0);
    expect(empty.remaining.value).toBe(0);
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
  it('切换选池后仍能撤销移除和清空，恢复跨池列表的原顺序与去重资格', () => {
    const app = useChallenges(ref(theme()), mixedPools, () => 0);
    const first = app.draw()!;
    app.togglePool('first');
    app.togglePool('second');
    const second = app.draw()!;
    app.remove(first.id);
    expect(app.selected.value).toEqual([second]);
    app.togglePool('second');
    expect(app.canUndo.value).toBe(true);
    app.undo();
    expect(app.selected.value).toEqual([first, second]);
    expect(app.remaining.value).toBe(0);
    app.togglePool('first');
    expect(app.remaining.value).toBe(1);
    app.clear();
    expect(app.selected.value).toEqual([]);
    expect(app.undoMessage.value).toBe('已清空 2 条词条');
    app.togglePool('first');
    app.togglePool('second');
    expect(app.canUndo.value).toBe(true);
    app.undo();
    expect(app.selected.value).toEqual([first, second]);
    expect(app.remaining.value).toBe(1);
    expect(app.draw()).toEqual(mixedPools[1].terms[2]);
    expect(app.remaining.value).toBe(0);
  });
  it('未选池导致抽取失败时保留撤销，选池变化不会延长六秒撤销窗口', () => {
    const app = useChallenges(ref(theme()), mixedPools, () => 0);
    const first = app.draw()!;
    app.clear();
    app.togglePool('first');
    expect(app.draw()).toBeNull();
    expect(app.canUndo.value).toBe(true);
    app.undo();
    expect(app.selected.value).toEqual([first]);
    app.clear();
    vi.advanceTimersByTime(5000);
    app.togglePool('second');
    app.togglePool('invalid');
    vi.advanceTimersByTime(999);
    expect(app.canUndo.value).toBe(true);
    vi.advanceTimersByTime(1);
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([]);
  });
  it('只撤销最近一次移除，满六秒后过期，销毁作用域时清理计时器', () => {
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
  it('后续成功抽取或切主题会使旧撤销失效，返回原主题也不能恢复旧撤销', () => {
    const currentTheme = ref<Theme | null>(theme());
    const app = useChallenges(currentTheme, mixedPools, () => 0);
    const first = app.draw()!;
    app.clear();
    expect(app.canUndo.value).toBe(true);
    expect(app.draw()).toEqual(first);
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([first]);
    app.clear();
    currentTheme.value = { ...theme(), id: 'another-theme' };
    currentTheme.value = theme();
    expect(app.canUndo.value).toBe(false);
    app.undo();
    expect(app.selected.value).toEqual([]);
  });
});
