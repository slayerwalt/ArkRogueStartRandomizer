import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { COMMON_OPERATORS } from '../src/lib/common-operators';
import { applyPreset, detectPreset, emptyPoolRarities, idsOfRarity } from '../src/lib/pool';
import type { Operator, RollSettings } from '../src/lib/types';

const all = ['a', 'b', 'c'];
const common = ['a', 'b'];

describe('detectPreset', () => {
  it('空选择为「全不选」', () => {
    expect(detectPreset([], all, common)).toBe('none');
  });
  it('与全选一致为「全选」', () => {
    expect(detectPreset(['c', 'b', 'a'], all, common)).toBe('all');
  });
  it('与常见名单一致为「常见」', () => {
    expect(detectPreset(['b', 'a'], all, common)).toBe('common');
  });
  it('其余情况为「自定义」', () => {
    expect(detectPreset(['a'], all, common)).toBe('custom');
  });
  it('常见名单为空时，非空选择不可能是「常见」', () => {
    expect(detectPreset(['a'], all, [])).toBe('custom');
  });
});

describe('applyPreset', () => {
  it('全选返回全部 id', () => {
    expect(applyPreset('all', all, common)).toEqual(all);
  });
  it('常见返回常见名单', () => {
    expect(applyPreset('common', all, common)).toEqual(common);
  });
  it('全不选返回空数组', () => {
    expect(applyPreset('none', all, common)).toEqual([]);
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

describe('常见名单', () => {
  it('名单中的干员 id 都存在于游戏数据且星级与分组一致', () => {
    const byId = new Map(rawData.operators.map((o) => [o.id, o]));
    for (const [rarity, ids] of Object.entries(COMMON_OPERATORS)) {
      for (const id of ids) {
        const op = byId.get(id);
        expect(op, `${id} 应存在于游戏数据`).toBeTruthy();
        expect(op!.rarity, `${op!.name}（${id}）应为 ${rarity} 星`).toBe(Number(rarity));
      }
    }
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
