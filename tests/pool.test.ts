import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { applyPreset, detectPreset, emptyPoolRarities, idsOfRarity } from '../src/lib/pool';
import type { Operator, RollSettings } from '../src/lib/types';

const all = ['a', 'b', 'c'];

describe('detectPreset', () => {
  it('空选择为「全不选」', () => {
    expect(detectPreset([], all)).toBe('none');
  });
  it('与全选一致为「全选」', () => {
    expect(detectPreset(['c', 'b', 'a'], all)).toBe('all');
  });
  it('其余情况为「自定义」', () => {
    expect(detectPreset(['a'], all)).toBe('custom');
  });
});

describe('applyPreset', () => {
  it('全选返回全部 id', () => {
    expect(applyPreset('all', all)).toEqual(all);
  });
  it('全不选返回空数组', () => {
    expect(applyPreset('none', all)).toEqual([]);
  });
});

describe('emptyPoolRarities', () => {
  it('返回范围为空的 4/5/6 星级', () => {
    const s: RollSettings = { pool: { 6: ['a'], 5: [], 4: [] } };
    expect(emptyPoolRarities(s)).toEqual([5, 4]);
  });
  it('范围齐全时返回空数组', () => {
    const s: RollSettings = { pool: { 6: ['a'], 5: ['b'], 4: ['c'] } };
    expect(emptyPoolRarities(s)).toEqual([]);
  });
});

describe('idsOfRarity', () => {
  it('筛选指定星级的干员 id', () => {
    const ops: Operator[] = [
      { id: 'a', name: '甲', profession: 'PIONEER', subProfession: 'p', rarity: 6, hopeCost: 6, charDiscount: 0 },
      { id: 'b', name: '乙', profession: 'SNIPER', subProfession: 's', rarity: 5, hopeCost: 2, charDiscount: 0 },
    ];
    expect(idsOfRarity(ops, 6)).toEqual(['a']);
    expect(idsOfRarity(ops, 4)).toEqual([]);
  });
});

describe('阿米娅特殊规则', () => {
  it('默认医疗形态，且减免职业包含近卫与术师', () => {
    const amiya = rawData.operators.find((o) => o.id === 'char_002_amiya');
    expect(amiya).toBeTruthy();
    expect(amiya!.profession).toBe('MEDIC');
    expect(amiya!.bonusProfessions).toEqual(['WARRIOR', 'CASTER']);
  });
});
