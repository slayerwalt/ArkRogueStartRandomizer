import { effectScope, ref, watch, type EffectScope } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import { useCandidateStart } from '../src/composables/useCandidateStart';
import { useInRunRecruitment } from '../src/composables/useInRunRecruitment';
import { useRandomizer } from '../src/composables/useRandomizer';
import { useStartConfirmation } from '../src/composables/useStartConfirmation';
import type { Operator, RollSettings, Theme } from '../src/lib/types';

const operator = (id: string, rarity = 6, profession = 'CASTER'): Operator => ({
  id, name: id, rarity, profession, subProfession: '', hopeCost: rarity === 6 ? 6 : rarity === 5 ? 3 : rarity === 4 ? 2 : 0, charDiscount: 0,
});
const operators = [operator('a'), operator('b'), operator('c'), operator('d'), operator('outside'),
  operator('warrior', 6, 'WARRIOR'), operator('five', 5), operator('four', 4), operator('three', 3)];
const themeData: Theme = {
  id: 'test', name: '测试肉鸽',
  squads: ['s1', 's2'].map((id) => ({ id, name: id, desc: '', unlockCond: null, initialHopeBonus: 0,
    recruitDiscount: { professions: ['CASTER'], subProfessions: null, minRarity: 6, delta: -6 } })),
  recruitGroups: ['g1', 'g2'].map((id) => ({ id, name: id, desc: '',
    slots: Array.from({ length: 3 }, () => ({ classes: ['CASTER'], rarityCap: null })) })),
};
const scopes: EffectScope[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));
function setup() {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(() => {
    const theme = ref<Theme | null>(themeData);
    const settings = ref<RollSettings>({ pool: { 6: ['a', 'b', 'c', 'd', 'warrior'], 5: ['five'], 4: ['four'] } });
    const roster = useInRunRecruitment(theme, operators, settings, () => 0);
    const candidates = useCandidateStart(theme, operators, settings, () => 0, roster.sixStars);
    const quick = useRandomizer(theme, operators, settings, () => 0, roster.sixStars);
    const confirmation = useStartConfirmation(theme, candidates, quick.result, roster.sixStars);
    watch(confirmation.confirmedStart, (start) => { if (start) roster.applyStart(start); }, { flush: 'sync' });
    for (let i = 0; i < 3; i++) candidates.fillProfession('CASTER');
    return { theme, settings, roster, candidates, quick, confirmation };
  })!;
}

describe('已选六星与所有随机入口', () => {
  it('开局前可手动添加范围外六星，拒绝重复、非六星和无效身份', () => {
    const { roster, settings } = setup();
    expect(roster.active.value).toBe(true);
    expect(roster.addSelected('outside')).toBe(true);
    expect(roster.sixStars.value.map((item) => item.id)).toEqual(['outside']);
    expect(settings.value.pool[6]).not.toContain('outside');
    for (const id of ['outside', 'five', 'four', 'missing']) expect(roster.addSelected(id)).toBe(false);
    expect(roster.selectedOptions().every((item) => item.rarity === 6 && item.id !== 'outside')).toBe(true);
    roster.removeSelected('outside');
    expect(roster.sixStars.value).toEqual([]);
    expect(roster.undoRemoval()).toBe(true);
    expect(roster.sixStars.value.map((item) => item.id)).toEqual(['outside']);
  });

  it('候选开局、局内和全随机的全部重抽入口都同时遵守范围及已选排除', () => {
    const app = setup();
    app.roster.addSelected('a');
    app.candidates.rollCandidates();
    expect(app.candidates.candidates.value.map((item) => item.id)).toEqual(['b', 'c', 'd']);
    expect(app.candidates.shortages.value).toEqual([{ profession: 'CASTER', requested: 9, actual: 3 }]);
    app.candidates.selectCandidate('b');
    expect(app.confirmation.confirmCandidate()).toBe(true);
    expect(app.confirmation.candidateRegistered.value).toBe(true);
    expect(app.candidates.chosen.value?.id).toBe('b');
    expect(app.roster.sixStars.value.map((item) => item.id)).toEqual(['a', 'b']);
    app.roster.countSettings.updateCounts({ six: 5, five: 1 });
    app.roster.drawTicket('single-CASTER');
    expect(app.roster.candidates.value.map((item) => item.id)).toEqual(['c', 'd', 'five']);

    const actions = [() => app.quick.roll(), () => app.quick.rollSlot(0),
      () => app.quick.selectSquad('s2'), () => app.quick.selectGroup('g2'),
      () => app.quick.rollSquad(), () => app.quick.rollGroup(), () => app.quick.roll()];
    for (const action of actions) {
      action();
      const result = app.quick.result.value!;
      const drawn = result.slots.flatMap((slot) => slot.operator ? [slot.operator] : []);
      expect(drawn.every((item) => !['a', 'b', 'outside'].includes(item.id))).toBe(true);
      expect(drawn.every((item) => item.rarity <= 3 || app.settings.value.pool[item.rarity].includes(item.id))).toBe(true);
      const six = drawn.filter((item) => item.rarity === 6);
      expect(new Set(six.map((item) => item.id)).size).toBe(six.length);
      expect(app.quick.usedHope.value).toBeLessThanOrEqual(result.initialHope);
    }
  });

  it('手动添加已抽出的候选后立即不可再次确认，全随机冲突须重抽后确认', () => {
    const app = setup();
    app.candidates.rollCandidates();
    app.candidates.selectCandidate('a');
    app.roster.addSelected('a');
    expect(app.candidates.chosen.value).toBeNull();
    expect(app.candidates.candidates.value.some((item) => item.id === 'a')).toBe(false);
    expect(app.confirmation.confirmCandidate()).toBe(false);

    app.quick.roll();
    const original = app.quick.result.value!;
    const target = original.slots[0].operator!;
    app.roster.addSelected(target.id);
    expect(app.quick.result.value).toBe(original);
    expect(app.confirmation.quickConflict.value).toContain(target.name);
    expect(app.confirmation.confirmQuick()).toBe(false);
    app.quick.rollSlot(0);
    expect(app.confirmation.quickConflict.value).toBe('');
    expect(app.confirmation.confirmQuick()).toBe(true);
    const selected = app.roster.sixStars.value;
    expect(app.confirmation.confirmQuick()).toBe(true);
    expect(app.roster.sixStars.value).toBe(selected);
  });

  it('应急助力六星进入同一展板，移除和撤销同步影响三种随机', () => {
    const app = setup();
    app.quick.roll();
    app.confirmation.confirmQuick();
    app.roster.register('outside', 'emergency');
    app.settings.value.pool[6].push('outside');
    expect(app.roster.sixStars.value.some((item) => item.id === 'outside')).toBe(true);
    expect(app.roster.addSelected('outside')).toBe(false);
    expect(app.candidates.available.value.some((item) => item.id === 'outside')).toBe(false);
    app.roster.removeSelected('outside');
    expect(app.roster.emergency.value).toEqual([]);
    expect(app.candidates.available.value.some((item) => item.id === 'outside')).toBe(true);
    expect(app.roster.undoRemoval()).toBe(true);
    app.roster.drawTicket('any');
    app.candidates.rollCandidates();
    app.quick.roll();
    for (const list of [app.roster.candidates.value, app.candidates.candidates.value,
      app.quick.result.value!.slots.flatMap((slot) => slot.operator ? [slot.operator] : [])]) {
      expect(list.some((item) => item.id === 'outside')).toBe(false);
    }
  });

  it('已确认开局局部重抽时可保留其他已确认券位，不会重复登记六星', () => {
    const app = setup();
    app.quick.roll();
    expect(app.confirmation.confirmQuick()).toBe(true);
    const confirmed = app.quick.result.value!;
    const selected = [...app.roster.sixStars.value];
    app.quick.rollSlot(0);
    expect(app.quick.result.value!.slots[1]).toBe(confirmed.slots[1]);
    expect(app.quick.result.value!.slots[2]).toBe(confirmed.slots[2]);
    expect(app.confirmation.quickConflict.value).toBe('');
    expect(app.confirmation.confirmQuick()).toBe(true);
    expect(app.roster.sixStars.value).toEqual(expect.arrayContaining(selected));
    expect(new Set(app.roster.sixStars.value.map((item) => item.id)).size).toBe(app.roster.sixStars.value.length);
  });

  it('手动记录跨开局确认、草稿重置及主题往返保留，移除后按原范围恢复资格', () => {
    const app = setup();
    app.roster.addSelected('a');
    app.quick.roll();
    app.confirmation.confirmQuick();
    const before = [...app.roster.sixStars.value];
    app.quick.resetDraft();
    app.candidates.resetDraft();
    app.quick.roll();
    app.confirmation.confirmQuick();
    expect(app.roster.sixStars.value).toEqual(expect.arrayContaining(before));
    app.theme.value = null;
    expect(app.roster.sixStars.value).toEqual([]);
    expect(app.roster.addSelected('outside')).toBe(false);
    app.theme.value = themeData;
    expect(app.roster.sixStars.value).toEqual(expect.arrayContaining(before));
    app.roster.removeSelected('a');
    expect(app.candidates.available.value.map((item) => item.id)).toContain('a');
    expect(app.roster.undoRemoval()).toBe(true);
    expect(app.candidates.available.value.map((item) => item.id)).not.toContain('a');
    app.roster.addSelected('outside');
    app.roster.removeSelected('outside');
    expect(app.candidates.available.value.map((item) => item.id)).not.toContain('outside');
  });

  it('六星全部已选时显示空池，不从范围外补人，全随机仍按希望抽取可用低星', () => {
    const app = setup();
    app.roster.countSettings.updateCounts({ six: 2, five: 0 });
    const before = JSON.stringify(app.settings.value);
    for (const id of app.settings.value.pool[6]) app.roster.addSelected(id);
    expect(app.candidates.canDraw.value).toBe(false);
    expect(app.candidates.blockReason.value).toContain('均已选取');
    app.candidates.rollCandidates();
    expect(app.candidates.draw.value).toBeNull();
    app.quick.roll();
    expect(app.quick.result.value!.slots.every((slot) => !slot.operator || slot.operator.rarity < 6)).toBe(true);
    expect(app.confirmation.confirmQuick()).toBe(true);
    app.roster.drawTicket('any');
    expect(app.roster.candidates.value).toEqual([]);
    expect(JSON.stringify(app.settings.value)).toBe(before);
  });
});
