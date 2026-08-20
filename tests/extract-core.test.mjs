import { describe, expect, it } from 'vitest';
import { extractOperators, extractRecruitGroups, extractSquads } from '../scripts/lib/extract-core.mjs';

const fakeTopicDetail = {
  bandRef: {
    rogue_6_band_1: { itemId: 'rogue_6_band_1', bandLevel: 0, normalBandId: 'rogue_6_band_1' },
    rogue_6_band_2: { itemId: 'rogue_6_band_2', bandLevel: 1, normalBandId: 'rogue_6_band_1' },
    rogue_6_band_3: { itemId: 'rogue_6_band_3', bandLevel: 0, normalBandId: 'rogue_6_band_3' },
  },
  items: {
    rogue_6_band_1: { name: '指挥分队', usage: '目标生命上限+2', unlockCondDesc: null },
    rogue_6_band_3: { name: '特勤分队', usage: '可携带干员+2', unlockCondDesc: '完成游戏结局' },
  },
  init: [
    { modeGrade: 0, initialRecruitGroup: ['recruit_group_1', 'recruit_group_random'] },
    { modeGrade: 1, initialRecruitGroup: ['recruit_group_1'] },
  ],
  recruitGrps: {
    recruit_group_1: { id: 'recruit_group_1', name: '先手必胜', desc: '先锋、狙击、特种招募券各一张' },
    recruit_group_random: { id: 'recruit_group_random', name: '随心所欲', desc: '三张随机的招募券，其中一张必定出现5星临时招募' },
  },
};

const fakeCharTable = {
  char_a: { name: '六星近卫', profession: 'WARRIOR', rarity: 5, isNotObtainable: false },
  char_b: { name: '三星先锋', profession: 'PIONEER', rarity: 2, isNotObtainable: false },
  char_c: { name: '二星小车', profession: 'MEDIC', rarity: 0, isNotObtainable: false },
  char_d: { name: '剧情角色', profession: 'CASTER', rarity: 5, isNotObtainable: true },
  token_1: { name: '召唤物', profession: 'TOKEN', rarity: 4, isNotObtainable: false },
};

describe('extractSquads', () => {
  it('只提取基础分队，映射名称/效果/解锁条件', () => {
    const squads = extractSquads(fakeTopicDetail);
    expect(squads).toEqual([
      { id: 'rogue_6_band_1', name: '指挥分队', desc: '目标生命上限+2', unlockCond: null },
      { id: 'rogue_6_band_3', name: '特勤分队', desc: '可携带干员+2', unlockCond: '完成游戏结局' },
    ]);
  });

  it('分队缺少 items 数据时抛错', () => {
    const bad = {
      ...fakeTopicDetail,
      items: {
        rogue_6_band_3: fakeTopicDetail.items.rogue_6_band_3,
      },
    };
    expect(() => extractSquads(bad)).toThrow(/缺少 items 数据/);
  });
});

describe('extractRecruitGroups', () => {
  it('从 modeGrade=0 的开局组合提取券位配置', () => {
    const groups = extractRecruitGroups(fakeTopicDetail);
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe('先手必胜');
    expect(groups[0].slots).toEqual([
      { classes: ['PIONEER'], rarityCap: null },
      { classes: ['SNIPER'], rarityCap: null },
      { classes: ['SPECIAL'], rarityCap: null },
    ]);
    expect(groups[1].slots[0].rarityCap).toBe(5);
    expect(groups[1].slots[1].classes).toEqual(['PIONEER', 'WARRIOR', 'TANK', 'SPECIAL']);
  });

  it('组合描述与券位配置不符时抛错', () => {
    const bad = {
      ...fakeTopicDetail,
      init: [{ modeGrade: 0, initialRecruitGroup: ['recruit_group_1'] }],
      recruitGrps: {
        recruit_group_1: { id: 'recruit_group_1', name: '先手必胜', desc: '内容被游戏更新改掉了' },
      },
    };
    expect(() => extractRecruitGroups(bad)).toThrow(/券位配置不符/);
  });

  it('init 中找不到 modeGrade=0 的开局配置时抛错', () => {
    const bad = {
      ...fakeTopicDetail,
      init: [{ modeGrade: 1, initialRecruitGroup: ['recruit_group_1'] }],
    };
    expect(() => extractRecruitGroups(bad)).toThrow(/modeGrade=0/);
  });

  it('组合缺少 recruitGrps 数据时抛错', () => {
    const bad = {
      ...fakeTopicDetail,
      init: [{ modeGrade: 0, initialRecruitGroup: ['recruit_group_1', 'recruit_group_missing'] }],
    };
    expect(() => extractRecruitGroups(bad)).toThrow(/缺少 recruitGrps 数据/);
  });

  it('组合缺少 GROUP_SLOTS 券位配置时抛错', () => {
    const bad = {
      ...fakeTopicDetail,
      init: [{ modeGrade: 0, initialRecruitGroup: ['recruit_group_unknown'] }],
      recruitGrps: {
        recruit_group_unknown: { id: 'recruit_group_unknown', name: '未知组合', desc: '先锋招募券一张' },
      },
    };
    expect(() => extractRecruitGroups(bad)).toThrow(/缺少招募组合.*券位配置/);
  });
});

describe('extractOperators', () => {
  it('过滤非8大职业/不可获得/3星以下，稀有度转为1起始', () => {
    const ops = extractOperators(fakeCharTable);
    expect(ops).toEqual([
      { id: 'char_a', name: '六星近卫', profession: 'WARRIOR', rarity: 6 },
      { id: 'char_b', name: '三星先锋', profession: 'PIONEER', rarity: 3 },
    ]);
  });

  it('空 charTable 返回空数组', () => {
    expect(extractOperators({})).toEqual([]);
  });
});
