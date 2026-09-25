import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
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
  it('本轮去重，耗尽返回空；抽取不会修改池和历史', () => {
    const before = JSON.stringify(pools);
    const selected: ChallengeTerm[] = [];
    for (let i = 0; i < pools[0].terms.length; i++) {
      const length = selected.length;
      const term = drawChallenge(pools[0], selected, () => 0)!;
      expect(selected).toHaveLength(length);
      selected.push(term);
    }
    expect(new Set(selected.map((term) => term.id)).size).toBe(161);
    expect(drawChallenge(pools[0], selected)).toBeNull();
    expect(JSON.stringify(pools)).toBe(before);
  });
  it('校验限制类型、重复标识与来源地址，并合并同含义重复词条', () => {
    const raw = { schemaVersion: 1, pools: [{ id: 'p', name: '池', source: { url: 'https://example.com' },
      groups: [{ id: 'g', restriction: 'forbid', terms: ['医疗', '医疗'] }] }] };
    expect(readChallengePools(raw)[0].terms).toHaveLength(1);
    expect(() => readChallengePools({ ...raw, schemaVersion: 9 })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [raw.pools[0], raw.pools[0]] })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [{ ...raw.pools[0], source: { url: 'javascript:alert(1)' } }] })).toThrow();
    expect(() => readChallengePools({ ...raw, pools: [{ ...raw.pools[0], groups: [{ id: 'g', restriction: 'unknown', terms: ['医疗'] }] }] })).toThrow();
  });
});

describe('词条池会话', () => {
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
});
