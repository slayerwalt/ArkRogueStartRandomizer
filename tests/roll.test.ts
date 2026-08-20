import { describe, expect, it } from 'vitest';
import { buildPool, pickOne, rerollSlot, rerollSquad, rollSlotOperator, rollStart, type Rng } from '../src/lib/roll';
import type { Operator, RecruitSlot, RollSettings, Theme } from '../src/lib/types';

const theme: Theme = {
  id: 'rogue_6',
  name: '沉沦者的黑流树海',
  squads: [
    { id: 'b1', name: '指挥分队', desc: '', unlockCond: null },
    { id: 'b2', name: '后勤分队', desc: '', unlockCond: null },
  ],
  recruitGroups: [
    {
      id: 'g1',
      name: '先手必胜',
      desc: '',
      slots: [
        { classes: ['PIONEER'], rarityCap: null },
        { classes: ['SNIPER'], rarityCap: null },
      ],
    },
    { id: 'g2', name: '随心所欲', desc: '', slots: [{ classes: ['PIONEER', 'WARRIOR'], rarityCap: 5 }] },
  ],
};

const operators: Operator[] = [
  { id: 'c1', name: '三星先锋', profession: 'PIONEER', rarity: 3 },
  { id: 'c2', name: '六星先锋', profession: 'PIONEER', rarity: 6 },
  { id: 'c3', name: '五星狙击', profession: 'SNIPER', rarity: 5 },
  { id: 'c4', name: '六星近卫', profession: 'WARRIOR', rarity: 6 },
  { id: 'c5', name: '五星近卫', profession: 'WARRIOR', rarity: 5 },
];

const baseSettings: RollSettings = { withOperators: true, rarities: [3, 4, 5, 6], excludes: [] };

/** 依次返回给定数值的伪随机源，超出后重复最后一个 */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('pickOne', () => {
  it('按 rng 值取元素', () => {
    expect(pickOne(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickOne(['a', 'b', 'c'], () => 0.999)).toBe('c');
  });
  it('空数组抛错', () => {
    expect(() => pickOne([], () => 0)).toThrow();
  });
});

describe('buildPool', () => {
  const slot: RecruitSlot = { classes: ['PIONEER'], rarityCap: null };

  it('按职业过滤', () => {
    expect(buildPool(operators, slot, baseSettings).map((o) => o.id)).toEqual(['c1', 'c2']);
  });
  it('按稀有度勾选过滤', () => {
    const s = { ...baseSettings, rarities: [6] };
    expect(buildPool(operators, slot, s).map((o) => o.id)).toEqual(['c2']);
  });
  it('按排除名单过滤', () => {
    const s = { ...baseSettings, excludes: ['c2'] };
    expect(buildPool(operators, slot, s).map((o) => o.id)).toEqual(['c1']);
  });
  it('rarityCap 限制最高星级', () => {
    const capped: RecruitSlot = { classes: ['WARRIOR'], rarityCap: 5 };
    expect(buildPool(operators, capped, baseSettings).map((o) => o.id)).toEqual(['c5']);
  });
});

describe('rollSlotOperator', () => {
  it('单职业券位从池中随机', () => {
    const slot: RecruitSlot = { classes: ['SNIPER'], rarityCap: null };
    expect(rollSlotOperator(operators, slot, baseSettings, () => 0)?.id).toBe('c3');
  });
  it('多职业券位先随机职业再随机干员', () => {
    const slot: RecruitSlot = { classes: ['PIONEER', 'WARRIOR'], rarityCap: null };
    // rng 第1次 0.999 → 职业 WARRIOR；第2次 0 → 该职业池第一个（c4 或 c5，按过滤顺序）
    const op = rollSlotOperator(operators, slot, baseSettings, seqRng([0.999, 0]));
    expect(op?.profession).toBe('WARRIOR');
  });
  it('池为空返回 null', () => {
    const slot: RecruitSlot = { classes: ['SNIPER'], rarityCap: null };
    const s = { ...baseSettings, excludes: ['c3'] };
    expect(rollSlotOperator(operators, slot, s, () => 0)).toBeNull();
  });
  it('多职业券位选中职业池空时返回 null', () => {
    const slot: RecruitSlot = { classes: ['PIONEER', 'WARRIOR'], rarityCap: null };
    const s = { ...baseSettings, excludes: ['c1', 'c2'] }; // 排除全部先锋
    // seqRng([0, 0])：第1次 0 → 选中 PIONEER；该职业池已空 → 返回 null
    expect(rollSlotOperator(operators, slot, s, seqRng([0, 0]))).toBeNull();
  });
});

describe('rollStart', () => {
  it('关闭干员随机时券位不带干员', () => {
    const s = { ...baseSettings, withOperators: false };
    const r = rollStart(theme, operators, s, () => 0);
    expect(r.squad.id).toBe('b1');
    expect(r.group.id).toBe('g1');
    expect(r.slots).toHaveLength(2);
    expect(r.slots.every((sl) => sl.operator === null && sl.empty === false)).toBe(true);
  });
  it('开启干员随机时每个券位带干员', () => {
    const r = rollStart(theme, operators, baseSettings, () => 0);
    expect(r.slots[0].operator?.profession).toBe('PIONEER');
    expect(r.slots[1].operator?.profession).toBe('SNIPER');
  });
  it('某券位池空时标记 empty，不影响其他券位', () => {
    const s = { ...baseSettings, excludes: ['c1', 'c2'] }; // 先锋全排除
    const r = rollStart(theme, operators, s, () => 0);
    expect(r.slots[0].empty).toBe(true);
    expect(r.slots[0].operator).toBeNull();
    expect(r.slots[1].empty).toBe(false);
  });
});

describe('rerollSquad', () => {
  it('从分队集合中随机一个', () => {
    expect(rerollSquad(theme, () => 0).id).toBe('b1');
  });
});

describe('rerollSlot', () => {
  it('保留原券位配置，只重抽干员', () => {
    const slot: RecruitSlot = { classes: ['PIONEER'], rarityCap: null };
    const r = rerollSlot(slot, operators, baseSettings, () => 0.999);
    expect(r.slot).toBe(slot);
    expect(r.operator?.id).toBe('c2');
  });
});
