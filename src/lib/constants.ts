export const CLASS_CN: Record<string, string> = {
  PIONEER: '先锋',
  WARRIOR: '近卫',
  TANK: '重装',
  SNIPER: '狙击',
  CASTER: '术师',
  MEDIC: '医疗',
  SUPPORT: '辅助',
  SPECIAL: '特种',
};

// 本源研修分队减免涉及的子职业（与 scripts/lib/extract-core.mjs 保持同步）
export const SUB_PROFESSION_CN: Record<string, string> = {
  primcaster: '本源术师',
  primprotector: '本源铁卫',
  primguard: '本源近卫',
  ritualist: '巫役',
};

/** 干员头像地址（ArknightsAssets2 仓库的 jsDelivr 镜像，加载失败时前端隐藏图片降级为文字） */
export function operatorAvatarUrl(id: string): string {
  return `https://cdn.jsdelivr.net/gh/ArknightsAssets/ArknightsAssets2@cn/assets/dyn/arts/charavatars/${id}.png`;
}
