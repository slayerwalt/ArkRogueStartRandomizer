// 本文件为零依赖 Node ESM，无法 import TS 模块；
// 下方 ALL_CLASSES 与 CLASS_CN 需与前端 src/lib/constants.ts 保持同步。
export const ALL_CLASSES = ['PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL'];

export const CLASS_CN = {
  PIONEER: '先锋',
  WARRIOR: '近卫',
  TANK: '重装',
  SNIPER: '狙击',
  CASTER: '术师',
  MEDIC: '医疗',
  SUPPORT: '辅助',
  SPECIAL: '特种',
};

// 本源研修分队减免涉及的子职业（需与前端 src/lib/constants.ts 保持同步）
export const SUB_PROFESSION_CN = {
  primcaster: '本源术师',
  primprotector: '本源铁卫',
  primguard: '本源近卫',
  ritualist: '巫役',
};

// 开局招募希望消耗（1 起始星级）
const HOPE_COST = { 3: 0, 4: 0, 5: 2, 6: 6 };
const MECHANIST_ID = 'char_4230_mcnist';
const MECHANIST_DISCOUNT = -4;

// 分队初始希望加成
const SQUAD_HOPE_BONUS = { rogue_6_band_4: 2 };
// 分队招募减免（4 星及以上，delta -2）
const SQUAD_DISCOUNT = {
  rogue_6_band_8: { professions: ['PIONEER', 'WARRIOR'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_9: { professions: ['TANK', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_10: { professions: ['MEDIC', 'SNIPER'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_11: { professions: ['CASTER', 'SPECIAL'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_12: { professions: ['MEDIC', 'SNIPER', 'CASTER', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_13: { professions: ['PIONEER', 'WARRIOR', 'TANK', 'SPECIAL'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_14: { professions: null, subProfessions: ['primcaster', 'primprotector', 'primguard', 'ritualist'], minRarity: 4, delta: -2 },
};

// 招募组合 → 券位配置。游戏数据中不存在该关联（客户端逻辑），
// 根据组合描述文本核对：固定券位组合 1-5 的职业中文名必须出现在 desc 中；
// recruit_group_random 为「随心所欲」：5星临时招募券 + 地面四职业券 + 高台四职业券。
export const GROUP_SLOTS = {
  recruit_group_1: [{ classes: ['PIONEER'] }, { classes: ['SNIPER'] }, { classes: ['SPECIAL'] }],
  recruit_group_2: [{ classes: ['TANK'] }, { classes: ['CASTER'] }, { classes: ['SNIPER'] }],
  recruit_group_3: [{ classes: ['WARRIOR'] }, { classes: ['SUPPORT'] }, { classes: ['MEDIC'] }],
  recruit_group_4: [{ classes: ['PIONEER'] }, { classes: ['SUPPORT'] }, { classes: ['SPECIAL'] }],
  recruit_group_5: [{ classes: ['TANK'] }, { classes: ['CASTER'] }, { classes: ['MEDIC'] }],
  recruit_group_random: [
    { classes: ALL_CLASSES, rarityCap: 5 },
    { classes: ['PIONEER', 'WARRIOR', 'TANK', 'SPECIAL'] },
    { classes: ['SNIPER', 'CASTER', 'MEDIC', 'SUPPORT'] },
  ],
};

export function extractSquads(topicDetail) {
  const bases = Object.values(topicDetail.bandRef).filter((r) => r.itemId === r.normalBandId);
  return bases
    .map((r) => {
      const item = topicDetail.items[r.itemId];
      if (!item) throw new Error(`分队 ${r.itemId} 缺少 items 数据`);
      return {
        id: r.itemId,
        name: item.name,
        desc: item.usage,
        unlockCond: item.unlockCondDesc ?? null,
        initialHopeBonus: SQUAD_HOPE_BONUS[r.itemId] ?? 0,
        recruitDiscount: SQUAD_DISCOUNT[r.itemId] ?? null,
      };
    })
    // 排序键依赖 id 形如 <主题>_band_<数字> 的前提（如 rogue_6_band_1）
    .sort((a, b) => Number(a.id.split('_').pop()) - Number(b.id.split('_').pop()));
}

export function extractRecruitGroups(topicDetail) {
  const initEntry = topicDetail.init.find((e) => e.modeGrade === 0);
  if (!initEntry) throw new Error('找不到 modeGrade=0 的开局配置');
  return initEntry.initialRecruitGroup.map((gid) => {
    const grp = topicDetail.recruitGrps[gid];
    if (!grp) throw new Error(`招募组合 ${gid} 缺少 recruitGrps 数据`);
    const slots = GROUP_SLOTS[gid];
    if (!slots) throw new Error(`缺少招募组合 ${gid} 的券位配置，请在 GROUP_SLOTS 中补充`);
    for (const slot of slots) {
      if (slot.classes.length === 1 && !grp.desc.includes(CLASS_CN[slot.classes[0]])) {
        throw new Error(`招募组合 ${gid}（${grp.name}）描述「${grp.desc}」与券位配置不符，请更新 GROUP_SLOTS`);
      }
    }
    return {
      id: gid,
      name: grp.name,
      desc: grp.desc,
      slots: slots.map((s) => ({ classes: [...s.classes], rarityCap: s.rarityCap ?? null })),
    };
  });
}

export function extractOperators(charTable) {
  return Object.entries(charTable)
    .filter(([, c]) => ALL_CLASSES.includes(c.profession) && !c.isNotObtainable && c.rarity >= 2)
    .map(([id, c]) => {
      const rarity = c.rarity + 1;
      return {
        id,
        name: c.name,
        profession: c.profession,
        subProfession: c.subProfessionId,
        rarity,
        hopeCost: HOPE_COST[rarity] ?? 0,
        charDiscount: id === MECHANIST_ID ? MECHANIST_DISCOUNT : 0,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
