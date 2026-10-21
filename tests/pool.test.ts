import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { applyPreset, detectPreset, emptyPoolRarities, idsOfRarity, summarizeOperatorPools } from '../src/lib/pool';
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

describe('参与范围展板', () => {
  const operators: Operator[] = [
    { id: 'six-a', name: '六星甲', profession: 'WARRIOR', subProfession: 'p', rarity: 6, hopeCost: 6, charDiscount: 0 },
    { id: 'six-b', name: '六星乙', profession: 'WARRIOR', subProfession: 'p', rarity: 6, hopeCost: 6, charDiscount: 0 },
    { id: 'five', name: '五星甲', profession: 'SPECIAL', subProfession: 'p', rarity: 5, hopeCost: 2, charDiscount: 0 },
    { id: 'four', name: '四星甲', profession: 'MEDIC', subProfession: 'p', rarity: 4, hopeCost: 0, charDiscount: 0 },
  ];

  it('只统计对应星级的有效已选干员，忽略重复、失效和错星级的 ID', () => {
    const settings: RollSettings = { pool: { 6: ['six-b', 'six-a', 'six-a', 'missing', 'five'], 5: ['five'], 4: [] } };
    const before = JSON.stringify({ operators, settings });
    const groups = summarizeOperatorPools(operators, settings);
    expect(groups.map((group) => [group.rarity, group.count])).toEqual([[6, 2], [5, 1], [4, 0]]);
    expect(groups[0].preview.map(({ id, name }) => [id, name])).toEqual([['six-a', '六星甲'], ['six-b', '六星乙']]);
    expect(groups[2].preview).toEqual([]);
    expect(JSON.stringify({ operators, settings })).toBe(before);
  });

  it('缩略头像只展示部分干员，总数仍包含全部已选干员', () => {
    const sixStars = rawData.operators.filter((operator) => operator.rarity === 6);
    const groups = summarizeOperatorPools(rawData.operators, { pool: { 6: sixStars.map((operator) => operator.id) } });
    expect(groups[0].count).toBe(sixStars.length);
    expect(groups[0].preview).toHaveLength(6);
    expect(groups[0].preview[0]).toEqual(sixStars[0]);
    expect(groups.slice(1).map((group) => group.count)).toEqual([0, 0]);
  });

  it('取消首个干员后姓名与头像一起更新，清空后显示零人', () => {
    const settings: RollSettings = { pool: { 6: ['six-a', 'six-b'] } };
    expect(summarizeOperatorPools(operators, settings)[0].preview[0].name).toBe('六星甲');
    settings.pool[6] = ['six-b'];
    const next = summarizeOperatorPools(operators, settings)[0];
    expect(next.count).toBe(1);
    expect(next.preview[0]).toMatchObject({ id: 'six-b', name: '六星乙' });
    settings.pool[6] = [];
    expect(summarizeOperatorPools(operators, settings)[0]).toEqual({ rarity: 6, count: 0, preview: [] });
  });
});
