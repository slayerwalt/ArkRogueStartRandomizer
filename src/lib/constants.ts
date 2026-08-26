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

/**
 * 干员头像（144px webp，打包进项目；原始图片来自 ArknightsAssets2，芳汀来自 PRTS）。
 * 找不到对应头像时返回 undefined，前端降级为纯文字展示。
 */
const avatarModules = import.meta.glob<string>('../assets/avatars/*.webp', {
  eager: true,
  import: 'default',
});
const AVATARS: Record<string, string> = {};
for (const [path, url] of Object.entries(avatarModules)) {
  const id = path.slice(path.lastIndexOf('/') + 1, -'.webp'.length);
  AVATARS[id] = url;
}

export function operatorAvatarUrl(id: string): string | undefined {
  return AVATARS[id];
}
