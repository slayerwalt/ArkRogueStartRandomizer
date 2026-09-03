import { describe, expect, it } from 'vitest';
import { extractOperators, extractRecruitGroups, extractSquads, normalizeRarity } from '../scripts/lib/extract-core.mjs';

const fakeTopicDetail = {
  bandRef: {
    rogue_6_band_1: { itemId: 'rogue_6_band_1', bandLevel: 0, normalBandId: 'rogue_6_band_1' },
    rogue_6_band_2: { itemId: 'rogue_6_band_2', bandLevel: 1, normalBandId: 'rogue_6_band_1' },
    rogue_6_band_3: { itemId: 'rogue_6_band_3', bandLevel: 0, normalBandId: 'rogue_6_band_3' },
    rogue_6_band_4: { itemId: 'rogue_6_band_4', bandLevel: 0, normalBandId: 'rogue_6_band_4' },
    rogue_6_band_9: { itemId: 'rogue_6_band_9', bandLevel: 0, normalBandId: 'rogue_6_band_9' },
  },
  items: {
    rogue_6_band_1: { name: '指挥分队', usage: '目标生命上限+2', unlockCondDesc: null },
    rogue_6_band_3: { name: '特勤分队', usage: '可携带干员+2', unlockCondDesc: '完成游戏结局' },
    rogue_6_band_4: { name: '后勤分队', usage: '初始源石锭+20，初始希望+2', unlockCondDesc: null },
    rogue_6_band_9: { name: '堡垒战术分队', usage: '重装辅助希望降低', unlockCondDesc: null },
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
  char_a: { name: '六星近卫', profession: 'WARRIOR', subProfessionId: 'lord', rarity: 5, isNotObtainable: false },
  char_b: { name: '三星先锋', profession: 'PIONEER', subProfessionId: 'pioneer', rarity: 2, isNotObtainable: false },
  char_c: { name: '二星小车', profession: 'MEDIC', subProfessionId: 'physician', rarity: 0, isNotObtainable: false },
  char_d: { name: '剧情角色', profession: 'CASTER', subProfessionId: 'corecaster', rarity: 5, isNotObtainable: true },
  char_4230_mcnist: { name: '机械师', profession: 'TANK', subProfessionId: 'shotprotector', rarity: 5, isNotObtainable: false },
  token_1: { name: '召唤物', profession: 'TOKEN', subProfessionId: null, rarity: 4, isNotObtainable: false },
};

describe('extractSquads', () => {
  it('只提取基础分队，映射名称/效果/解锁条件/希望加成/减免', () => {
    const squads = extractSquads(fakeTopicDetail);
    expect(squads).toEqual([
      { id: 'rogue_6_band_1', name: '指挥分队', desc: '目标生命上限+2', unlockCond: null, initialHopeBonus: 0, recruitDiscount: null },
      { id: 'rogue_6_band_3', name: '特勤分队', desc: '可携带干员+2', unlockCond: '完成游戏结局', initialHopeBonus: 0, recruitDiscount: null },
      { id: 'rogue_6_band_4', name: '后勤分队', desc: '初始源石锭+20，初始希望+2', unlockCond: null, initialHopeBonus: 2, recruitDiscount: null },
      {
        id: 'rogue_6_band_9', name: '堡垒战术分队', desc: '重装辅助希望降低', unlockCond: null, initialHopeBonus: 0,
        recruitDiscount: { professions: ['TANK', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
      },
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
  it('从 modeGrade=0 的开局组合提取券位配置，排除随心所欲', () => {
    const groups = extractRecruitGroups(fakeTopicDetail);
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('先手必胜');
    expect(groups[0].slots).toEqual([
      { classes: ['PIONEER'], rarityCap: null },
      { classes: ['SNIPER'], rarityCap: null },
      { classes: ['SPECIAL'], rarityCap: null },
    ]);
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
  it('过滤非8大职业/不可获得/3星以下，补子职业与希望消耗', () => {
    const ops = extractOperators(fakeCharTable);
    expect(ops).toEqual([
      { id: 'char_4230_mcnist', name: '机械师', profession: 'TANK', subProfession: 'shotprotector', rarity: 6, hopeCost: 6, charDiscount: -4 },
      { id: 'char_a', name: '六星近卫', profession: 'WARRIOR', subProfession: 'lord', rarity: 6, hopeCost: 6, charDiscount: 0 },
      { id: 'char_b', name: '三星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 3, hopeCost: 0, charDiscount: 0 },
    ]);
  });

  it('空 charTable 返回空数组', () => {
    expect(extractOperators({})).toEqual([]);
  });

  it('兼容数字与 TIER_n 两种稀有度格式', () => {
    expect(normalizeRarity(5, 'char_numeric')).toBe(6);
    expect(normalizeRarity('TIER_6', 'char_tier')).toBe(6);
    const table = {
      char_tier: {
        name: '字符串稀有度干员', profession: 'WARRIOR', subProfessionId: 'lord',
        rarity: 'TIER_5', isNotObtainable: false,
      },
    };
    expect(extractOperators(table)[0]).toMatchObject({ id: 'char_tier', rarity: 5, hopeCost: 2 });
  });

  it('遇到未知稀有度格式时抛错', () => {
    const table = {
      char_bad: {
        name: '异常干员', profession: 'WARRIOR', subProfessionId: 'lord',
        rarity: 'SIX_STAR', isNotObtainable: false,
      },
    };
    expect(() => extractOperators(table)).toThrow(/rarity 格式未知/);
  });

  it('阿米娅特殊规则：职业改为医疗，附加近卫/术师减免职业', () => {
    const table = {
      char_002_amiya: { name: '阿米娅', profession: 'CASTER', subProfessionId: 'corecaster', rarity: 4, isNotObtainable: false },
    };
    expect(extractOperators(table)).toEqual([
      {
        id: 'char_002_amiya', name: '阿米娅', profession: 'MEDIC', subProfession: 'corecaster',
        rarity: 5, hopeCost: 2, charDiscount: 0, bonusProfessions: ['WARRIOR', 'CASTER'],
      },
    ]);
  });
});
