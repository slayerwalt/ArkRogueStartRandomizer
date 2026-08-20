import { describe, expect, it } from 'vitest';
import { validateGameData } from '../src/lib/data';

const valid = {
  generatedAt: '2026-08-20',
  themes: [
    {
      id: 'rogue_6',
      name: '沉沦者的黑流树海',
      squads: [{ id: 'b1', name: '指挥分队', desc: 'x', unlockCond: null }],
      recruitGroups: [{ id: 'g1', name: '先手必胜', desc: 'x', slots: [{ classes: ['PIONEER'], rarityCap: null }] }],
    },
  ],
  operators: [{ id: 'c1', name: '干员甲', profession: 'PIONEER', subProfession: 'pioneer', rarity: 3, hopeCost: 0, charDiscount: 0 }],
};

describe('validateGameData', () => {
  it('合法数据原样返回', () => {
    expect(validateGameData(valid)).toBe(valid);
  });
  it('缺少主题时报中文错误', () => {
    expect(() => validateGameData({ ...valid, themes: [] })).toThrow(/数据文件/);
  });
  it('缺少干员时报中文错误', () => {
    expect(() => validateGameData({ ...valid, operators: [] })).toThrow(/数据文件/);
  });
  it('主题缺少分队或招募组合时报错', () => {
    const bad = { ...valid, themes: [{ ...valid.themes[0], squads: [] }] };
    expect(() => validateGameData(bad)).toThrow(/分队或招募组合/);
  });
  it('数据版本过旧（缺子职业/希望消耗）时报错', () => {
    const bad = { ...valid, operators: [{ id: 'c1', name: '干员甲', profession: 'PIONEER', rarity: 3 }] };
    expect(() => validateGameData(bad)).toThrow(/版本过旧/);
  });
  it('完全非法的输入报错而不是白屏', () => {
    expect(() => validateGameData(null)).toThrow(/数据文件/);
  });
});
