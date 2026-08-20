export interface RecruitDiscount {
  professions: string[] | null;
  subProfessions: string[] | null;
  minRarity: number;
  delta: number;
}

export interface Squad {
  id: string;
  name: string;
  desc: string;
  unlockCond: string | null;
  initialHopeBonus: number;
  recruitDiscount: RecruitDiscount | null;
}

export interface RecruitSlot {
  classes: string[];
  rarityCap: number | null;
}

export interface RecruitGroup {
  id: string;
  name: string;
  desc: string;
  slots: RecruitSlot[];
}

export interface Theme {
  id: string;
  name: string;
  squads: Squad[];
  recruitGroups: RecruitGroup[];
}

export interface Operator {
  id: string;
  name: string;
  profession: string;
  subProfession: string;
  rarity: number;
  hopeCost: number;
  charDiscount: number;
}

export interface GameData {
  generatedAt: string;
  themes: Theme[];
  operators: Operator[];
}

/** 随机范围按这三个星级分别设置；3 星及以下不受范围限制，始终可随机 */
export const POOL_RARITIES = [6, 5, 4] as const;

export interface RollSettings {
  withOperators: boolean;
  /** 随机范围（白名单）：按星级存放允许随机的干员 id，仅约束 4/5/6 星 */
  pool: Record<number, string[]>;
}

export interface SlotResult {
  slot: RecruitSlot;
  operator: Operator | null;
  /** 该券位实际消耗的希望 */
  hopeCost: number;
  /** 开了干员随机但过滤后池子为空 */
  empty: boolean;
}

export interface RollResult {
  squad: Squad;
  group: RecruitGroup;
  initialHope: number;
  slots: SlotResult[];
}
