import { ref, shallowRef } from 'vue';
import { describe, expect, it } from 'vitest';
import rawData from '../src/data/rogue-data.json';
import { validateGameData } from '../src/lib/data';
import { createDefaultSettings } from '../src/lib/settings';
import type { Operator, RollResult, Theme } from '../src/lib/types';
import { useCandidateStart } from '../src/composables/useCandidateStart';
import { useStartConfirmation } from '../src/composables/useStartConfirmation';

const data = validateGameData(rawData);
const six = data.operators.filter((operator) => operator.rarity === 6);
const five = data.operators.find((operator) => operator.rarity === 5)!;
const four = data.operators.find((operator) => operator.rarity === 4)!;

function resultFor(operators: (Operator | null)[]): RollResult {
  const squad = data.themes[0].squads[0];
  const group = data.themes[0].recruitGroups[0];
  return { squad, group, initialHope: 6, slots: operators.map((operator, index) => ({
    slot: group.slots[index], operator, empty: !operator, hopeCost: operator?.hopeCost ?? 0,
  })) };
}
function setup() {
  const theme = ref<Theme | null>(data.themes[0]);
  const settings = ref(createDefaultSettings(data.operators));
  const candidates = useCandidateStart(theme, data.operators, settings, () => 0.31);
  const quickResult = shallowRef<RollResult | null>(null);
  const confirmation = useStartConfirmation(theme, candidates, quickResult);
  return { theme, settings, candidates, quickResult, ...confirmation };
}
function chooseCandidate(app: ReturnType<typeof setup>) {
  for (const profession of ['WARRIOR', 'CASTER', 'MEDIC']) app.candidates.addProfession(profession);
  app.candidates.rollCandidates();
  const chosen = app.candidates.draw.value!.candidates[0];
  app.candidates.selectCandidate(chosen.id);
  return chosen;
}

describe('开局确认与已招募名单', () => {
  it('为局内抽取保存所有开局干员；重复确认同一结果保留会话身份', () => {
    const app = setup();
    app.quickResult.value = resultFor([six[0], five, four]);
    app.confirmQuick();
    const start = app.confirmedStart.value;
    expect(start?.operators).toEqual([six[0], five, four]);
    app.confirmQuick();
    expect(app.confirmedStart.value).toBe(start);
    chooseCandidate(app);
    app.confirmCandidate();
    const candidateStart = app.confirmedStart.value;
    app.candidates.backToCandidates();
    app.confirmCandidate();
    expect(app.confirmedStart.value).toBe(candidateStart);
  });

  it('抽取和选择候选不会登记，确认后登记六星并自动折叠', () => {
    const app = setup();
    expect(app.confirmCandidate()).toBe(false);
    const chosen = chooseCandidate(app);
    expect(app.recruited.value).toEqual([]);
    expect(app.collapsed.value).toBe(false);
    expect(app.confirmCandidate()).toBe(true);
    expect(app.recruited.value).toEqual([chosen]);
    expect(app.candidates.confirmed.value).toBe(true);
    expect(app.candidateRegistered.value).toBe(true);
    expect(app.collapsed.value).toBe(true);
  });

  it('全随机确认只登记六星并去重，重复确认不累加', () => {
    const app = setup();
    app.quickResult.value = resultFor([six[0], five, six[0]]);
    expect(app.recruited.value).toEqual([]);
    expect(app.confirmQuick()).toBe(true);
    expect(app.recruited.value).toEqual([six[0]]);
    expect(app.quickRegistered.value).toBe(true);
    expect(app.collapsed.value).toBe(true);
    app.confirmQuick();
    expect(app.recruited.value).toEqual([six[0]]);
    app.quickResult.value = resultFor([six[1], six[2], four]);
    expect(app.quickRegistered.value).toBe(false);
    expect(app.recruited.value).toEqual([six[0]]);
    app.confirmQuick();
    expect(app.recruited.value).toEqual([six[1], six[2]]);
  });

  it('更换模式或修改草稿保留已招募快照，重新确认更新为新的开局', () => {
    const app = setup();
    const first = chooseCandidate(app);
    app.confirmCandidate();
    app.toggleCollapsed();
    app.candidates.backToCandidates();
    const second = app.candidates.draw.value!.candidates[1];
    app.candidates.selectCandidate(second.id);
    expect(app.candidateRegistered.value).toBe(false);
    expect(app.recruited.value).toEqual([first]);
    app.confirmCandidate();
    expect(app.recruited.value).toEqual([second]);
    app.quickResult.value = resultFor([six[0], five, four]);
    app.confirmQuick();
    expect(app.candidateRegistered.value).toBe(false);
    expect(app.recruited.value).toEqual([six[0]]);
    app.confirmCandidate();
    expect(app.quickRegistered.value).toBe(false);
    expect(app.recruited.value).toEqual([second]);
  });

  it('无结果或券位不完整时不能确认；完整的低星开局可确认但名单为空', () => {
    const app = setup();
    expect(app.canConfirmQuick.value).toBe(false);
    expect(app.confirmQuick()).toBe(false);
    app.quickResult.value = resultFor([six[0], five, null]);
    expect(app.canConfirmQuick.value).toBe(false);
    expect(app.confirmQuick()).toBe(false);
    expect(app.hasConfirmed.value).toBe(false);
    expect(app.collapsed.value).toBe(false);
    app.quickResult.value = resultFor([five, four, four]);
    expect(app.confirmQuick()).toBe(true);
    expect(app.hasConfirmed.value).toBe(true);
    expect(app.recruited.value).toEqual([]);
    expect(app.collapsed.value).toBe(true);
  });

  it('手动折叠不丢失草稿或名单，范围变化不影响确认已抽出的干员', () => {
    const app = setup();
    const chosen = chooseCandidate(app);
    const draw = app.candidates.draw.value;
    app.toggleCollapsed();
    app.toggleCollapsed();
    expect(app.candidates.draw.value).toBe(draw);
    expect(app.candidates.chosen.value).toBe(chosen);
    app.settings.value.pool[6] = [];
    expect(app.confirmCandidate()).toBe(true);
    app.toggleCollapsed();
    expect(app.collapsed.value).toBe(false);
    expect(app.recruited.value).toEqual([chosen]);
  });

  it('不可用主题不展示名单也不能确认，返回原主题恢复名单和折叠状态', () => {
    const app = setup();
    const chosen = chooseCandidate(app);
    app.confirmCandidate();
    app.theme.value = null;
    expect(app.recruited.value).toEqual([]);
    expect(app.collapsed.value).toBe(false);
    app.quickResult.value = resultFor([six[0], five, four]);
    expect(app.confirmQuick()).toBe(false);
    expect(app.confirmCandidate()).toBe(false);
    app.toggleCollapsed();
    app.theme.value = data.themes[0];
    expect(app.recruited.value).toEqual([chosen]);
    expect(app.collapsed.value).toBe(true);
  });
});
