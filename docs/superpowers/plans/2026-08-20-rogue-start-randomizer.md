# 黑流树海开局随机器 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做一个 Vue 3 静态网页：随机黑流树海（rogue_6）的开局分队与招募组合，可选按券位职业随机具体干员，支持稀有度筛选、手动排除、单项重摇。

**Architecture:** Node.js 提取脚本从本地 ArknightsGameResource 仓库提取 `rogue_6` 主题数据（分队 / 招募组合 / 干员）生成 `src/data/rogue-data.json`；Vue 3 + Vite 纯静态前端打包该 JSON，无后端。

**Tech Stack:** Vue 3 + Vite + TypeScript + Vitest；提取脚本为无依赖 Node.js (ESM)。

**Spec:** `docs/superpowers/specs/2026-08-20-rogue-start-randomizer-design.md`

## 已核实的数据事实（实现依据）

以下事实已在规划阶段从真实数据验证，不要随意改动：

- 数据文件：`<仓库>/gamedata/excel/roguelike_topic_table.json`、`character_table.json`
- 黑流树海主题 id = `rogue_6`，分队数据在 `details.rogue_6.bandRef`（`itemId === normalBandId` 的条目是基础分队，共 15 个），名称/效果/解锁条件在 `details.rogue_6.items[bandId]` 的 `name` / `usage` / `unlockCondDesc`
- 开局招募组合 id 在 `details.rogue_6.init` 中 `modeGrade === 0` 条目的 `initialRecruitGroup`（6 个），组合名称/描述在 `details.rogue_6.recruitGrps`
- 组合 → 券位职业的关联在数据中**不存在**（客户端逻辑），因此提取脚本内置 `GROUP_SLOTS` 配置并用组合描述文本做校验（见 Task 2）
- 干员：`character_table.json` 每条含 `name`、`profession`（8 大职业 + TOKEN/TRAP）、`rarity`（**0 起始**，5 = 6 星）、`isNotObtainable`
- 干员池过滤规则：职业属于 8 大职业、`isNotObtainable === false`、`rarity >= 2`（即 3 星及以上）

## 文件结构

```
scripts/extract.mjs              # 提取脚本入口（IO + 校验 + 写 JSON）
scripts/lib/extract-core.mjs     # 提取纯逻辑（可单测）
src/data/rogue-data.json         # 生成的数据（提交进仓库）
src/lib/types.ts                 # 全部类型定义
src/lib/constants.ts             # 职业中文名映射
src/lib/roll.ts                  # 随机逻辑（纯函数，可单测）
src/lib/settings.ts              # 设置持久化（纯函数 + StorageLike，可单测）
src/lib/data.ts                  # 数据校验（可单测）
src/components/SettingsPanel.vue # 折叠设置区
src/components/SquadCard.vue     # 分队结果卡
src/components/RecruitSlots.vue  # 招募组合 + 券位列表
src/App.vue                      # 页面组装与状态
src/main.ts, src/style.css, index.html
tests/roll.test.ts
tests/settings.test.ts
tests/data.test.ts
tests/extract-core.test.mjs
```

---

### Task 1: 项目脚手架

目录不是空的（已有 `docs/`、`.gitignore`），所以手动搭建，不用 `npm create`。

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.vue`（占位）
- Create: `src/style.css`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "rogue-start-random",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "vue-tsc --noEmit",
    "test": "vitest run",
    "extract": "node scripts/extract.mjs"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install vue
npm install -D vite @vitejs/plugin-vue typescript vue-tsc vitest
```

- [ ] **Step 3: 创建 vite.config.ts**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts"]
}
```

- [ ] **Step 5: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>黑流树海开局随机器</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: 创建 src/main.ts**

```ts
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
```

- [ ] **Step 7: 创建占位 src/App.vue**

```vue
<template>
  <h1>黑流树海开局随机器</h1>
</template>
```

- [ ] **Step 8: 创建 src/style.css**

```css
:root {
  color-scheme: dark;
}

body {
  margin: 0;
  background: #16181d;
  color: #e8e6e3;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

#app {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
}
```

- [ ] **Step 9: 验证构建与类型检查通过**

Run: `npm run build && npm run typecheck`
Expected: 均成功退出（exit code 0），`dist/` 生成

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src/
git commit -m "chore: Vue3+Vite+TS 项目脚手架"
```

---

### Task 2: 提取脚本核心逻辑（TDD）

**Files:**
- Create: `scripts/lib/extract-core.mjs`
- Test: `tests/extract-core.test.mjs`

- [ ] **Step 1: 写失败的测试 `tests/extract-core.test.mjs`**

```js
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
});

describe('extractOperators', () => {
  it('过滤非8大职业/不可获得/3星以下，稀有度转为1起始', () => {
    const ops = extractOperators(fakeCharTable);
    expect(ops).toEqual([
      { id: 'char_a', name: '六星近卫', profession: 'WARRIOR', rarity: 6 },
      { id: 'char_b', name: '三星先锋', profession: 'PIONEER', rarity: 3 },
    ]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/extract-core.test.mjs`
Expected: FAIL（找不到模块 `../scripts/lib/extract-core.mjs`）

- [ ] **Step 3: 实现 `scripts/lib/extract-core.mjs`**

```js
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
      return { id: r.itemId, name: item.name, desc: item.usage, unlockCond: item.unlockCondDesc ?? null };
    })
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
      slots: slots.map((s) => ({ classes: s.classes, rarityCap: s.rarityCap ?? null })),
    };
  });
}

export function extractOperators(charTable) {
  return Object.entries(charTable)
    .filter(([, c]) => ALL_CLASSES.includes(c.profession) && !c.isNotObtainable && c.rarity >= 2)
    .map(([id, c]) => ({ id, name: c.name, profession: c.profession, rarity: c.rarity + 1 }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/extract-core.test.mjs`
Expected: PASS（4 个用例全过）

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/extract-core.mjs tests/extract-core.test.mjs
git commit -m "feat: 数据提取核心逻辑（分队/招募组合/干员）"
```

---

### Task 3: 提取脚本入口并生成真实数据

**Files:**
- Create: `scripts/extract.mjs`
- Create: `src/data/rogue-data.json`（脚本生成）

- [ ] **Step 1: 浅克隆游戏资源仓库（几个 GB，耐心等）**

```bash
git clone --depth 1 https://github.com/yuanyan3060/ArknightsGameResource.git /d/project/ArknightsGameResource
```

（放在项目外的 `D:\project\ArknightsGameResource`，不进本仓库。）

- [ ] **Step 2: 创建 `scripts/extract.mjs`**

```js
import fs from 'node:fs';
import path from 'node:path';
import { extractOperators, extractRecruitGroups, extractSquads } from './lib/extract-core.mjs';

const THEME_ID = 'rogue_6';

const resDir = process.argv[2] ?? process.env.ARKNIGHTS_RES_DIR;
if (!resDir) {
  console.error('用法: npm run extract -- <ArknightsGameResource 仓库路径>');
  process.exit(1);
}

const excelDir = path.join(resDir, 'gamedata', 'excel');
const topic = JSON.parse(fs.readFileSync(path.join(excelDir, 'roguelike_topic_table.json'), 'utf8'));
const charTable = JSON.parse(fs.readFileSync(path.join(excelDir, 'character_table.json'), 'utf8'));

const detail = topic.details?.[THEME_ID];
if (!detail) throw new Error(`主题 ${THEME_ID} 在数据中不存在`);

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  themes: [
    {
      id: THEME_ID,
      name: topic.topics[THEME_ID].name,
      squads: extractSquads(detail),
      recruitGroups: extractRecruitGroups(detail),
    },
  ],
  operators: extractOperators(charTable),
};

const theme = data.themes[0];
if (theme.squads.length === 0 || theme.recruitGroups.length === 0 || data.operators.length === 0) {
  throw new Error('提取结果为空，请检查数据文件是否完整');
}

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/rogue-data.json', JSON.stringify(data, null, 2));
console.log(`主题: ${theme.name}`);
console.log(`分队: ${theme.squads.length} 个，招募组合: ${theme.recruitGroups.length} 个，干员: ${data.operators.length} 名`);
```

- [ ] **Step 3: 运行提取脚本生成真实数据**

Run: `npm run extract -- /d/project/ArknightsGameResource`
Expected 输出：`主题: 沉沦者的黑流树海` / `分队: 15 个，招募组合: 6 个，干员: 400+ 名`

- [ ] **Step 4: 抽查生成的 JSON**

Run: `node -e "const d=require('./src/data/rogue-data.json'); console.log(d.themes[0].squads.map(s=>s.name).join('、')); console.log(d.themes[0].recruitGroups.map(g=>g.name).join('、'))"`
Expected: 包含「指挥分队」「突击战术分队」「本源研修分队」等；组合包含「先手必胜」「随心所欲」

- [ ] **Step 5: Commit**

```bash
git add scripts/extract.mjs src/data/rogue-data.json
git commit -m "feat: 提取脚本入口 + 黑流树海真实数据"
```

---

### Task 4: 类型定义与随机逻辑（TDD）

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`
- Create: `src/lib/roll.ts`
- Test: `tests/roll.test.ts`

- [ ] **Step 1: 创建 `src/lib/types.ts`**

```ts
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
```

- [ ] **Step 2: 创建 `src/lib/constants.ts`**

```ts
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
```

- [ ] **Step 3: 写失败的测试 `tests/roll.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildPool, pickOne, rerollSlot, rollSlotOperator, rollStart, type Rng } from '../src/lib/roll';
import type { Operator, RecruitSlot, RollSettings, Theme } from '../src/lib/types';

const theme: Theme = {
  id: 'rogue_6',
  name: '沉沦者的黑流树海',
  squads: [
    { id: 'b1', name: '指挥分队', desc: '', unlockCond: null },
    { id: 'b2', name: '后勤分队', desc: '', unlockCond: null },
  ],
  recruitGroups: [
    {
      id: 'g1',
      name: '先手必胜',
      desc: '',
      slots: [
        { classes: ['PIONEER'], rarityCap: null },
        { classes: ['SNIPER'], rarityCap: null },
      ],
    },
    { id: 'g2', name: '随心所欲', desc: '', slots: [{ classes: ['PIONEER', 'WARRIOR'], rarityCap: 5 }] },
  ],
};

const operators: Operator[] = [
  { id: 'c1', name: '三星先锋', profession: 'PIONEER', rarity: 3 },
  { id: 'c2', name: '六星先锋', profession: 'PIONEER', rarity: 6 },
  { id: 'c3', name: '五星狙击', profession: 'SNIPER', rarity: 5 },
  { id: 'c4', name: '六星近卫', profession: 'WARRIOR', rarity: 6 },
  { id: 'c5', name: '五星近卫', profession: 'WARRIOR', rarity: 5 },
];

const baseSettings: RollSettings = { withOperators: true, rarities: [3, 4, 5, 6], excludes: [] };

/** 依次返回给定数值的伪随机源，超出后重复最后一个 */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('pickOne', () => {
  it('按 rng 值取元素', () => {
    expect(pickOne(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pickOne(['a', 'b', 'c'], () => 0.999)).toBe('c');
  });
  it('空数组抛错', () => {
    expect(() => pickOne([], () => 0)).toThrow();
  });
});

describe('buildPool', () => {
  const slot: RecruitSlot = { classes: ['PIONEER'], rarityCap: null };

  it('按职业过滤', () => {
    expect(buildPool(operators, slot, baseSettings).map((o) => o.id)).toEqual(['c1', 'c2']);
  });
  it('按稀有度勾选过滤', () => {
    const s = { ...baseSettings, rarities: [6] };
    expect(buildPool(operators, slot, s).map((o) => o.id)).toEqual(['c2']);
  });
  it('按排除名单过滤', () => {
    const s = { ...baseSettings, excludes: ['c2'] };
    expect(buildPool(operators, slot, s).map((o) => o.id)).toEqual(['c1']);
  });
  it('rarityCap 限制最高星级', () => {
    const capped: RecruitSlot = { classes: ['WARRIOR'], rarityCap: 5 };
    expect(buildPool(operators, capped, baseSettings).map((o) => o.id)).toEqual(['c5']);
  });
});

describe('rollSlotOperator', () => {
  it('单职业券位从池中随机', () => {
    const slot: RecruitSlot = { classes: ['SNIPER'], rarityCap: null };
    expect(rollSlotOperator(operators, slot, baseSettings, () => 0)?.id).toBe('c3');
  });
  it('多职业券位先随机职业再随机干员', () => {
    const slot: RecruitSlot = { classes: ['PIONEER', 'WARRIOR'], rarityCap: null };
    // rng 第1次 0.999 → 职业 WARRIOR；第2次 0 → 该职业池第一个（c4 或 c5，按过滤顺序）
    const op = rollSlotOperator(operators, slot, baseSettings, seqRng([0.999, 0]));
    expect(op?.profession).toBe('WARRIOR');
  });
  it('池为空返回 null', () => {
    const slot: RecruitSlot = { classes: ['SNIPER'], rarityCap: null };
    const s = { ...baseSettings, excludes: ['c3'] };
    expect(rollSlotOperator(operators, slot, s, () => 0)).toBeNull();
  });
});

describe('rollStart', () => {
  it('关闭干员随机时券位不带干员', () => {
    const s = { ...baseSettings, withOperators: false };
    const r = rollStart(theme, operators, s, () => 0);
    expect(r.squad.id).toBe('b1');
    expect(r.group.id).toBe('g1');
    expect(r.slots).toHaveLength(2);
    expect(r.slots.every((sl) => sl.operator === null && sl.empty === false)).toBe(true);
  });
  it('开启干员随机时每个券位带干员', () => {
    const r = rollStart(theme, operators, baseSettings, () => 0);
    expect(r.slots[0].operator?.profession).toBe('PIONEER');
    expect(r.slots[1].operator?.profession).toBe('SNIPER');
  });
  it('某券位池空时标记 empty，不影响其他券位', () => {
    const s = { ...baseSettings, excludes: ['c1', 'c2'] }; // 先锋全排除
    const r = rollStart(theme, operators, s, () => 0);
    expect(r.slots[0].empty).toBe(true);
    expect(r.slots[0].operator).toBeNull();
    expect(r.slots[1].empty).toBe(false);
  });
});

describe('rerollSlot', () => {
  it('保留原券位配置，只重抽干员', () => {
    const slot: RecruitSlot = { classes: ['PIONEER'], rarityCap: null };
    const r = rerollSlot(slot, operators, baseSettings, () => 0.999);
    expect(r.slot).toBe(slot);
    expect(r.operator?.id).toBe('c2');
  });
});
```

- [ ] **Step 4: 运行测试确认失败**

Run: `npx vitest run tests/roll.test.ts`
Expected: FAIL（找不到模块 `../src/lib/roll`）

- [ ] **Step 5: 实现 `src/lib/roll.ts`**

```ts
import type { Operator, RecruitSlot, RollResult, RollSettings, SlotResult, Squad, Theme } from './types';

export type Rng = () => number;

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  if (items.length === 0) throw new Error('pickOne: 数组为空');
  return items[Math.floor(rng() * items.length)];
}

export function buildPool(
  operators: readonly Operator[],
  slot: RecruitSlot,
  settings: RollSettings,
): Operator[] {
  return operators.filter(
    (o) =>
      slot.classes.includes(o.profession) &&
      settings.rarities.includes(o.rarity) &&
      (slot.rarityCap === null || o.rarity <= slot.rarityCap) &&
      !settings.excludes.includes(o.id),
  );
}

/** 多职业券位先均匀随机职业、再从该职业池随机（模拟游戏内先抽券种）；池空返回 null */
export function rollSlotOperator(
  operators: readonly Operator[],
  slot: RecruitSlot,
  settings: RollSettings,
  rng: Rng,
): Operator | null {
  const classes = slot.classes.length > 1 ? [pickOne(slot.classes, rng)] : slot.classes;
  const pool = buildPool(operators, { ...slot, classes }, settings);
  if (pool.length === 0) return null;
  return pickOne(pool, rng);
}

function rollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng,
): SlotResult {
  if (!settings.withOperators) return { slot, operator: null, empty: false };
  const operator = rollSlotOperator(operators, slot, settings, rng);
  return { slot, operator, empty: operator === null };
}

export function rollStart(
  theme: Theme,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng = Math.random,
): RollResult {
  const squad = pickOne(theme.squads, rng);
  const group = pickOne(theme.recruitGroups, rng);
  return {
    squad,
    group,
    slots: group.slots.map((slot) => rollSlot(slot, operators, settings, rng)),
  };
}

export function rerollSquad(theme: Theme, rng: Rng = Math.random): Squad {
  return pickOne(theme.squads, rng);
}

export function rerollSlot(
  slot: RecruitSlot,
  operators: readonly Operator[],
  settings: RollSettings,
  rng: Rng = Math.random,
): SlotResult {
  return rollSlot(slot, operators, settings, rng);
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run tests/roll.test.ts`
Expected: PASS（13 个用例全过）

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/constants.ts src/lib/roll.ts tests/roll.test.ts
git commit -m "feat: 类型定义与开局随机逻辑"
```

---

### Task 5: 设置持久化（TDD）

**Files:**
- Create: `src/lib/settings.ts`
- Test: `tests/settings.test.ts`

- [ ] **Step 1: 写失败的测试 `tests/settings.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_KEY, type StorageLike } from '../src/lib/settings';

function memStorage(initial: Record<string, string> = {}): StorageLike & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
}

const validIds = new Set(['c1', 'c2']);

describe('loadSettings', () => {
  it('无存储时返回默认设置', () => {
    const { settings, pruned } = loadSettings(memStorage(), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(pruned).toBe(0);
  });
  it('JSON 损坏时返回默认设置', () => {
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: '{oops' }), validIds);
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
  it('剔除数据中不存在的干员并计数', () => {
    const raw = JSON.stringify({ withOperators: false, rarities: [5, 6], excludes: ['c1', 'ghost'] });
    const { settings, pruned } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.withOperators).toBe(false);
    expect(settings.rarities).toEqual([5, 6]);
    expect(settings.excludes).toEqual(['c1']);
    expect(pruned).toBe(1);
  });
  it('非法字段回退默认值', () => {
    const raw = JSON.stringify({ withOperators: 'yes', rarities: [0, 7, 'x', 5], excludes: 'nope' });
    const { settings } = loadSettings(memStorage({ [SETTINGS_KEY]: raw }), validIds);
    expect(settings.withOperators).toBe(DEFAULT_SETTINGS.withOperators);
    expect(settings.rarities).toEqual([5]);
    expect(settings.excludes).toEqual([]);
  });
});

describe('saveSettings', () => {
  it('写入后可完整读回', () => {
    const storage = memStorage();
    const s = { withOperators: false, rarities: [6], excludes: ['c2'] };
    saveSettings(storage, s);
    const { settings } = loadSettings(storage, validIds);
    expect(settings).toEqual(s);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/settings.test.ts`
Expected: FAIL（找不到模块 `../src/lib/settings`）

- [ ] **Step 3: 实现 `src/lib/settings.ts`**

```ts
import type { RollSettings } from './types';

export const SETTINGS_KEY = 'rogue-start-settings';

export const DEFAULT_SETTINGS: RollSettings = {
  withOperators: true,
  rarities: [3, 4, 5, 6],
  excludes: [],
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultSettings(): RollSettings {
  return { ...DEFAULT_SETTINGS, rarities: [...DEFAULT_SETTINGS.rarities], excludes: [] };
}

export function loadSettings(
  storage: StorageLike,
  validOperatorIds: ReadonlySet<string>,
): { settings: RollSettings; pruned: number } {
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return { settings: defaultSettings(), pruned: 0 };
  try {
    const parsed = JSON.parse(raw);
    const settings: RollSettings = {
      withOperators:
        typeof parsed.withOperators === 'boolean' ? parsed.withOperators : DEFAULT_SETTINGS.withOperators,
      rarities: Array.isArray(parsed.rarities)
        ? parsed.rarities.filter((r: unknown) => Number.isInteger(r) && (r as number) >= 1 && (r as number) <= 6)
        : [...DEFAULT_SETTINGS.rarities],
      excludes: Array.isArray(parsed.excludes)
        ? parsed.excludes.filter((id: unknown) => typeof id === 'string')
        : [],
    };
    if (settings.rarities.length === 0) settings.rarities = [...DEFAULT_SETTINGS.rarities];
    const before = settings.excludes.length;
    settings.excludes = settings.excludes.filter((id) => validOperatorIds.has(id));
    return { settings, pruned: before - settings.excludes.length };
  } catch {
    return { settings: defaultSettings(), pruned: 0 };
  }
}

export function saveSettings(storage: StorageLike, settings: RollSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/settings.test.ts`
Expected: PASS（5 个用例全过）

- [ ] **Step 5: Commit**

```bash
git add src/lib/settings.ts tests/settings.test.ts
git commit -m "feat: 设置持久化（localStorage + 容错）"
```

---

### Task 6: 数据校验（TDD）

**Files:**
- Create: `src/lib/data.ts`
- Test: `tests/data.test.ts`

- [ ] **Step 1: 写失败的测试 `tests/data.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { validateGameData } from '../src/lib/data';

const valid = {
  generatedAt: '2026-08-20',
  themes: [
    {
      id: 'rogue_6',
      name: '沉沦者的黑流树海',
      squads: [{ id: 'b1', name: '指挥分队', desc: 'x', unlockCond: null }],
      recruitGroups: [{ id: 'g1', name: '先手必胜', desc: 'x', slots: [{ classes: ['PIONEER'], rarityCap: null }] }],
    },
  ],
  operators: [{ id: 'c1', name: '干员甲', profession: 'PIONEER', rarity: 3 }],
};

describe('validateGameData', () => {
  it('合法数据原样返回', () => {
    expect(validateGameData(valid)).toBe(valid);
  });
  it('缺少主题时报中文错误', () => {
    expect(() => validateGameData({ ...valid, themes: [] })).toThrow(/数据文件/);
  });
  it('缺少干员时报中文错误', () => {
    expect(() => validateGameData({ ...valid, operators: [] })).toThrow(/数据文件/);
  });
  it('主题缺少分队或招募组合时报错', () => {
    const bad = { ...valid, themes: [{ ...valid.themes[0], squads: [] }] };
    expect(() => validateGameData(bad)).toThrow(/分队或招募组合/);
  });
  it('完全非法的输入报错而不是白屏', () => {
    expect(() => validateGameData(null)).toThrow(/数据文件/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/data.test.ts`
Expected: FAIL（找不到模块 `../src/lib/data`）

- [ ] **Step 3: 实现 `src/lib/data.ts`**

```ts
import type { GameData } from './types';

const DATA_ERROR = '数据文件缺失或格式不正确，请先运行数据提取脚本（见 README）';

export function validateGameData(data: unknown): GameData {
  const d = data as GameData | null;
  if (
    !d ||
    !Array.isArray(d.themes) ||
    d.themes.length === 0 ||
    !Array.isArray(d.operators) ||
    d.operators.length === 0
  ) {
    throw new Error(DATA_ERROR);
  }
  const t = d.themes[0];
  if (!Array.isArray(t.squads) || t.squads.length === 0 || !Array.isArray(t.recruitGroups) || t.recruitGroups.length === 0) {
    throw new Error('数据文件缺少分队或招募组合，请重新运行数据提取脚本');
  }
  return d;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/data.test.ts`
Expected: PASS（5 个用例全过）

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.ts tests/data.test.ts
git commit -m "feat: 数据文件加载校验"
```

---

### Task 7: 页面组件与交互

**Files:**
- Create: `src/components/SettingsPanel.vue`
- Create: `src/components/SquadCard.vue`
- Create: `src/components/RecruitSlots.vue`
- Modify: `src/App.vue`（替换占位）
- Modify: `src/style.css`（追加样式）

- [ ] **Step 1: 创建 `src/components/SettingsPanel.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Operator, RollSettings } from '../lib/types';

const props = defineProps<{
  modelValue: RollSettings;
  operators: Operator[];
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RollSettings] }>();

const open = ref(false);
const keyword = ref('');

const RARITY_OPTIONS = [3, 4, 5, 6];

function update(patch: Partial<RollSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

function toggleRarity(r: number) {
  const has = props.modelValue.rarities.includes(r);
  const rarities = has
    ? props.modelValue.rarities.filter((x) => x !== r)
    : [...props.modelValue.rarities, r].sort();
  if (rarities.length === 0) return; // 至少保留一个星级
  update({ rarities });
}

const excludeSet = computed(() => new Set(props.modelValue.excludes));
const excludedOperators = computed(() =>
  props.operators.filter((o) => excludeSet.value.has(o.id)),
);
const searchResults = computed(() => {
  const kw = keyword.value.trim();
  if (!kw) return [];
  return props.operators
    .filter((o) => o.name.includes(kw) && !excludeSet.value.has(o.id))
    .slice(0, 10);
});

function addExclude(id: string) {
  update({ excludes: [...props.modelValue.excludes, id] });
  keyword.value = '';
}

function removeExclude(id: string) {
  update({ excludes: props.modelValue.excludes.filter((x) => x !== id) });
}
</script>

<template>
  <section class="settings">
    <button class="settings-toggle" @click="open = !open">
      ⚙ 随机设置 {{ open ? '▲' : '▼' }}
    </button>
    <div v-if="open" class="settings-body">
      <label class="row">
        <input
          type="checkbox"
          :checked="modelValue.withOperators"
          @change="update({ withOperators: ($event.target as HTMLInputElement).checked })"
        />
        随机具体干员
      </label>
      <div class="row">
        参与随机的星级：
        <label v-for="r in RARITY_OPTIONS" :key="r">
          <input
            type="checkbox"
            :checked="modelValue.rarities.includes(r)"
            @change="toggleRarity(r)"
          />
          {{ r }}星
        </label>
      </div>
      <div class="row exclude-box">
        <div>排除名单（{{ modelValue.excludes.length }}）：</div>
        <input v-model="keyword" placeholder="输入干员名搜索并排除" />
        <ul v-if="searchResults.length" class="search-results">
          <li v-for="o in searchResults" :key="o.id">
            <button @click="addExclude(o.id)">＋ {{ o.name }}（{{ o.rarity }}星）</button>
          </li>
        </ul>
        <div v-if="excludedOperators.length" class="excluded-list">
          <span v-for="o in excludedOperators" :key="o.id" class="excluded-tag">
            {{ o.name }}
            <button @click="removeExclude(o.id)">×</button>
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: 创建 `src/components/SquadCard.vue`**

```vue
<script setup lang="ts">
import type { Squad } from '../lib/types';

defineProps<{ squad: Squad }>();
const emit = defineEmits<{ reroll: [] }>();
</script>

<template>
  <div class="card squad-card">
    <div class="card-title">
      <span class="label">分队</span>
      <button class="reroll" title="重摇分队" @click="emit('reroll')">↻</button>
    </div>
    <div class="squad-name">{{ squad.name }}</div>
    <div class="squad-desc">{{ squad.desc }}</div>
    <div v-if="squad.unlockCond" class="unlock">游戏内解锁条件：{{ squad.unlockCond }}</div>
  </div>
</template>
```

- [ ] **Step 3: 创建 `src/components/RecruitSlots.vue`**

```vue
<script setup lang="ts">
import { CLASS_CN } from '../lib/constants';
import type { RecruitGroup, SlotResult } from '../lib/types';

defineProps<{
  group: RecruitGroup;
  slots: SlotResult[];
  withOperators: boolean;
}>();
const emit = defineEmits<{ rerollSlot: [index: number] }>();

function slotLabel(slot: SlotResult['slot']): string {
  const classes = slot.classes.map((c) => CLASS_CN[c] ?? c).join('、');
  return slot.rarityCap !== null ? `${classes}（最高${slot.rarityCap}星）` : classes;
}
</script>

<template>
  <div class="card group-card">
    <div class="card-title"><span class="label">招募组合</span></div>
    <div class="group-name">{{ group.name }}</div>
    <div class="group-desc">{{ group.desc }}</div>
    <div class="slots">
      <div v-for="(s, i) in slots" :key="i" class="slot">
        <div class="slot-class">
          {{ slotLabel(s.slot) }}
          <button
            v-if="withOperators"
            class="reroll"
            title="重摇该券位"
            @click="emit('rerollSlot', i)"
          >↻</button>
        </div>
        <template v-if="withOperators">
          <div v-if="s.empty" class="slot-empty">池子已空，请放宽筛选</div>
          <div v-else-if="s.operator" class="slot-operator">
            {{ s.operator.name }}
            <span class="stars">{{ '★'.repeat(s.operator.rarity) }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: 替换 `src/App.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';
import rawData from './data/rogue-data.json';
import RecruitSlots from './components/RecruitSlots.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import SquadCard from './components/SquadCard.vue';
import { validateGameData } from './lib/data';
import { rerollSlot, rerollSquad, rollStart } from './lib/roll';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './lib/settings';
import type { GameData, RollResult, RollSettings } from './lib/types';

let data: GameData | null = null;
const loadError = ref('');
try {
  data = validateGameData(rawData);
} catch (e) {
  loadError.value = (e as Error).message;
}

const theme = data?.themes[0] ?? null;
const operators = data?.operators ?? [];

const settings = ref<RollSettings>({ ...DEFAULT_SETTINGS });
const pruneNotice = ref('');
if (data) {
  const loaded = loadSettings(window.localStorage, new Set(operators.map((o) => o.id)));
  settings.value = loaded.settings;
  if (loaded.pruned > 0) {
    pruneNotice.value = `已自动移除 ${loaded.pruned} 个数据中不存在的干员`;
  }
}
watch(settings, (s) => saveSettings(window.localStorage, s), { deep: true });

const result = ref<RollResult | null>(null);

function roll() {
  if (!theme) return;
  result.value = rollStart(theme, operators, settings.value);
}

function onRerollSquad() {
  if (!theme || !result.value) return;
  result.value = { ...result.value, squad: rerollSquad(theme) };
}

function onRerollSlot(index: number) {
  if (!result.value) return;
  const slots = result.value.slots.slice();
  slots[index] = rerollSlot(slots[index].slot, operators, settings.value);
  result.value = { ...result.value, slots };
}
</script>

<template>
  <h1>黑流树海开局随机器</h1>

  <div v-if="loadError" class="error">{{ loadError }}</div>

  <template v-else-if="theme">
    <SettingsPanel v-model="settings" :operators="operators" />
    <p v-if="pruneNotice" class="notice">{{ pruneNotice }}</p>
    <button class="roll-button" @click="roll">🎲 开始随机</button>
    <template v-if="result">
      <SquadCard :squad="result.squad" @reroll="onRerollSquad" />
      <RecruitSlots
        :group="result.group"
        :slots="result.slots"
        :with-operators="settings.withOperators"
        @reroll-slot="onRerollSlot"
      />
    </template>
  </template>
</template>
```

- [ ] **Step 5: 追加样式到 `src/style.css`**

```css
h1 {
  font-size: 22px;
  text-align: center;
}

.settings {
  margin-bottom: 12px;
}

.settings-toggle {
  width: 100%;
  padding: 8px;
  background: #23262e;
  color: inherit;
  border: 1px solid #3a3f4b;
  border-radius: 6px;
  cursor: pointer;
}

.settings-body {
  border: 1px solid #3a3f4b;
  border-top: none;
  border-radius: 0 0 6px 6px;
  padding: 12px;
}

.row {
  margin-bottom: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.exclude-box input {
  width: 100%;
  padding: 6px;
  background: #1c1f26;
  color: inherit;
  border: 1px solid #3a3f4b;
  border-radius: 4px;
}

.search-results {
  list-style: none;
  margin: 6px 0;
  padding: 0;
}

.search-results button {
  background: none;
  border: none;
  color: #7ec8ff;
  cursor: pointer;
  padding: 4px;
}

.excluded-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #3a2a2a;
  border-radius: 4px;
  padding: 2px 8px;
  margin: 2px;
}

.excluded-tag button {
  background: none;
  border: none;
  color: #ff8a8a;
  cursor: pointer;
}

.roll-button {
  width: 100%;
  padding: 16px;
  font-size: 18px;
  background: #c9a959;
  color: #16181d;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin: 8px 0 16px;
  font-weight: bold;
}

.card {
  background: #23262e;
  border: 1px solid #3a3f4b;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 12px;
  color: #9aa0ad;
  letter-spacing: 2px;
}

.squad-name,
.group-name {
  font-size: 20px;
  font-weight: bold;
  margin: 6px 0;
}

.squad-desc,
.group-desc {
  color: #b8bcc7;
  font-size: 14px;
}

.unlock {
  margin-top: 8px;
  font-size: 12px;
  color: #d8a04a;
}

.slots {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.slot {
  flex: 1;
  background: #1c1f26;
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}

.slot-class {
  font-size: 13px;
  color: #9aa0ad;
}

.slot-operator {
  margin-top: 8px;
  font-size: 16px;
  font-weight: bold;
}

.stars {
  color: #c9a959;
  font-size: 12px;
}

.slot-empty {
  margin-top: 8px;
  color: #ff8a8a;
  font-size: 13px;
}

.reroll {
  background: none;
  border: 1px solid #3a3f4b;
  color: #7ec8ff;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px 8px;
}

.error {
  background: #4a2a2a;
  border: 1px solid #8a4a4a;
  border-radius: 8px;
  padding: 16px;
}

.notice {
  color: #d8a04a;
  font-size: 13px;
}
```

- [ ] **Step 6: 验证类型检查、测试与构建全部通过**

Run: `npm run typecheck && npm test && npm run build`
Expected: 全部成功（测试 27 个用例全过）

- [ ] **Step 7: 手动冒烟验证**

Run: `npm run dev`，浏览器打开终端里提示的地址，验证：
1. 点「开始随机」→ 出现分队卡 + 招募组合 + 每个券位一个干员
2. 展开设置关掉「随机具体干员」→ 再随机 → 券位只显示职业
3. 排除某个干员后再随机 → 不再出现该干员
4. 分队和券位的 ↻ 按钮各自单独重摇
5. 刷新页面 → 设置保留

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: 页面组件与交互（单栏布局 + 重摇 + 设置持久化）"
```

---

### Task 8: README 与收尾

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建 `README.md`**

````markdown
# 黑流树海开局随机器

明日方舟集成战略「沉沦者的黑流树海」开局随机器：随机开局分队和招募组合，可选随机每个券位的具体干员。

## 使用

```bash
npm install
npm run dev        # 开发预览
npm run build      # 构建静态产物到 dist/
```

## 更新游戏数据

数据已打包在 `src/data/rogue-data.json`。游戏版本更新后重新生成：

```bash
git clone --depth 1 https://github.com/yuanyan3060/ArknightsGameResource.git
npm run extract -- <ArknightsGameResource 仓库路径>
```

## 测试

```bash
npm test
```
````

- [ ] **Step 2: 最终全量验证**

Run: `npm run typecheck && npm test && npm run build`
Expected: 全部成功

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README 使用与数据更新说明"
```
````