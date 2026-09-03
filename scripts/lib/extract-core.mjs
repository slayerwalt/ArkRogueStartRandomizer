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
// 阿米娅形态切换：默认医疗形态（仅医疗券可抓），但可享受近卫/医疗/术师三职业的分队减免
const AMIYA_ID = 'char_002_amiya';
const AMIYA_PROFESSION = 'MEDIC';
const AMIYA_BONUS_PROFESSIONS = ['WARRIOR', 'CASTER'];

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
// recruit_group_random（随心所欲）在游戏内随机发券，本地无法复现，不纳入随机组合。
// 提取时需要排除的招募组合（券位在游戏内随机，本地无法复现）
export const EXCLUDED_RECRUIT_GROUPS = ['recruit_group_random'];

export const GROUP_SLOTS = {
  recruit_group_1: [{ classes: ['PIONEER'] }, { classes: ['SNIPER'] }, { classes: ['SPECIAL'] }],
  recruit_group_2: [{ classes: ['TANK'] }, { classes: ['CASTER'] }, { classes: ['SNIPER'] }],
  recruit_group_3: [{ classes: ['WARRIOR'] }, { classes: ['SUPPORT'] }, { classes: ['MEDIC'] }],
  recruit_group_4: [{ classes: ['PIONEER'] }, { classes: ['SUPPORT'] }, { classes: ['SPECIAL'] }],
  recruit_group_5: [{ classes: ['TANK'] }, { classes: ['CASTER'] }, { classes: ['MEDIC'] }],
};

/**
 * ArknightsGameResource 使用 0～5，部分结构化数据仓库使用 TIER_1～TIER_6。
 * 对外统一返回游戏内展示星级 1～6，未知格式直接报错，避免静默漏掉干员。
 */
export function normalizeRarity(value, operatorId = '未知干员') {
  if (Number.isInteger(value) && value >= 0 && value <= 5) return value + 1;

  if (typeof value === 'string') {
    const match = /^TIER_([1-6])$/.exec(value);
    if (match) return Number(match[1]);
  }

  throw new Error(`干员 ${operatorId} 的 rarity 格式未知: ${JSON.stringify(value)}`);
}

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
  return initEntry.initialRecruitGroup
    .filter((gid) => !EXCLUDED_RECRUIT_GROUPS.includes(gid))
    .map((gid) => {
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
    .flatMap(([id, c]) => {
      if (!ALL_CLASSES.includes(c.profession) || c.isNotObtainable) return [];

      const rarity = normalizeRarity(c.rarity, id);
      if (rarity < 3) return [];
      if (typeof c.name !== 'string' || typeof c.subProfessionId !== 'string') {
        throw new Error(`干员 ${id} 缺少名称或子职业数据`);
      }

      const isAmiya = id === AMIYA_ID;
      return [{
        id,
        name: c.name,
        profession: isAmiya ? AMIYA_PROFESSION : c.profession,
        subProfession: c.subProfessionId,
        rarity,
        hopeCost: HOPE_COST[rarity] ?? 0,
        charDiscount: id === MECHANIST_ID ? MECHANIST_DISCOUNT : 0,
        ...(isAmiya ? { bonusProfessions: AMIYA_BONUS_PROFESSIONS } : {}),
      }];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
