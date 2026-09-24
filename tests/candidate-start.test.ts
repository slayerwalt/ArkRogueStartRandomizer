import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { drawStartCandidates } from '../src/lib/candidate-start';
import { useCandidateStart } from '../src/composables/useCandidateStart';
import { useRandomizer } from '../src/composables/useRandomizer';
import rawData from '../src/data/rogue-data.json';
import { validateGameData } from '../src/lib/data';
import { createDefaultSettings } from '../src/lib/settings';
import type { Operator, RollSettings, Theme } from '../src/lib/types';

function operator(id: string, profession: string, rarity = 6): Operator {
  return { id, name: id, profession, rarity, subProfession: '', hopeCost: 6, charDiscount: 0 };
}
const operators = [
  ...Array.from({ length: 10 }, (_, i) => operator(`caster-${i}`, 'CASTER')),
  ...Array.from({ length: 2 }, (_, i) => operator(`medic-${i}`, 'MEDIC')),
  ...Array.from({ length: 5 }, (_, i) => operator(`warrior-${i}`, 'WARRIOR')),
  operator('five-star', 'CASTER', 5),
];
const settings: RollSettings = { pool: { 4: [], 5: ['five-star'], 6: operators.filter((o) => o.rarity === 6 && o.id !== 'caster-9').map((o) => o.id) } };
const data = validateGameData(rawData);

describe('六星起手候选', () => {
  it('重复职业位累加配额，同一轮不重复，且只抽范围内的六星', () => {
    const before = JSON.stringify({ operators, settings });
    const result = drawStartCandidates(operators, settings, ['CASTER', 'CASTER', 'CASTER'], () => 0.8);
    expect(result.candidates).toHaveLength(9);
    expect(new Set(result.candidates.map((o) => o.id)).size).toBe(9);
    expect(result.candidates.every((o) => o.rarity === 6 && o.profession === 'CASTER' && settings.pool[6].includes(o.id))).toBe(true);
    expect(result.shortages).toEqual([]);
    expect(JSON.stringify({ operators, settings })).toBe(before);
  });

  it('各职业保持配额，缺额不会借用其他职业或五星补齐', () => {
    const result = drawStartCandidates(operators, settings, ['CASTER', 'MEDIC', 'WARRIOR'], () => 0);
    expect(result.expectedCount).toBe(9);
    expect(result.candidates).toHaveLength(8);
    expect(result.shortages).toEqual([{ profession: 'MEDIC', requested: 3, actual: 2 }]);
    expect(result.candidates.filter((o) => o.profession === 'CASTER')).toHaveLength(3);
    expect(result.candidates.filter((o) => o.profession === 'WARRIOR')).toHaveLength(3);
  });

  it('使用传入随机源抽样，空池提供明确缺额', () => {
    const low = drawStartCandidates(operators, settings, ['CASTER'], () => 0);
    const high = drawStartCandidates(operators, settings, ['CASTER'], () => 0.99);
    expect(low.candidates[0].id).not.toBe(high.candidates[0].id);
    const empty = drawStartCandidates(operators, { pool: { 6: [] } }, ['MEDIC']);
    expect(empty.candidates).toEqual([]);
    expect(empty.shortages).toEqual([{ profession: 'MEDIC', requested: 3, actual: 0 }]);
  });
});

function setup() {
  const theme = ref<Theme | null>(data.themes[0]);
  const config = ref<RollSettings>({ pool: { 4: [], 5: [], 6: [...settings.pool[6]] } });
  return { theme, config, ...useCandidateStart(theme, operators, config, () => 0) };
}
function selectThree(app: ReturnType<typeof setup>) {
  for (const profession of ['CASTER', 'MEDIC', 'WARRIOR']) app.addProfession(profession);
}

describe('候选开局会话', () => {
  it('只要求六星范围，职业位未选满或选人非法时不能确认', () => {
    const app = setup();
    app.addProfession('invalid');
    app.addProfession('CASTER');
    app.rollCandidates();
    expect(app.draw.value).toBeNull();
    app.addProfession('MEDIC');
    app.addProfession('WARRIOR');
    app.addProfession('CASTER');
    expect(app.professions.value).toHaveLength(3);
    expect(app.canDraw.value).toBe(true);
    app.removeProfession(-1);
    app.removeProfession(0.5);
    expect(app.professions.value).toHaveLength(3);
    app.rollCandidates();
    app.selectCandidate('caster-9');
    app.confirmChoice();
    expect(app.confirmed.value).toBe(false);
    app.selectCandidate(app.draw.value!.candidates[0].id);
    app.confirmChoice();
    expect(app.confirmed.value).toBe(true);
  });

  it('调整范围不改变本轮候选，确认后可返回改选，重抽应用最新范围', () => {
    const app = setup();
    selectThree(app);
    app.rollCandidates();
    const draw = app.draw.value!;
    app.config.value.pool[6] = ['caster-8'];
    expect(app.draw.value).toBe(draw);
    app.selectCandidate(draw.candidates[0].id);
    app.confirmChoice();
    app.backToCandidates();
    expect(app.confirmed.value).toBe(false);
    expect(app.draw.value).toBe(draw);
    app.selectCandidate(draw.candidates[1].id);
    app.confirmChoice();
    expect(app.chosen.value!.id).toBe(draw.candidates[1].id);
    app.rollCandidates();
    expect(app.chosen.value).toBeNull();
    expect(app.confirmed.value).toBe(false);
    expect(app.draw.value!.candidates.map((o) => o.id)).toEqual(['caster-8']);
  });

  it('全空或所选职业无候选时阻止抽取，保留已有选择', () => {
    const app = setup();
    selectThree(app);
    app.rollCandidates();
    const before = app.draw.value!;
    app.config.value.pool[6] = [];
    expect(app.blockReason.value).toContain('六星');
    expect(app.canDraw.value).toBe(false);
    app.rollCandidates();
    expect(app.draw.value).toBe(before);
    app.selectCandidate(before.candidates[0].id);
    app.confirmChoice();
    expect(app.confirmed.value).toBe(true);
    app.editProfessions();
    app.clearProfessions();
    for (let i = 0; i < 3; i++) app.addProfession('MEDIC');
    app.config.value.pool[6] = ['caster-0'];
    expect(app.blockReason.value).toContain('所选职业');
    app.rollCandidates();
    expect(app.draw.value).toBeNull();
  });

  it('重抽分队保留候选与起手，重新选择职业保留分队但清空本轮', () => {
    const app = setup();
    selectThree(app);
    app.rollCandidates();
    const draw = app.draw.value!;
    app.selectCandidate(draw.candidates[0].id);
    app.confirmChoice();
    app.rollSquad();
    expect(app.draw.value).toBe(draw);
    expect(app.confirmed.value).toBe(true);
    const squad = app.squad.value;
    app.editProfessions();
    expect(app.professions.value).toEqual(['CASTER', 'MEDIC', 'WARRIOR']);
    expect(app.draw.value).toBeNull();
    expect(app.chosen.value).toBeNull();
    expect(app.confirmed.value).toBe(false);
    expect(app.squad.value).toBe(squad);
    app.removeProfession(1);
    expect(app.professions.value).toEqual(['CASTER', 'WARRIOR']);
  });

  it('主题不匹配时隐藏会话并阻止操作，返回原主题恢复候选', () => {
    const app = setup();
    selectThree(app);
    app.rollCandidates();
    const draw = app.draw.value;
    app.theme.value = null;
    expect(app.draw.value).toBeNull();
    app.rollCandidates();
    app.rollSquad();
    app.editProfessions();
    app.addProfession('CASTER');
    app.theme.value = { ...data.themes[0], id: 'other' };
    expect(app.draw.value).toBeNull();
    app.theme.value = data.themes[0];
    expect(app.draw.value).toBe(draw);
  });

  it('与一键随机独立，两种模式的操作不会覆盖对方的结果', () => {
    const theme = ref<Theme | null>(data.themes[0]);
    const config = ref(createDefaultSettings(data.operators));
    const candidates = useCandidateStart(theme, data.operators, config, () => 0.3);
    const quick = useRandomizer(theme, data.operators, config, () => 0.3);
    for (const profession of ['CASTER', 'MEDIC', 'WARRIOR']) candidates.addProfession(profession);
    candidates.rollCandidates();
    candidates.selectCandidate(candidates.draw.value!.candidates[0].id);
    candidates.confirmChoice();
    const draw = candidates.draw.value;
    quick.roll();
    quick.rollSquad();
    expect(candidates.draw.value).toBe(draw);
    expect(candidates.confirmed.value).toBe(true);
    const result = quick.result.value;
    candidates.rollCandidates();
    expect(quick.result.value).toBe(result);
  });
});
