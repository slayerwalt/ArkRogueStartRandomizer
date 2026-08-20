import { describe, expect, it } from 'vitest';
import { effectiveHopeCost, rollStart, type Rng } from '../src/lib/roll';
import type { Operator, RecruitSlot, RollSettings, Squad, Theme } from '../src/lib/types';

const squad: Squad = {
  id: 'b1', name: '普通分队', desc: '', unlockCond: null, initialHopeBonus: 0, recruitDiscount: null,
};
const fortressSquad: Squad = {
  id: 'b9', name: '堡垒战术分队', desc: '', unlockCond: null, initialHopeBonus: 0,
  recruitDiscount: { professions: ['TANK', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
};
const hopeSquad: Squad = {
  id: 'b4', name: '后勤分队', desc: '', unlockCond: null, initialHopeBonus: 2, recruitDiscount: null,
};

const theme: Theme = {
  id: 'rogue_6',
  name: '沉沦者的黑流树海',
  squads: [squad, fortressSquad, hopeSquad],
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
  ],
};

const operators: Operator[] = [
  { id: 'c1', name: '六星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 6, hopeCost: 6, charDiscount: 0 },
  { id: 'c2', name: '三星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 3, hopeCost: 0, charDiscount: 0 },
  { id: 'c3', name: '六星重装', profession: 'TANK', subProfession: 'protector', rarity: 6, hopeCost: 6, charDiscount: 0 },
  { id: 'm1', name: '机械师', profession: 'TANK', subProfession: 'shotprotector', rarity: 6, hopeCost: 6, charDiscount: -4 },
  { id: 'c4', name: '五星狙击', profession: 'SNIPER', subProfession: 'fastshot', rarity: 5, hopeCost: 2, charDiscount: 0 },
  { id: 'c5', name: '四星狙击', profession: 'SNIPER', subProfession: 'fastshot', rarity: 4, hopeCost: 0, charDiscount: 0 },
];

const settings: RollSettings = { withOperators: true, excludes: [] };

/** 依次返回给定数值的伪随机源，超出后重复最后一个 */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('effectiveHopeCost', () => {
  it('基础消耗：六星6、五星2、四星及以下0', () => {
    expect(effectiveHopeCost(operators[0], squad)).toBe(6); // 六星先锋
    expect(effectiveHopeCost(operators[4], squad)).toBe(2); // 五星狙击
    expect(effectiveHopeCost(operators[5], squad)).toBe(0); // 四星狙击
    expect(effectiveHopeCost(operators[1], squad)).toBe(0); // 三星先锋
  });

  it('分队职业减免：堡垒重装-2', () => {
    expect(effectiveHopeCost(operators[2], fortressSquad)).toBe(4); // 六星重装 6-2
  });

  it('机械师减免：天赋-4，叠加分队-2', () => {
    expect(effectiveHopeCost(operators[3], squad)).toBe(2); // 6-4
    expect(effectiveHopeCost(operators[3], fortressSquad)).toBe(0); // 6-4-2
  });
});

describe('rollStart', () => {
  it('硬约束：总希望消耗不超过初始希望', () => {
    for (let i = 0; i < 100; i++) {
      const r = rollStart(theme, operators, settings);
      const total = r.slots.reduce((s, sl) => s + sl.hopeCost, 0);
      expect(total).toBeLessThanOrEqual(r.initialHope);
    }
  });

  it('尽量高星：预算6时先处理的券位选六星，剩余券位选0希望的四星', () => {
    // rng: 第1次选普通分队(0)、第2次选唯一组合(0)、第3次 shuffle 不交换(0.9→先锋先)、第4次先锋选六星(0)、第5次狙击选四星(0)
    const r = rollStart(theme, operators, settings, seqRng([0, 0, 0.9, 0, 0]));
    expect(r.initialHope).toBe(6);
    expect(r.slots[0].operator?.id).toBe('c1'); // 先锋 = 六星
    expect(r.slots[1].operator?.id).toBe('c5'); // 狙击 = 四星（剩余预算0）
  });

  it('后勤分队初始希望 +2', () => {
    // rng: 第1次选后勤分队(index 2 → 0.7)
    const r = rollStart(theme, operators, settings, seqRng([0.7, 0, 0.9, 0, 0]));
    expect(r.squad.id).toBe('b4');
    expect(r.initialHope).toBe(8);
  });

  it('关闭干员随机时券位不带干员', () => {
    const s = { ...settings, withOperators: false };
    const r = rollStart(theme, operators, s, seqRng([0, 0, 0.9]));
    expect(r.slots.every((sl) => sl.operator === null && sl.empty === false)).toBe(true);
  });

  it('排除名单导致券位空池时标记 empty，不影响其他券位', () => {
    const s = { ...settings, excludes: ['c1', 'c2'] }; // 排除全部先锋
    // 先锋券位先处理：候选空 → empty
    const r = rollStart(theme, operators, s, seqRng([0, 0, 0.9, 0, 0]));
    expect(r.slots[0].empty).toBe(true);
    expect(r.slots[0].operator).toBeNull();
    expect(r.slots[1].empty).toBe(false);
  });
});
