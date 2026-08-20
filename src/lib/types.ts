export interface Squad {
  id: string;
  name: string;
  desc: string;
  unlockCond: string | null;
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
  rarity: number;
}

export interface GameData {
  generatedAt: string;
  themes: Theme[];
  operators: Operator[];
}

export interface RollSettings {
  withOperators: boolean;
  rarities: number[];
  excludes: string[];
}

export interface SlotResult {
  slot: RecruitSlot;
  operator: Operator | null;
  /** 开了干员随机但过滤后池子为空 */
  empty: boolean;
}

export interface RollResult {
  squad: Squad;
  group: RecruitGroup;
  slots: SlotResult[];
}
