# 黑流树海开局随机器 v2（希望约束）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在现有 v1 随机器上加入「希望」硬约束：随机结果总希望消耗不超过初始希望，纳入分队减免与机械师减免，去掉星级筛选改为「随机券位顺序 + 尽量高星」。

**Architecture:** 提取脚本补子职业/希望消耗/减免数据 → 重写随机逻辑（硬约束 + 尽量高星）→ 前端去掉星级筛选、显示希望消耗。

**Tech Stack:** Vue 3 + Vite + TS + Vitest；提取脚本无依赖 Node ESM。

**Spec:** `docs/superpowers/specs/2026-08-20-rogue-start-randomizer-design.md`

## 已核实的数据事实（实现依据）

- 初始希望 6；后勤分队（`rogue_6_band_4`）`initialHopeBonus = 2`
- 希望消耗（开局，1 起始星级）：六星 6、五星 2、四星及以下 0
- 分队招募减免（`relics.*.buffs[recruit_cost]`，rarity TIER_4/5/6，即 4 星+，delta -2）：
  - band_8 突击：PIONEER/WARRIOR；band_9 堡垒：TANK/SUPPORT；band_10 远程：MEDIC/SNIPER；band_11 破坏：CASTER/SPECIAL
  - band_12 高台：MEDIC/SNIPER/CASTER/SUPPORT；band_13 地面：PIONEER/WARRIOR/TANK/SPECIAL
  - band_14 本源（`recruit_cost_sub_profession`）：子职业 primcaster/primprotector/primguard/ritualist
- 机械师（`char_4230_mcnist`，六星重装）：`charDiscount = -4`（数据 `relics.rogue_6_somaster_3.buffs[recruit_cost_char].delta = -4`）
- 干员池：`character_table.json` 中「8 大职业 ∧ 非 TOKEN/TRAP ∧ `isNotObtainable === false` ∧ rarity ∈ [2,5]（3-6 星）」
- 子职业中文名：primcaster=本源术师、primprotector=本源铁卫、primguard=本源近卫、ritualist=巫役

---

### Task 1: 更新数据提取核心（TDD）

**Files:**
- Modify: `scripts/lib/extract-core.mjs`
- Test: `tests/extract-core.test.mjs`（更新）

- [ ] **Step 1: 更新测试**（替换 `extractOperators` 用例，`extractSquads`/`extractRecruitGroups` 用例保留但需更新 fixtures）

`extractOperators` 新用例（fixture 增加 `subProfessionId`，加入机械师）：

```js
const fakeCharTable = {
  char_a: { name: '六星近卫', profession: 'WARRIOR', subProfessionId: 'lord', rarity: 5, isNotObtainable: false },
  char_b: { name: '三星先锋', profession: 'PIONEER', subProfessionId: 'pioneer', rarity: 2, isNotObtainable: false },
  char_c: { name: '二星小车', profession: 'MEDIC', subProfessionId: 'physician', rarity: 0, isNotObtainable: false },
  char_d: { name: '预备干员', profession: 'CASTER', subProfessionId: 'corecaster', rarity: 2, isNotObtainable: true },
  char_4230_mcnist: { name: '机械师', profession: 'TANK', subProfessionId: 'shotprotector', rarity: 5, isNotObtainable: false },
};

describe('extractOperators', () => {
  it('过滤非8大职业/不可获得/3星以下，补子职业与希望消耗', () => {
    const ops = extractOperators(fakeCharTable);
    expect(ops).toEqual([
      { id: 'char_4230_mcnist', name: '机械师', profession: 'TANK', subProfession: 'shotprotector', rarity: 6, hopeCost: 6, charDiscount: -4 },
      { id: 'char_a', name: '六星近卫', profession: 'WARRIOR', subProfession: 'lord', rarity: 6, hopeCost: 6, charDiscount: 0 },
      { id: 'char_b', name: '三星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 3, hopeCost: 0, charDiscount: 0 },
    ]);
  });
});
```

`extractSquads` 新用例：fixture 增加 `relics`，断言 `initialHopeBonus` 与 `recruitDiscount`。

- [ ] **Step 2: 运行测试确认失败**
- [ ] **Step 3: 实现 `scripts/lib/extract-core.mjs`**

```js
export const ALL_CLASSES = ['PIONEER', 'WARRIOR', 'TANK', 'SNIPER', 'CASTER', 'MEDIC', 'SUPPORT', 'SPECIAL'];
export const CLASS_CN = { /* 不变 */ };
export const SUB_PROFESSION_CN = { primcaster: '本源术师', primprotector: '本源铁卫', primguard: '本源近卫', ritualist: '巫役' };

// 开局招募希望消耗（1 起始星级）
const HOPE_COST = { 3: 0, 4: 0, 5: 2, 6: 6 };
const MECHANIST_ID = 'char_4230_mcnist';
const MECHANIST_DISCOUNT = -4;

// 分队初始希望加成
const SQUAD_HOPE_BONUS = { rogue_6_band_4: 2 };
// 分队招募减免（4星+，-2）
const SQUAD_DISCOUNT = {
  rogue_6_band_8: { professions: ['PIONEER', 'WARRIOR'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_9: { professions: ['TANK', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_10: { professions: ['MEDIC', 'SNIPER'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_11: { professions: ['CASTER', 'SPECIAL'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_12: { professions: ['MEDIC', 'SNIPER', 'CASTER', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_13: { professions: ['PIONEER', 'WARRIOR', 'TANK', 'SPECIAL'], subProfessions: null, minRarity: 4, delta: -2 },
  rogue_6_band_14: { professions: null, subProfessions: ['primcaster', 'primprotector', 'primguard', 'ritualist'], minRarity: 4, delta: -2 },
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
    .sort((a, b) => Number(a.id.split('_').pop()) - Number(b.id.split('_').pop()));
}

export function extractRecruitGroups(topicDetail) { /* 不变 */ }

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
```

- [ ] **Step 4: 运行测试通过**
- [ ] **Step 5: Commit** `feat: 提取脚本补希望消耗与减免数据`

---

### Task 2: 重新生成数据

- [ ] **Step 1:** `npm run extract -- /d/project/ArknightsGameResource`，重新生成 `src/data/rogue-data.json`
- [ ] **Step 2:** 抽查：分队含 `initialHopeBonus`/`recruitDiscount`，机械师 `charDiscount:-4`、`hopeCost:6`，干员含 `subProfession`
- [ ] **Step 3: Commit** `chore: 重新生成含希望字段的数据`

---

### Task 3: 更新类型与常量（TDD）

**Files:**
- Modify: `src/lib/types.ts`、`src/lib/constants.ts`
- Test: 无独立测试（类型改动由后续 roll 测试覆盖），但需 typecheck

- [ ] **Step 1:** `types.ts` 更新：

```ts
export interface RecruitDiscount {
  professions: string[] | null;
  subProfessions: string[] | null;
  minRarity: number;
  delta: number;
}
export interface Squad { id; name; desc; unlockCond; initialHopeBonus: number; recruitDiscount: RecruitDiscount | null; }
export interface Operator { id; name; profession; subProfession: string; rarity; hopeCost: number; charDiscount: number; }
export interface RollSettings { withOperators: boolean; excludes: string[]; }  // 去掉 rarities
export interface SlotResult { slot; operator; hopeCost: number; empty: boolean; }
export interface RollResult { squad; group; initialHope: number; slots: SlotResult[]; }
```

- [ ] **Step 2:** `constants.ts` 增加 `SUB_PROFESSION_CN`（与 extract-core 保持一致）
- [ ] **Step 3: Commit** `feat: 类型与常量加入希望/子职业`

---

### Task 4: 重写随机逻辑（TDD）

**Files:**
- Modify: `src/lib/roll.ts`
- Test: `tests/roll.test.ts`（重写）

- [ ] **Step 1: 写测试**（覆盖：希望消耗计算、硬约束、尽量高星、随机券位顺序、分队减免、机械师减免、空池）

```ts
import { describe, expect, it } from 'vitest';
import { effectiveHopeCost, rollStart, pickOne } from '../src/lib/roll';
import type { Operator, RecruitSlot, RollSettings, Squad, Theme } from '../src/lib/types';

const squad: Squad = { id: 'b1', name: '普通分队', desc: '', unlockCond: null, initialHopeBonus: 0, recruitDiscount: null };
const fortressSquad: Squad = { ...squad, id: 'b9', name: '堡垒战术分队', recruitDiscount: { professions: ['TANK', 'SUPPORT'], subProfessions: null, minRarity: 4, delta: -2 } };
const hopeSquad: Squad = { ...squad, id: 'b4', name: '后勤分队', initialHopeBonus: 2 };

const theme: Theme = {
  id: 'rogue_6', name: '沉沦者的黑流树海',
  squads: [squad, fortressSquad, hopeSquad],
  recruitGroups: [{ id: 'g1', name: '先手必胜', desc: '', slots: [{ classes: ['PIONEER'], rarityCap: null }, { classes: ['SNIPER'], rarityCap: null }] }],
};

const operators: Operator[] = [
  { id: 'c1', name: '六星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 6, hopeCost: 6, charDiscount: 0 },
  { id: 'c2', name: '三星先锋', profession: 'PIONEER', subProfession: 'pioneer', rarity: 3, hopeCost: 0, charDiscount: 0 },
  { id: 'c3', name: '六星重装', profession: 'TANK', subProfession: 'protector', rarity: 6, hopeCost: 6, charDiscount: 0 },
  { id: 'm1', name: '机械师', profession: 'TANK', subProfession: 'shotprotector', rarity: 6, hopeCost: 6, charDiscount: -4 },
  { id: 'c4', name: '五星狙击', profession: 'SNIPER', subProfession: 'fastshot', rarity: 5, hopeCost: 2, charDiscount: 0 },
  { id: 'c5', name: '四星狙击', profession: 'SNIPER', subProfession: 'fastshot', rarity: 4, hopeCost: 0, charDiscount: 0 },
];

const settings: RollSettings = { withOperators: true, excludes: [] };

describe('effectiveHopeCost', () => {
  it('基础消耗', () => {
    expect(effectiveHopeCost(operators[0], squad)).toBe(6);   // 六星
    expect(effectiveHopeCost(operators[4], squad)).toBe(2);   // 五星
    expect(effectiveHopeCost(operators[5], squad)).toBe(0);   // 四星
  });
  it('分队职业减免', () => {
    expect(effectiveHopeCost(operators[2], fortressSquad)).toBe(4);  // 六星重装 6-2
  });
  it('机械师减免', () => {
    expect(effectiveHopeCost(operators[3], squad)).toBe(2);          // 6-4
    expect(effectiveHopeCost(operators[3], fortressSquad)).toBe(0);  // 6-4-2
  });
  it('下限为0', () => {
    expect(effectiveHopeCost(operators[4], squad)).toBe(2);
  });
});

describe('rollStart', () => {
  it('硬约束：总消耗不超过初始希望 6', () => {
    // 随机 100 次，统计最大消耗
    for (let i = 0; i < 100; i++) {
      const r = rollStart(theme, operators, settings);
      const total = r.slots.reduce((s, sl) => s + sl.hopeCost, 0);
      expect(total).toBeLessThanOrEqual(r.initialHope);
    }
  });
  it('尽量高星：预算 6 时第一个随机券位选六星', () => {
    // rng 控制分队=普通(0)、组合=唯一(0)、券位顺序
    const r = rollStart(theme, operators, settings, seqRng([0, 0, 0, 0, 0]));
    // 第一个券位（先锋）预算6，最高星是六星先锋 c1
    expect(r.slots[0].operator?.id).toBe('c1');
    expect(r.slots[1].operator?.id).toBe('c5'); // 剩余0，四星狙击
  });
  it('后勤分队初始希望 +2', () => {
    const r = rollStart(theme, operators, settings, seqRng([0.5, 0, 0, 0, 0, 0]));
    expect(r.squad.id).toBe('b4');
    expect(r.initialHope).toBe(8);
  });
});
```

（`seqRng` 辅助函数需在测试里定义；券位顺序的随机用 rng 控制。）

- [ ] **Step 2: 运行测试失败**
- [ ] **Step 3: 实现 `roll.ts`**

```ts
import type { Operator, RecruitSlot, RollResult, RollSettings, SlotResult, Squad, Theme } from './types';

export type Rng = () => number;

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: 数组为空');
  return items[Math.min(Math.floor(rng() * items.length), items.length - 1)];
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function effectiveHopeCost(operator: Operator, squad: Squad): number {
  let cost = operator.hopeCost + operator.charDiscount;
  const d = squad.recruitDiscount;
  if (d && operator.rarity >= d.minRarity) {
    const match = (d.professions && d.professions.includes(operator.profession)) ||
      (d.subProfessions && d.subProfessions.includes(operator.subProfession));
    if (match) cost += d.delta;
  }
  return Math.max(0, cost);
}

function buildPool(operators, slot, settings, squad, budget) {
  return operators.filter((o) =>
    slot.classes.includes(o.profession) &&
    !settings.excludes.includes(o.id) &&
    effectiveHopeCost(o, squad) <= budget
  );
}

function rollSlot(slot, operators, settings, squad, budget, rng): SlotResult {
  if (!settings.withOperators) return { slot, operator: null, hopeCost: 0, empty: false };
  const pool = buildPool(operators, slot, settings, squad, budget);
  if (pool.length === 0) return { slot, operator: null, hopeCost: 0, empty: true };
  const maxRarity = Math.max(...pool.map((o) => o.rarity));
  const topTier = pool.filter((o) => o.rarity === maxRarity);
  const operator = pickOne(topTier, rng);
  return { slot, operator, hopeCost: effectiveHopeCost(operator, squad), empty: false };
}

const BASE_HOPE = 6;

export function rollStart(theme, operators, settings, rng = Math.random): RollResult {
  const squad = pickOne(theme.squads, rng);
  const group = pickOne(theme.recruitGroups, rng);
  const initialHope = BASE_HOPE + squad.initialHopeBonus;
  const order = shuffle(group.slots.map((_, i) => i), rng);
  const results = new Array(group.slots.length);
  let remaining = initialHope;
  for (const i of order) {
    const r = rollSlot(group.slots[i], operators, settings, squad, remaining, rng);
    results[i] = r;
    if (r.operator) remaining -= r.hopeCost;
  }
  return { squad, group, initialHope, slots: results };
}

export function rerollSquad(theme, rng = Math.random): Squad { return pickOne(theme.squads, rng); }
export function rerollSlot(slot, operators, settings, squad, budget, rng = Math.random): SlotResult {
  return rollSlot(slot, operators, settings, squad, budget, rng);
}
```

- [ ] **Step 4: 运行测试通过**
- [ ] **Step 5: Commit** `feat: 希望硬约束随机逻辑（尽量高星+随机券位）`

---

### Task 5: 更新设置（TDD）

- [ ] **Step 1:** `settings.ts` 去掉 rarities，`DEFAULT_SETTINGS = { withOperators: true, excludes: [] }`；`loadSettings` 去掉 rarities 校验
- [ ] **Step 2:** 更新 `tests/settings.test.ts` 去掉 rarities 相关用例
- [ ] **Step 3: Commit** `feat: 设置去掉星级筛选`

---

### Task 6: 更新数据校验

- [ ] **Step 1:** `data.ts` 增加对 `operators[].subProfession`/`hopeCost`、`squads[].initialHopeBonus` 的薄校验（可选，或仅更新类型）
- [ ] **Step 2: Commit**

---

### Task 7: 更新前端组件

- [ ] **Step 1:** `SettingsPanel.vue` 去掉星级勾选（RARITY_OPTIONS/toggleRarity），保留「随机具体干员」开关 + 排除名单
- [ ] **Step 2:** `RecruitSlots.vue` 显示每个券位的希望消耗（`hopeCost`）
- [ ] **Step 3:** `App.vue` 显示初始希望（`result.initialHope`），重摇逻辑适配新签名（rerollSlot 需传 squad 和 budget）
- [ ] **Step 4:** 手动冒烟 + typecheck + build
- [ ] **Step 5: Commit** `feat: 前端显示希望消耗并去掉星级筛选`

---

### Task 8: 全量验证与收尾

- [ ] **Step 1:** `npm run typecheck && npm test && npm run build` 全绿
- [ ] **Step 2:** 更新 README（如有需要）
- [ ] **Step 3: Commit**
