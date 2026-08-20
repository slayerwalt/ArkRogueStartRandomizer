import rogue1 from '../assets/themes/rogue_1.webp';
import rogue2 from '../assets/themes/rogue_2.webp';
import rogue3 from '../assets/themes/rogue_3.webp';
import rogue4 from '../assets/themes/rogue_4.webp';
import rogue5 from '../assets/themes/rogue_5.webp';
import rogue6 from '../assets/themes/rogue_6.webp';
import rogue1Wide from '../assets/themes/rogue_1_21_9.webp';
import rogue2Wide from '../assets/themes/rogue_2_21_9.webp';
import rogue3Wide from '../assets/themes/rogue_3_21_9.webp';
import rogue4Wide from '../assets/themes/rogue_4_21_9.webp';
import rogue5Wide from '../assets/themes/rogue_5_21_9.webp';
import rogue6Wide from '../assets/themes/rogue_6_21_9.webp';
import band1 from '../assets/squads/rogue_6_band_1.webp';
import band3 from '../assets/squads/rogue_6_band_3.webp';
import band4 from '../assets/squads/rogue_6_band_4.webp';
import band6 from '../assets/squads/rogue_6_band_6.webp';
import band8 from '../assets/squads/rogue_6_band_8.webp';
import band9 from '../assets/squads/rogue_6_band_9.webp';
import band10 from '../assets/squads/rogue_6_band_10.webp';
import band11 from '../assets/squads/rogue_6_band_11.webp';
import band12 from '../assets/squads/rogue_6_band_12.webp';
import band13 from '../assets/squads/rogue_6_band_13.webp';
import band14 from '../assets/squads/rogue_6_band_14.webp';
import band15 from '../assets/squads/rogue_6_band_15.webp';
import band17 from '../assets/squads/rogue_6_band_17.webp';
import band19 from '../assets/squads/rogue_6_band_19.webp';
import band21 from '../assets/squads/rogue_6_band_21.webp';

export interface RogueThemeEntry {
  /** 与 rogue-data.json 中主题 id 对应（rogue_6 即黑流树海） */
  id: string;
  name: string;
  /** 整页模糊背景用图 */
  banner: string;
  /** 页面上的 21:9 长版展示图 */
  showcase: string;
  /** 开局随机是否已开放；未开放的主题只展示展示图与占位提示 */
  available: boolean;
}

export const ROGUE_THEMES: RogueThemeEntry[] = [
  { id: 'rogue_1', name: '傀影与猩红孤钻', banner: rogue1, showcase: rogue1Wide, available: false },
  { id: 'rogue_2', name: '水月与深蓝之树', banner: rogue2, showcase: rogue2Wide, available: false },
  { id: 'rogue_3', name: '探索者的银凇止境', banner: rogue3, showcase: rogue3Wide, available: false },
  { id: 'rogue_4', name: '萨卡兹的无终奇语', banner: rogue4, showcase: rogue4Wide, available: false },
  { id: 'rogue_5', name: '岁的界园志异', banner: rogue5, showcase: rogue5Wide, available: false },
  { id: 'rogue_6', name: '沉沦者的黑流树海', banner: rogue6, showcase: rogue6Wide, available: true },
];

/** 分队图标（来自路标档案馆的黑流树海档案），按分队 id 索引；无图标的分队返回 undefined */
const SQUAD_ICONS: Record<string, string> = {
  rogue_6_band_1: band1,
  rogue_6_band_3: band3,
  rogue_6_band_4: band4,
  rogue_6_band_6: band6,
  rogue_6_band_8: band8,
  rogue_6_band_9: band9,
  rogue_6_band_10: band10,
  rogue_6_band_11: band11,
  rogue_6_band_12: band12,
  rogue_6_band_13: band13,
  rogue_6_band_14: band14,
  rogue_6_band_15: band15,
  rogue_6_band_17: band17,
  rogue_6_band_19: band19,
  rogue_6_band_21: band21,
};

export function squadIcon(id: string): string | undefined {
  return SQUAD_ICONS[id];
}
